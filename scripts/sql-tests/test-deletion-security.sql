-- Test suite for account deletion security
-- Run with: psql -U postgres -d postgres -f scripts/sql-tests/test-deletion-security.sql

\set ON_ERROR_STOP on

-- Test 1: Anon cannot INSERT into account_deletion_requests
BEGIN;
SET LOCAL ROLE anon;

DO $$
BEGIN
  INSERT INTO public.account_deletion_requests (email, token_hash)
  VALUES ('attacker@evil.com', 'fakehash123');
  
  RAISE EXCEPTION 'FAIL: Anon was able to INSERT into account_deletion_requests';
EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'PASS: Anon INSERT blocked';
END;
$$;

ROLLBACK;

-- Test 2: Anon cannot SELECT from account_deletion_requests
BEGIN;
SET LOCAL ROLE anon;

DO $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec FROM public.account_deletion_requests LIMIT 1;
  
  RAISE EXCEPTION 'FAIL: Anon was able to SELECT from account_deletion_requests';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anon SELECT blocked';
END;
$$;

ROLLBACK;

-- Test 3: Authenticated cannot INSERT into account_deletion_requests
BEGIN;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  INSERT INTO public.account_deletion_requests (email, token_hash)
  VALUES ('user@example.com', 'anotherfakehash');
  
  RAISE EXCEPTION 'FAIL: Authenticated was able to INSERT into account_deletion_requests';
EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'PASS: Authenticated INSERT blocked';
END;
$$;

ROLLBACK;

-- Test 4: Service role CAN insert (via edge functions)
BEGIN;
SET LOCAL ROLE service_role;

DO $$
BEGIN
  INSERT INTO public.account_deletion_requests (email, token_hash, status)
  VALUES ('test@example.com', 'validhash123', 'pending');

  RAISE NOTICE 'PASS: Service role INSERT allowed';
END;
$$;

ROLLBACK;

-- Test 5: auth.get_user_id_by_email is callable by service_role only
BEGIN;
SET LOCAL ROLE service_role;

DO $$
BEGIN
  PERFORM auth.get_user_id_by_email('test@example.com');
  
  RAISE NOTICE 'PASS: Service role can call get_user_id_by_email';
END;
$$;

ROLLBACK;

-- Test 6: Anon cannot call auth.get_user_id_by_email
BEGIN;
SET LOCAL ROLE anon;

DO $$
BEGIN
  PERFORM auth.get_user_id_by_email('test@example.com');
  
  RAISE EXCEPTION 'FAIL: Anon was able to call get_user_id_by_email';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anon call to get_user_id_by_email blocked';
END;
$$;

ROLLBACK;

\echo ''
\echo 'All deletion security tests completed!'
