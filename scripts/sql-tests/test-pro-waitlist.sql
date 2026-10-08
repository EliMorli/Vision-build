-- Test suite for pro_waitlist table
-- Tests unique constraint with NULL project_id and RLS cross-user denial

\set ON_ERROR_STOP on

-- Setup: Create test users
BEGIN;

-- Create test user profiles
INSERT INTO auth.users (id, email)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, display_name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com', 'Alice'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com', 'Bob')
ON CONFLICT (id) DO NOTHING;

-- Create a test project for Alice
INSERT INTO public.projects (id, user_id, original_image_url, status)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'test/image.jpg', 'draft')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Test 1: User can join general waitlist (NULL project_id)
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
  INSERT INTO public.pro_waitlist (user_id, project_id, email)
  VALUES ('11111111-1111-1111-1111-111111111111', NULL, 'alice@test.com');
  
  RAISE NOTICE 'PASS: User can join general waitlist';
END;
$$;

COMMIT;

-- Test 2: User cannot join general waitlist twice (unique constraint on NULL)
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
  INSERT INTO public.pro_waitlist (user_id, project_id, email)
  VALUES ('11111111-1111-1111-1111-111111111111', NULL, 'alice@test.com');
  
  RAISE EXCEPTION 'FAIL: User was able to join general waitlist twice';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'PASS: Duplicate general waitlist entry blocked';
END;
$$;

ROLLBACK;

-- Test 3: User can join project-specific waitlist
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
  INSERT INTO public.pro_waitlist (user_id, project_id, email)
  VALUES ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice@test.com');
  
  RAISE NOTICE 'PASS: User can join project-specific waitlist';
END;
$$;

COMMIT;

-- Test 4: User cannot join same project waitlist twice
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
  INSERT INTO public.pro_waitlist (user_id, project_id, email)
  VALUES ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice@test.com');
  
  RAISE EXCEPTION 'FAIL: User was able to join project waitlist twice';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'PASS: Duplicate project waitlist entry blocked';
END;
$$;

ROLLBACK;

-- Test 5: RLS denies cross-user SELECT
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Bob tries to read Alice's waitlist entries
  SELECT * INTO rec FROM public.pro_waitlist 
  WHERE user_id = '11111111-1111-1111-1111-111111111111'
  LIMIT 1;
  
  IF FOUND THEN
    RAISE EXCEPTION 'FAIL: User can read other users waitlist entries';
  ELSE
    RAISE NOTICE 'PASS: RLS blocks cross-user SELECT';
  END IF;
END;
$$;

ROLLBACK;

-- Test 6: RLS denies cross-user INSERT
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '22222222-2222-2222-2222-222222222222';

DO $$
BEGIN
  -- Bob tries to insert for Alice
  INSERT INTO public.pro_waitlist (user_id, project_id, email)
  VALUES ('11111111-1111-1111-1111-111111111111', NULL, 'alice@test.com');
  
  RAISE EXCEPTION 'FAIL: User can insert waitlist entries for other users';
EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'PASS: RLS blocks cross-user INSERT';
END;
$$;

ROLLBACK;

-- Test 7: RLS denies cross-user DELETE
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Bob tries to delete Alice's waitlist entry
  DELETE FROM public.pro_waitlist 
  WHERE user_id = '11111111-1111-1111-1111-111111111111';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE EXCEPTION 'FAIL: User can delete other users waitlist entries';
  ELSE
    RAISE NOTICE 'PASS: RLS blocks cross-user DELETE';
  END IF;
END;
$$;

ROLLBACK;

-- Test 8: User can delete their own entries
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.pro_waitlist 
  WHERE user_id = '11111111-1111-1111-1111-111111111111';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'PASS: User can delete own waitlist entries (% deleted)', deleted_count;
  ELSE
    RAISE EXCEPTION 'FAIL: User cannot delete own waitlist entries';
  END IF;
END;
$$;

COMMIT;

\echo ''
\echo 'All pro_waitlist tests completed!'
