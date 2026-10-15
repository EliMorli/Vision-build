-- ============================================================
-- Admin moderation for public designs (App Review guideline 1.2)
--
-- Users can already report designs and block people (00013/00014).
-- This adds the admin side:
--   * admin role: public.admins table OR app_metadata.role = 'admin'
--     (app_metadata can only be set with the service role, never by users)
--   * report status (open / dismissed / actioned) and who resolved it
--   * admin RPCs: queue, hide design, dismiss reports, ban from publishing
--   * append-only audit log (moderation_log) readable by admins only
--   * auto-hide a design once it has N distinct reporters, pending review
--   * guard so owners cannot undo is_hidden / is_banned themselves
--   * best-effort notify hook for the notify-new-report edge function
-- ============================================================

-- ─── Admins ────────────────────────────────────────────────

create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No policies: only the service role (dashboard / SQL) manages admins.

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_claims jsonb;
begin
  if v_uid is null then
    return false;
  end if;

  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;

  if coalesce(v_claims -> 'app_metadata' ->> 'role', '') = 'admin' then
    return true;
  end if;

  return exists (select 1 from public.admins a where a.user_id = v_uid);
end;
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ─── Moderation settings ───────────────────────────────────

create table if not exists public.moderation_settings (
  id boolean primary key default true check (id),
  auto_hide_threshold int not null default 3 check (auto_hide_threshold >= 2),
  review_sla_hours int not null default 24 check (review_sla_hours between 1 and 24)
);

insert into public.moderation_settings (id) values (true) on conflict (id) do nothing;

alter table public.moderation_settings enable row level security;
-- No policies: read inside security definer functions only.

-- ─── Report status ─────────────────────────────────────────

