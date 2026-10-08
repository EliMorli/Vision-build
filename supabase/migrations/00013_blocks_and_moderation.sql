-- ============================================================
-- Blocks and Moderation
-- User blocking and content moderation system
-- ============================================================

-- ─── Blocks Table ──────────────────────────────────────────

create table public.blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  blocked_type text not null check (blocked_type in ('user', 'contractor')),
  created_at timestamptz not null default now(),
  
  unique(blocker_id, blocked_id, blocked_type)
);

alter table public.blocks enable row level security;

-- Users can manage their own blocks
create policy "Users can view own blocks"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "Users can insert own blocks"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "Users can delete own blocks"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

create index idx_blocks_blocker on public.blocks(blocker_id);
create index idx_blocks_blocked on public.blocks(blocked_id, blocked_type);

-- ─── Moderation Columns ────────────────────────────────────

-- Add is_hidden to projects for hiding reported content
alter table public.projects add column if not exists is_hidden boolean not null default false;

-- Add is_banned to profiles for banning users
alter table public.profiles add column if not exists is_banned boolean not null default false;

-- ─── Admin Emails Config ───────────────────────────────────
-- Admin access is controlled by ADMIN_EMAILS environment variable
-- No database table needed; checked in edge functions and app code

-- ─── Moderation Log ────────────────────────────────────────

create table public.moderation_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('hide_design', 'ban_user', 'dismiss_report')),
  target_type text not null,
  target_id uuid not null,
  report_id uuid references public.reports(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.moderation_log enable row level security;

-- Only service role can access moderation log (admins use edge functions)
create policy "Service role can manage moderation log"
  on public.moderation_log for all
  using (auth.role() = 'service_role');
