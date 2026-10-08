-- ============================================================
-- Public Designs RLS and RPC
-- RPC to fetch public designs excluding blocked users
-- No direct RLS - Explore must use the RPC only
-- ============================================================

-- ─── RPC Function: Fetch Public Designs Excluding Blocks ───

create or replace function public.fetch_public_designs()
returns table (
  id uuid,
  user_id uuid,
  title text,
  selected_style text,
  selected_generation_url text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select 
    p.id,
    p.user_id,
    p.title,
    p.selected_style,
    p.selected_generation_url,
    p.created_at
  from public.projects p
  left join public.profiles prof on prof.id = p.user_id
  where p.is_public = true
    and p.user_id != auth.uid()
    and (p.is_hidden is null or p.is_hidden = false)
    and (prof.is_banned is null or prof.is_banned = false)
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = auth.uid()
        and b.blocked_id = p.user_id
    )
  order by p.created_at desc
  limit 100;
$$;

-- Revoke from all, grant only to authenticated
revoke all on function public.fetch_public_designs() from public, anon, authenticated;
grant execute on function public.fetch_public_designs() to authenticated;