alter table public.reports
  add column if not exists status text not null default 'open',
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  -- Optional free-text note from the reporter (shown to moderators, never with the reporter's identity)
  add column if not exists note text;

alter table public.reports drop constraint if exists reports_note_length;
alter table public.reports add constraint reports_note_length check (note is null or char_length(note) <= 200);

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check check (status in ('open', 'dismissed', 'actioned'));

create index if not exists idx_reports_open
  on public.reports(target_type, target_id) where status = 'open';

-- Reporters may only insert open, unresolved reports for themselves.
drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports for insert
  with check (
    auth.uid() = user_id
    and status = 'open'
    and resolved_at is null
    and resolved_by is null
  );

-- ─── Hidden / banned flags are admin-only ──────────────────
-- Owners can update their own projects and profiles (00001), which would
-- otherwise let them clear is_hidden or is_banned. Only the service role or a
-- moderation function (which sets vb.moderation = 'on') may change them.

create or replace function public.guard_moderation_flags()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_privileged boolean :=
    auth.role() = 'service_role'
    or current_user in ('postgres', 'supabase_admin', 'service_role')
    or coalesce(current_setting('vb.moderation', true), '') = 'on';
begin
  if v_privileged then
    return new;
  end if;

  if tg_table_name = 'projects' then
    if new.is_hidden is distinct from old.is_hidden then
      raise exception 'is_hidden can only be changed by moderation' using errcode = '42501';
    end if;
    -- Banned users cannot publish.
    if new.is_public and not coalesce(old.is_public, false) and exists (
      select 1 from public.profiles p where p.id = new.user_id and p.is_banned
    ) then
      raise exception 'publishing is disabled for this account' using errcode = '42501';
    end if;
  elsif tg_table_name = 'profiles' then
    if new.is_banned is distinct from old.is_banned then
      raise exception 'is_banned can only be changed by moderation' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists projects_guard_moderation on public.projects;
create trigger projects_guard_moderation
  before update on public.projects
  for each row execute function public.guard_moderation_flags();

drop trigger if exists profiles_guard_moderation on public.profiles;
create trigger profiles_guard_moderation
  before update on public.profiles
  for each row execute function public.guard_moderation_flags();

-- ─── Audit log ─────────────────────────────────────────────

alter table public.moderation_log drop constraint if exists moderation_log_action_check;
alter table public.moderation_log
  add constraint moderation_log_action_check
  check (action in ('hide_design', 'ban_user', 'dismiss_report', 'auto_hide_design', 'keep_hidden', 'restore_design'));

alter table public.moderation_log add column if not exists details jsonb not null default '{}'::jsonb;

drop policy if exists "Admins can read moderation log" on public.moderation_log;
create policy "Admins can read moderation log"
  on public.moderation_log for select
  to authenticated
  using (public.is_admin());

-- Append-only: nobody (not even the service role, via the trigger) edits or
-- deletes audit rows. Rows only disappear through FK "on delete set null".
create or replace function public.moderation_log_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'moderation_log is append-only' using errcode = '42501';
  end if;
  -- Allow only the FK cascade that nulls admin_id / report_id.
  if new.action is distinct from old.action
     or new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id
     or new.notes is distinct from old.notes
     or new.details is distinct from old.details
     or new.created_at is distinct from old.created_at
     or (new.admin_id is not null and new.admin_id is distinct from old.admin_id)
     or (new.report_id is not null and new.report_id is distinct from old.report_id) then
    raise exception 'moderation_log is append-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists moderation_log_append_only on public.moderation_log;
create trigger moderation_log_append_only
  before update or delete on public.moderation_log
  for each row execute function public.moderation_log_append_only();

-- ─── Auto-hide on N distinct reporters ─────────────────────

create or replace function public.auto_hide_reported_design()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_threshold int;
  v_reporters int;
  v_hidden boolean;
begin
  if new.target_type <> 'design' or new.status <> 'open' then
    return new;
  end if;

  begin
    v_project_id := new.target_id::uuid;
  exception when others then
    return new;
  end;

  select auto_hide_threshold into v_threshold from public.moderation_settings where id;
  v_threshold := coalesce(v_threshold, 3);

  select count(distinct r.user_id) into v_reporters
  from public.reports r
  where r.target_type = 'design' and r.target_id = new.target_id and r.status = 'open';

  if v_reporters < v_threshold then
    return new;
  end if;

  select p.is_hidden into v_hidden from public.projects p where p.id = v_project_id;
  if v_hidden is null or v_hidden then
    return new; -- unknown project or already hidden
  end if;

  perform set_config('vb.moderation', 'on', true);
  update public.projects set is_hidden = true where id = v_project_id;
  perform set_config('vb.moderation', '', true);

  insert into public.moderation_log (admin_id, action, target_type, target_id, report_id, notes, details)
  values (null, 'auto_hide_design', 'design', v_project_id, new.id,
          'Hidden automatically pending review',
          jsonb_build_object('reporters', v_reporters, 'threshold', v_threshold));

  return new;
end;
$$;

drop trigger if exists reports_auto_hide on public.reports;
create trigger reports_auto_hide
  after insert on public.reports
  for each row execute function public.auto_hide_reported_design();

-- ─── Notify admins (best effort, never blocks a report) ────
-- Calls the notify-new-report edge function through pg_net when it and the
-- vault secrets (project_url, service_role_key) exist. The function decides
-- whether to email (RESEND_API_KEY + ADMIN_EMAILS). Sends ids only, no PII.

create or replace function public.notify_new_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_service_role_key text;
begin
  begin
    if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
      return new;
    end if;

    select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url';
    select decrypted_secret into v_service_role_key from vault.decrypted_secrets where name = 'service_role_key';
    if v_project_url is null or v_service_role_key is null then
      return new;
    end if;

    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using v_project_url || '/functions/v1/notify-new-report',
            jsonb_build_object('reportId', new.id, 'targetType', new.target_type, 'targetId', new.target_id),
            jsonb_build_object('Authorization', 'Bearer ' || v_service_role_key,
                               'Content-Type', 'application/json');
  exception when others then
    -- Never fail the user's report because a notification could not be queued.
    raise warning 'notify_new_report skipped: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists reports_notify_admin on public.reports;
create trigger reports_notify_admin
  after insert on public.reports
  for each row execute function public.notify_new_report();

-- ─── Admin RPCs ────────────────────────────────────────────

create or replace function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

revoke all on function public.require_admin() from public, anon, authenticated;

-- One row per reported design with open reports.
create or replace function public.admin_report_queue()
returns table (
  target_type text,
  target_id text,
  project_id uuid,
  title text,
  selected_style text,
  thumbnail_path text,
  owner_id uuid,
  owner_name text,
  owner_banned boolean,
  owner_public_count bigint,
  is_hidden boolean,
  is_public boolean,
  reporter_count bigint,
  report_count bigint,
  reasons text[],
  oldest_report_at timestamptz,
  newest_report_at timestamptz,
  overdue boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sla int;
begin
  perform public.require_admin();
  select review_sla_hours into v_sla from public.moderation_settings where id;
  v_sla := coalesce(v_sla, 24);

  return query
  with open_reports as (
    select r.target_type, r.target_id, r.user_id, r.reason, r.created_at
    from public.reports r
    where r.status = 'open' and r.target_type = 'design'
  ),
  grouped as (
    select o.target_type, o.target_id,
           count(distinct o.user_id) as reporter_count,
           count(*) as report_count,
           array_agg(distinct o.reason order by o.reason) as reasons,
           min(o.created_at) as oldest_report_at,
           max(o.created_at) as newest_report_at
    from open_reports o
    group by o.target_type, o.target_id
  )
  select g.target_type, g.target_id, p.id, p.title, p.selected_style,
         p.selected_generation_url, p.user_id, prof.display_name,
         coalesce(prof.is_banned, false),
         (select count(*) from public.projects op where op.user_id = p.user_id and op.is_public),
         coalesce(p.is_hidden, false), coalesce(p.is_public, false),
         g.reporter_count, g.report_count, g.reasons,
         g.oldest_report_at, g.newest_report_at,
         g.oldest_report_at < now() - make_interval(hours => v_sla)
  from grouped g
  left join public.projects p on p.id::text = g.target_id
  left join public.profiles prof on prof.id = p.user_id
  order by (g.oldest_report_at < now() - make_interval(hours => v_sla)) desc,
           g.reporter_count desc, g.oldest_report_at asc;
end;
$$;

create or replace function public.admin_hide_design(p_project_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_was_public boolean;
begin
  select is_public into v_was_public from public.projects where id = p_project_id;
  if not found then
    raise exception 'design not found' using errcode = 'P0002';
  end if;

  perform set_config('vb.moderation', 'on', true);
  update public.projects set is_hidden = true, is_public = false where id = p_project_id;
  perform set_config('vb.moderation', '', true);

  update public.reports
     set status = 'actioned', resolved_at = now(), resolved_by = v_admin
   where target_type = 'design' and target_id = p_project_id::text and status = 'open';

  insert into public.moderation_log (admin_id, action, target_type, target_id, notes, details)
  values (v_admin, 'hide_design', 'design', p_project_id, left(p_notes, 500),
          jsonb_build_object('was_public', coalesce(v_was_public, false)));
end;
$$;

create or replace function public.admin_dismiss_reports(p_project_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_count int;
  v_was_auto_hidden boolean;
begin
  update public.reports
     set status = 'dismissed', resolved_at = now(), resolved_by = v_admin
   where target_type = 'design' and target_id = p_project_id::text and status = 'open';
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'no open reports for this design' using errcode = 'P0002';
  end if;

  -- If the design was only hidden automatically (pending review) and no admin
  -- ever hid it on purpose, dismissing the reports restores it.
  select exists (
    select 1 from public.moderation_log l
    where l.target_id = p_project_id and l.action = 'auto_hide_design'
  ) and not exists (
    select 1 from public.moderation_log l
    where l.target_id = p_project_id and l.action = 'hide_design'
  ) into v_was_auto_hidden;

  if v_was_auto_hidden then
    perform set_config('vb.moderation', 'on', true);
    update public.projects set is_hidden = false where id = p_project_id;
    perform set_config('vb.moderation', '', true);
  end if;

  insert into public.moderation_log (admin_id, action, target_type, target_id, notes, details)
  values (v_admin, 'dismiss_report', 'design', p_project_id, left(p_notes, 500),
          jsonb_build_object('reports', v_count, 'restored', v_was_auto_hidden));
end;
$$;

create or replace function public.admin_ban_user(p_user_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
begin
  if p_user_id = v_admin then
    raise exception 'admins cannot ban themselves' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  perform set_config('vb.moderation', 'on', true);
  update public.profiles set is_banned = true where id = p_user_id;
  update public.projects set is_public = false where user_id = p_user_id and is_public;
  perform set_config('vb.moderation', '', true);

  update public.reports r
     set status = 'actioned', resolved_at = now(), resolved_by = v_admin
   where r.status = 'open'
     and ((r.target_type = 'user' and r.target_id = p_user_id::text)
       or (r.target_type = 'design' and r.target_id in (
             select p.id::text from public.projects p where p.user_id = p_user_id)));

  insert into public.moderation_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'ban_user', 'user', p_user_id, left(p_notes, 500));
end;
$$;

-- Auto-hidden design reviewed and confirmed: keep it hidden, close the reports.
create or replace function public.admin_keep_hidden(p_project_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_count int;
begin
  if not exists (select 1 from public.projects where id = p_project_id and is_hidden) then
    raise exception 'design is not hidden' using errcode = 'P0002';
  end if;

  update public.reports
     set status = 'actioned', resolved_at = now(), resolved_by = v_admin
   where target_type = 'design' and target_id = p_project_id::text and status = 'open';
  get diagnostics v_count = row_count;

  insert into public.moderation_log (admin_id, action, target_type, target_id, notes, details)
  values (v_admin, 'keep_hidden', 'design', p_project_id, left(p_notes, 500),
          jsonb_build_object('reports', v_count));
end;
$$;

-- Unhide a design and dismiss its open reports. Used for "Restore" on
-- auto-hidden cards and for "Undo" right after Hide (p_reopen = true puts the
-- reports that Hide resolved back in the queue). Republishes only if the
-- design was public before the last Hide and the owner is not banned.
create or replace function public.admin_restore_design(
  p_project_id uuid, p_reopen boolean default false, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_owner uuid;
  v_last_hide record;
  v_republish boolean := false;
  v_count int := 0;
begin
  select user_id into v_owner from public.projects where id = p_project_id;
  if not found then
    raise exception 'design not found' using errcode = 'P0002';
  end if;

  select l.created_at, l.details into v_last_hide
    from public.moderation_log l
   where l.target_id = p_project_id and l.action = 'hide_design'
   order by l.created_at desc limit 1;

  if v_last_hide.created_at is not null then
    v_republish := coalesce((v_last_hide.details ->> 'was_public')::boolean, false)
      and not exists (select 1 from public.profiles where id = v_owner and is_banned);
  end if;

  perform set_config('vb.moderation', 'on', true);
  update public.projects
     set is_hidden = false,
         is_public = case when v_republish then true else is_public end
   where id = p_project_id;
  perform set_config('vb.moderation', '', true);

  if p_reopen and v_last_hide.created_at is not null then
    update public.reports
       set status = 'open', resolved_at = null, resolved_by = null
     where target_type = 'design' and target_id = p_project_id::text
       and status = 'actioned' and resolved_at = v_last_hide.created_at;
    get diagnostics v_count = row_count;
  else
    update public.reports
       set status = 'dismissed', resolved_at = now(), resolved_by = v_admin
     where target_type = 'design' and target_id = p_project_id::text and status = 'open';
    get diagnostics v_count = row_count;
  end if;

  insert into public.moderation_log (admin_id, action, target_type, target_id, notes, details)
  values (v_admin, 'restore_design', 'design', p_project_id, left(p_notes, 500),
          jsonb_build_object('undo', p_reopen, 'reports', v_count, 'republished', v_republish));
end;
$$;

-- Reasons and notes for one design's open reports. Never returns who reported.
create or replace function public.admin_report_details(p_project_id uuid)
returns table (reason text, note text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select r.reason, r.note, r.created_at
    from public.reports r
   where r.target_type = 'design' and r.target_id = p_project_id::text and r.status = 'open'
   order by r.created_at desc;
end;
$$;

revoke all on function public.admin_report_queue() from public, anon;
revoke all on function public.admin_hide_design(uuid, text) from public, anon;
revoke all on function public.admin_dismiss_reports(uuid, text) from public, anon;
revoke all on function public.admin_ban_user(uuid, text) from public, anon;
grant execute on function public.admin_report_queue() to authenticated;
grant execute on function public.admin_hide_design(uuid, text) to authenticated;
grant execute on function public.admin_dismiss_reports(uuid, text) to authenticated;
grant execute on function public.admin_ban_user(uuid, text) to authenticated;
revoke all on function public.admin_keep_hidden(uuid, text) from public, anon;
revoke all on function public.admin_restore_design(uuid, boolean, text) from public, anon;
revoke all on function public.admin_report_details(uuid) from public, anon;
grant execute on function public.admin_keep_hidden(uuid, text) to authenticated;
grant execute on function public.admin_restore_design(uuid, boolean, text) to authenticated;
grant execute on function public.admin_report_details(uuid) to authenticated;

revoke all on function public.auto_hide_reported_design() from public, anon, authenticated;
revoke all on function public.notify_new_report() from public, anon, authenticated;
revoke all on function public.guard_moderation_flags() from public, anon, authenticated;
