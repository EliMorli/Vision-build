-- Migration 00018: Schedule hourly retry for failed account deletions
-- Enables pg_cron and pg_net extensions
-- Creates an hourly cron job that calls retry-account-deletions function
-- Reads project URL and service role key from Supabase Vault at runtime
--
-- Requirements:
-- - Vault secrets: project_url, service_role_key
-- - Job will ERROR (not silently skip) if secrets are missing

-- Enable pg_cron extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (idempotent)
-- Note: In CI or local testing, install postgresql-16-pgnet package
-- In production Supabase, pg_net is in the extensions schema
DO $$
BEGIN
  -- Try to create in extensions schema if it exists (production Supabase)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'extensions') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  ELSE
    -- Otherwise create in public schema (test environments)
    CREATE EXTENSION IF NOT EXISTS pg_net;
  END IF;
END $$;

-- Unschedule existing job if it exists (idempotent)
SELECT cron.unschedule('retry-account-deletions')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'retry-account-deletions'
);

-- Schedule hourly retry job
-- Runs at the top of every hour (0 * * * *)
-- Calls public.invoke_deletion_retry() which validates vault secrets and invokes edge function
-- Job will fail visibly in cron.job_run_details if secrets are missing
SELECT cron.schedule(
  'retry-account-deletions',
  '0 * * * *',
  'SELECT public.invoke_deletion_retry();'
);
