-- ============================================================
-- Public Designs RLS and RPC
-- Allow authenticated users to view public designs from others
-- Add RPC to fetch public designs excluding blocked users
-- ============================================================

-- ─── RLS Policy for Reading Public Projects ────────────────

-- Authenticated users can read public projects from other users
create policy "Authenticated users can view public projects"
  on public.projects for select
  using (
    auth.role() = 'authenticated' 
    and is_public = true 
    and user_id != auth.uid()
  );

-- ─── RPC Function: Fetch Public Designs Excluding Blocks ───

create or replace function public.fetch_public_designs()
returns setof public.projects
language sql
security definer
stable
as $$
  select p.*
  from public.projects p
  where p.is_public = true
    and p.user_id != auth.uid()
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = auth.uid()
        and b.blocked_id = p.user_id
    )
  order by p.created_at desc
  limit 100;
$$;

-- Grant execute to authenticated users
grant execute on function public.fetch_public_designs to authenticated;
