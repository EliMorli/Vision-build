-- ============================================================
-- Pro Waitlist Table
-- Stores users waiting to be notified when contractors are available
-- ============================================================

create table public.pro_waitlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- One entry per user per project (including null project for general waitlist)
-- Use NULLS NOT DISTINCT to treat NULL project_id values as equal
create unique index idx_pro_waitlist_unique_user_project 
  on public.pro_waitlist(user_id, project_id) nulls not distinct;

alter table public.pro_waitlist enable row level security;

-- Users can manage their own waitlist entries
create policy "Users can view own waitlist entries"
  on public.pro_waitlist for select
  using (auth.uid() = user_id);

create policy "Users can insert own waitlist entries"
  on public.pro_waitlist for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own waitlist entries"
  on public.pro_waitlist for delete
  using (auth.uid() = user_id);

create index idx_pro_waitlist_user on public.pro_waitlist(user_id);
create index idx_pro_waitlist_project on public.pro_waitlist(project_id);
