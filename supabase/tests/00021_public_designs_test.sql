-- ============================================================
-- Public Designs RLS and RPC Tests
-- Test public design visibility and block filtering
-- ============================================================

begin;

-- Test setup: create test users and projects
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'charlie@test.com')
on conflict do nothing;

insert into public.profiles (id, email, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com', 'Alice'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com', 'Bob'),
  ('33333333-3333-3333-3333-333333333333', 'charlie@test.com', 'Charlie')
on conflict do nothing;

-- Alice has 1 public and 1 private project
insert into public.projects (id, user_id, title, original_image_url, is_public, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Alice Public', 'test.jpg', true, 'generated'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Alice Private', 'test.jpg', false, 'generated');

-- Bob has 1 public project
insert into public.projects (id, user_id, title, original_image_url, is_public, status) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Bob Public', 'test.jpg', true, 'generated');

-- Charlie has 1 public project
insert into public.projects (id, user_id, title, original_image_url, is_public, status) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Charlie Public', 'test.jpg', true, 'generated');

-- ─── Test 1: Bob can see Alice's public project but not her private one ───

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select plan(2);

select results_eq(
  $$ select id from public.projects where user_id = '11111111-1111-1111-1111-111111111111' and is_public = true $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) $$,
  'Bob can see Alice''s public project'
);

select is_empty(
  $$ select id from public.projects where user_id = '11111111-1111-1111-1111-111111111111' and is_public = false $$,
  'Bob cannot see Alice''s private project'
);

-- ─── Test 2: After Bob blocks Alice, fetch_public_designs excludes Alice's designs ───

insert into public.blocks (blocker_id, blocked_id, blocked_type) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'user');

select results_eq(
  $$ select count(*)::int from public.fetch_public_designs() where user_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values (0) $$,
  'fetch_public_designs excludes Alice after Bob blocks her'
);

-- ─── Test 3: Bob's own projects are excluded from fetch_public_designs ───

select is_empty(
  $$ select id from public.fetch_public_designs() where user_id = auth.uid() $$,
  'fetch_public_designs excludes Bob''s own projects'
);

-- ─── Test 4: Anon cannot insert reports or blocks ───

select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ insert into public.reports (user_id, target_type, target_id, reason) values ('11111111-1111-1111-1111-111111111111', 'design', 'test-id', 'spam') $$,
  'new row violates row-level security policy for table "reports"',
  'Anon cannot insert reports'
);

select throws_ok(
  $$ insert into public.blocks (blocker_id, blocked_id, blocked_type) values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'user') $$,
  'new row violates row-level security policy for table "blocks"',
  'Anon cannot insert blocks'
);

select * from finish();

rollback;
