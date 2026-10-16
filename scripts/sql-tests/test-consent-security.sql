-- Test suite for AI consent RLS security
-- Run with: psql -U postgres -d postgres -f scripts/sql-tests/test-consent-security.sql

\set ON_ERROR_STOP on

-- Setup: Create test users in auth.users first, then profiles
BEGIN;
SET LOCAL ROLE service_role;

-- Create auth users (minimal required fields for shim)
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'user1@example.com', 'unused', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'user2@example.com', 'unused', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create profiles
INSERT INTO public.profiles (id, email, display_name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'user1@example.com', 'User 1'),
  ('00000000-0000-0000-0000-000000000002', 'user2@example.com', 'User 2')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Test 1: User can insert their own consent
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  consent_id UUID;
BEGIN
  INSERT INTO public.consents (user_id, kind, version)
  VALUES ('00000000-0000-0000-0000-000000000001', 'ai_processing', '2026-10-07b')
  RETURNING id INTO consent_id;

  IF consent_id IS NOT NULL THEN
    RAISE NOTICE 'PASS: User can insert their own consent';
  ELSE
    RAISE EXCEPTION 'FAIL: User could not insert their own consent';
  END IF;
END;
$$;

ROLLBACK;

-- Test 2: User CANNOT insert consent for another user
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

DO $$
BEGIN
  INSERT INTO public.consents (user_id, kind, version)
  VALUES ('00000000-0000-0000-0000-000000000002', 'ai_processing', '2026-10-07b');

  RAISE EXCEPTION 'FAIL: User was able to insert consent for another user';
EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'PASS: User cannot insert consent for another user';
END;
$$;

ROLLBACK;

-- Test 3: User can read their own consents
BEGIN;

-- First insert a consent as service_role
SET LOCAL ROLE service_role;
INSERT INTO public.consents (user_id, kind, version)
VALUES ('00000000-0000-0000-0000-000000000001', 'ai_processing', '2026-10-07b');

-- Switch to user and try to read
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  consent_count INT;
BEGIN
  SELECT COUNT(*) INTO consent_count
  FROM public.consents
  WHERE user_id = '00000000-0000-0000-0000-000000000001';

  IF consent_count > 0 THEN
    RAISE NOTICE 'PASS: User can read their own consents';
  ELSE
    RAISE EXCEPTION 'FAIL: User could not read their own consent';
  END IF;
END;
$$;

ROLLBACK;

-- Test 4: User CANNOT read other user's consents
BEGIN;

-- Insert consent for user 2 as service role
SET LOCAL ROLE service_role;
INSERT INTO public.consents (user_id, kind, version)
VALUES ('00000000-0000-0000-0000-000000000002', 'ai_processing', '2026-10-07b');

-- Switch to user 1 and try to read user 2's consent
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  consent_count INT;
BEGIN
  SELECT COUNT(*) INTO consent_count
  FROM public.consents
  WHERE user_id = '00000000-0000-0000-0000-000000000002';

  IF consent_count = 0 THEN
    RAISE NOTICE 'PASS: User cannot read other user''s consents';
  ELSE
    RAISE EXCEPTION 'FAIL: User was able to read another user''s consent';
  END IF;
END;
$$;

ROLLBACK;

\echo ''
\echo 'All consent security tests completed!'
