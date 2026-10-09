-- ============================================================
-- Compliance Review Migration
-- Adds privacy, reporting, rate limiting, and audit tables
-- ============================================================

-- ─── Add privacy and visibility columns ────────────────────

alter table public.profiles 
add column if not exists privacy_opt_out boolean not null default false;

alter table public.projects
add column if not exists is_public boolean not null default false;

-- ─── Reports table (user-submitted reports) ────────────────

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null check (target_type in ('design', 'message', 'contractor')),
  target_id text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create index if not exists idx_reports_user on public.reports(user_id, created_at desc);
create index if not exists idx_reports_target on public.reports(target_type, target_id);

-- ─── Consents table (AI processing consent tracking) ───────

create table if not exists public.consents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  kind text not null,
  version text not null,
  accepted_at timestamptz not null default now()
);

alter table public.consents enable row level security;

create policy "Users can insert own consents"
  on public.consents for insert
  with check (auth.uid() = user_id);

create policy "Users can view own consents"
  on public.consents for select
  using (auth.uid() = user_id);

create index if not exists idx_consents_user_kind on public.consents(user_id, kind, accepted_at desc);

-- ─── Usage events table (rate limiting) ────────────────────

create table if not exists public.usage_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;

create policy "Users can view own usage events"
  on public.usage_events for select
  using (auth.uid() = user_id);

create index if not exists idx_usage_events_user_action on public.usage_events(user_id, action, created_at desc);

-- ─── Outreach log table (contractor email tracking) ────────

create table if not exists public.outreach_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  contractor_id uuid references public.contractors(id) on delete set null,
  contractor_email text not null,
  fields_shared jsonb not null,
  sent_at timestamptz not null default now(),
  provider_message_id text
);

alter table public.outreach_log enable row level security;

create policy "Users can view own outreach logs"
  on public.outreach_log for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = outreach_log.project_id
      and projects.user_id = auth.uid()
    )
  );

create index if not exists idx_outreach_log_project on public.outreach_log(project_id, sent_at desc);
create index if not exists idx_outreach_log_contractor on public.outreach_log(contractor_id, sent_at desc);

-- ─── Contractor opt-outs table (unsubscribe tracking) ──────

create table if not exists public.contractor_optouts (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  opted_out_at timestamptz not null default now()
);

alter table public.contractor_optouts enable row level security;

-- No user access policies - this is managed by edge functions only

create index if not exists idx_contractor_optouts_email on public.contractor_optouts(email);
