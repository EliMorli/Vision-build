-- Test: Verify retry-account-deletions cron job is scheduled correctly
\set ON_ERROR_STOP on

DO $$
BEGIN
  -- Test 1: pg_cron extension installed
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'FAIL: pg_cron extension not installed';
  END IF;
  RAISE NOTICE 'PASS: pg_cron extension installed';

  -- Test 2: pg_net extension installed
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'FAIL: pg_net extension not installed';
  END IF;
  RAISE NOTICE 'PASS: pg_net extension installed';

  -- Test 3: Job exists with name 'retry-account-deletions'
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-account-deletions') THEN
    RAISE EXCEPTION 'FAIL: Job retry-account-deletions not found';
  END IF;
  RAISE NOTICE 'PASS: Job retry-account-deletions exists';

  -- Test 4: Job has hourly schedule (0 * * * *)
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'retry-account-deletions' AND schedule = '0 * * * *'
  ) THEN
    RAISE EXCEPTION 'FAIL: Job does not have hourly schedule';
  END IF;
  RAISE NOTICE 'PASS: Job has hourly schedule (0 * * * *)';

  -- Test 5: Job is active
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'retry-account-deletions' AND active = true
  ) THEN
    RAISE EXCEPTION 'FAIL: Job is not active';
  END IF;
  RAISE NOTICE 'PASS: Job is active';
END $$;
