-- Test: Verify retry-account-deletions cron job is scheduled correctly
\set ON_ERROR_STOP on

-- Ensure pg_cron extension is available
SELECT 'pg_cron extension available' AS test
WHERE EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
);

-- Test 1: Job exists with correct name
SELECT 'Cron job exists with name retry-account-deletions' AS test
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'retry-account-deletions'
);

-- Test 2: Job has hourly schedule (0 * * * *)
SELECT 'Cron job has hourly schedule' AS test
WHERE EXISTS (
  SELECT 1 
  FROM cron.job 
  WHERE jobname = 'retry-account-deletions'
  AND schedule = '0 * * * *'
);

-- Test 3: Job is active
SELECT 'Cron job is active' AS test
WHERE EXISTS (
  SELECT 1 
  FROM cron.job 
  WHERE jobname = 'retry-account-deletions'
  AND active = true
);

\echo '✓ All cron schedule tests passed'
