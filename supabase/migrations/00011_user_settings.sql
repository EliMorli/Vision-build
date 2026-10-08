-- ============================================================
-- User Settings Table
-- Stores user preferences for notifications, privacy, and UX
-- ============================================================

create table public.user_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  
  -- Notification settings
  push_notifications boolean not null default false,
  marketing_emails boolean not null default false,
  
  -- Privacy settings
  public_projects_default boolean not null default false,
  
  -- Accessibility settings
  reduce_motion boolean not null default false,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

-- Users can only manage their own settings
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Auto-create settings row when user signs up
create or replace function public.handle_new_user_settings()
returns trigger
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql;

create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_settings();

-- Add trigger to update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute procedure public.update_updated_at_column();
