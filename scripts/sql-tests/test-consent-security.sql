-- Test suite for AI consent RLS security
-- Run with: psql -U postgres -d postgres -f scripts/sql-tests/test-consent-security.sql

\set ON_ERROR_STOP on

-- Setup: Create test user profiles
BEGIN;
SET LOCAL ROLE service_role;

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

  IF consent_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: User could not insert their own consent';
  END IF;

  RAISE NOTICE 'PASS: User can insert their own consent';
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
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- First insert a consent
INSERT INTO public.consents (user_id, kind, version)
VALUES ('00000000-0000-0000-0000-000000000001', 'ai_processing', '2026-10-07b');

DO $$
DECLARE
  consent_count INT;
BEGIN
  SELECT COUNT(*) INTO consent_count
  FROM public.consents
  WHERE user_id = '00000000-0000-0000-0000-000000000001';

  IF consent_count = 0 THEN
    RAISE EXCEPTION 'FAIL: User could not read their own consent';
  END IF;

  RAISE NOTICE 'PASS: User can read their own consents';
END;
$$;

ROLLBACK;

-- Test 4: User CANNOT read other user's consents
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- Insert consent for user 2 as service role
SET LOCAL ROLE service_role;
INSERT INTO public.consents (user_id, kind, version)
VALUES ('00000000-0000-0000-0000-000000000002', 'ai_processing', '2026-10-07b');

-- Switch back to user 1
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  consent_count INT;
BEGIN
  SELECT COUNT(*) INTO consent_count
  FROM public.consents
  WHERE user_id = '00000000-0000-0000-0000-000000000002';

  IF consent_count > 0 THEN
    RAISE EXCEPTION 'FAIL: User was able to read another user''s consent';
  END IF;

  RAISE NOTICE 'PASS: User cannot read other user''s consents';
END;
$$;

ROLLBACK;

\echo ''
\echo 'All consent security tests completed!'
