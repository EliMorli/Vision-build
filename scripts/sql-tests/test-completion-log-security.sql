-- Test deletion_completion_log RLS: service_role only
-- Ensures PII-free completion records are not accessible to users

\set ON_ERROR_STOP on

-- Test user ID
\set test_user_id '00000000-0000-0000-0000-000000000001'

-- Insert test completion record as service_role
INSERT INTO public.deletion_completion_log (user_id, completed_at, retry_attempts)
VALUES (:'test_user_id'::uuid, now(), 0);

-- Test 1: Anon SELECT blocked
BEGIN;
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM * FROM public.deletion_completion_log LIMIT 1;
  RAISE EXCEPTION 'FAIL: Anon was able to SELECT from deletion_completion_log';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anon SELECT blocked';
END $$;
COMMIT;

-- Test 2: Authenticated SELECT blocked
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
DO $$
BEGIN
  PERFORM * FROM public.deletion_completion_log LIMIT 1;
  RAISE EXCEPTION 'FAIL: Authenticated user was able to SELECT from deletion_completion_log';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Authenticated SELECT blocked';
END $$;
COMMIT;

-- Test 3: Service role SELECT allowed
DO $$
DECLARE
  rec_count int;
BEGIN
  SELECT COUNT(*) INTO rec_count FROM public.deletion_completion_log;
  IF rec_count > 0 THEN
    RAISE NOTICE 'PASS: Service role SELECT allowed (found % records)', rec_count;
  ELSE
    RAISE EXCEPTION 'FAIL: Service role could not read deletion_completion_log';
  END IF;
END $$;

-- Cleanup
DELETE FROM public.deletion_completion_log WHERE user_id = :'test_user_id'::uuid;
