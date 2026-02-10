-- ============================================================
-- VisionBuild Database Schema
-- Supabase (PostgreSQL) — mirrors the PRD Firestore structure
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Users (profiles) ──────────────────────────────────────

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  photo_url text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Projects ──────────────────────────────────────────────

create type project_status as enum (
  'draft', 'analyzed', 'generated', 'connected', 'completed'
);

create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null default '',
  original_image_url text not null,
  room_analysis jsonb,  -- { roomType, currentStyle, estimatedSqFt, keyElements[], rawAnalysis }
  selected_style text,
  generated_image_urls text[] default '{}',
  selected_generation_url text,
  status project_status not null default 'draft',
  lead_info jsonb,      -- { budgetRange, zipCode, projectBrief, matchedContractorIds[], submittedAt }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can CRUD own projects"
  on public.projects for all
  using (auth.uid() = user_id);

create index idx_projects_user on public.projects(user_id, updated_at desc);

-- ─── Contractors ───────────────────────────────────────────

create table public.contractors (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null default '',
  zip_code text not null,
  city text not null default '',
  state text not null default '',
  specialties text[] default '{}',
  rating numeric(2,1) not null default 0.0,
  completed_jobs int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.contractors enable row level security;

-- Authenticated users can read active contractors
create policy "Authenticated users can view active contractors"
  on public.contractors for select
  using (auth.role() = 'authenticated' and is_active = true);

create index idx_contractors_zip on public.contractors(zip_code) where is_active = true;

-- ─── Leads ─────────────────────────────────────────────────

create type lead_status as enum (
  'pending', 'sent', 'viewed', 'accepted', 'declined', 'completed'
);

create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contractor_id uuid references public.contractors(id) not null,
  email_subject text not null,
  email_body text not null,
  original_image_url text not null,
  generated_image_url text not null default '',
  budget_range text not null,
  zip_code text not null,
  scope_of_work text[] default '{}',
  status lead_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.leads enable row level security;

-- Users can read leads they created
create policy "Users can view own leads"
  on public.leads for select
  using (auth.uid() = user_id);

create index idx_leads_project on public.leads(project_id, created_at desc);

-- ─── Updated-at trigger ────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();
