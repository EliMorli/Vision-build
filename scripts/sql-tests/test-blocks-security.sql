-- Test suite for blocks, user_settings, and pro_waitlist security
-- Run with: psql -U postgres -d postgres -f scripts/sql-tests/test-blocks-security.sql

\set ON_ERROR_STOP on

-- Setup: Create two test users
BEGIN;

-- Create auth users first
INSERT INTO auth.users (id, email)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.com')
ON CONFLICT (id) DO NOTHING;

-- Create profiles
INSERT INTO public.profiles (id, email, display_name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.com', 'User A'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.com', 'User B')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================
-- BLOCKS TESTS
-- ============================================================

-- Test 1: Anon cannot read blocks
BEGIN;
SET LOCAL ROLE anon;

DO $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec FROM public.blocks LIMIT 1;
  RAISE EXCEPTION 'FAIL: Anon can read blocks';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anon cannot read blocks';
END;
$$;

ROLLBACK;

-- Test 2: User A creates a block, User B cannot read it
-- Insert as postgres (bypassing RLS for test setup)
INSERT INTO public.blocks (blocker_id, blocked_id, blocked_type)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'user');

-- Try to read as User B (should see nothing due to RLS)
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "22222222-2222-2222-2222-222222222222"}';

DO $$
DECLARE
  block_count int;
BEGIN
  SELECT count(*) INTO block_count FROM public.blocks WHERE blocker_id = '11111111-1111-1111-1111-111111111111';
  
  IF block_count > 0 THEN
    RAISE EXCEPTION 'FAIL: User B can read User A blocks (count: %)', block_count;
  ELSE
    RAISE NOTICE 'PASS: User B cannot read User A blocks';
  END IF;
END;
$$;

ROLLBACK;

-- Clean up the block
DELETE FROM public.blocks WHERE blocker_id = '11111111-1111-1111-1111-111111111111';

-- Test 3: Deleting blocker removes blocks
BEGIN;

-- Insert block as postgres
INSERT INTO public.blocks (blocker_id, blocked_id, blocked_type)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'user');

-- Delete blocker profile
DELETE FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111';

-- Check block is gone
DO $$
DECLARE
  block_count int;
BEGIN
  SELECT count(*) INTO block_count FROM public.blocks 
  WHERE blocker_id = '11111111-1111-1111-1111-111111111111';
  
  IF block_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Block still exists after blocker deleted';
  ELSE
    RAISE NOTICE 'PASS: Deleting blocker removes blocks';
  END IF;
END;
$$;

ROLLBACK;

-- Test 4: Deleting blocked user removes blocks
BEGIN;

-- Insert block as postgres
INSERT INTO public.blocks (blocker_id, blocked_id, blocked_type)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'user');

-- Delete blocked user
DELETE FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222';

-- Check block is gone
DO $$
DECLARE
  block_count int;
BEGIN
  SELECT count(*) INTO block_count FROM public.blocks 
  WHERE blocked_id = '22222222-2222-2222-2222-222222222222';
  
  IF block_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Block still exists after blocked user deleted';
  ELSE
    RAISE NOTICE 'PASS: Deleting blocked user removes blocks';
  END IF;
END;
$$;

ROLLBACK;

-- ============================================================
-- USER_SETTINGS TESTS
-- ============================================================

-- Test 5: Anon cannot read user_settings
BEGIN;
SET LOCAL ROLE anon;

DO $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec FROM public.user_settings LIMIT 1;
  RAISE EXCEPTION 'FAIL: Anon can read user_settings';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anon cannot read user_settings';
END;
$$;

ROLLBACK;

-- Test 6: User A creates settings, User B cannot read them
-- Insert as postgres (bypassing RLS for test setup)
INSERT INTO public.user_settings (user_id, push_notifications)
VALUES ('11111111-1111-1111-1111-111111111111', false);

-- Try to read as User B (should see nothing due to RLS)
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "22222222-2222-2222-2222-222222222222"}';

DO $$
DECLARE
  settings_count int;
BEGIN
  SELECT count(*) INTO settings_count FROM public.user_settings 
  WHERE user_id = '11111111-1111-1111-1111-111111111111';
  
  IF settings_count > 0 THEN
    RAISE EXCEPTION 'FAIL: User B can read User A settings (count: %)', settings_count;
  ELSE
    RAISE NOTICE 'PASS: User B cannot read User A settings';
  END IF;
END;
$$;

ROLLBACK;

-- Clean up the settings
DELETE FROM public.user_settings WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================
-- PRO_WAITLIST TESTS
-- ============================================================

-- Test 7: Anon cannot read pro_waitlist
BEGIN;
SET LOCAL ROLE anon;

DO $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec FROM public.pro_waitlist LIMIT 1;
  RAISE EXCEPTION 'FAIL: Anon can read pro_waitlist';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anon cannot read pro_waitlist';
END;
$$;

ROLLBACK;

-- Test 8: User A joins waitlist, User B cannot read it
-- Insert as postgres (bypassing RLS for test setup)
INSERT INTO public.pro_waitlist (user_id, email, project_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'user-a@test.com', NULL);

-- Try to read as User B (should see nothing due to RLS)
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "22222222-2222-2222-2222-222222222222"}';

DO $$
DECLARE
  waitlist_count int;
BEGIN
  SELECT count(*) INTO waitlist_count FROM public.pro_waitlist 
  WHERE user_id = '11111111-1111-1111-1111-111111111111';
  
  IF waitlist_count > 0 THEN
    RAISE EXCEPTION 'FAIL: User B can read User A waitlist (count: %)', waitlist_count;
  ELSE
    RAISE NOTICE 'PASS: User B cannot read User A waitlist';
  END IF;
END;
$$;

ROLLBACK;

-- Clean up the waitlist entry
DELETE FROM public.pro_waitlist WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================
-- CLEANUP
-- ============================================================

BEGIN;

DELETE FROM public.blocks WHERE blocker_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222') 
  OR blocked_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM public.user_settings WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM public.pro_waitlist WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM public.profiles WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

COMMIT;

DO $$ BEGIN RAISE NOTICE '✅ All security tests passed'; END; $$;
