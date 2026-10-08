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
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unschedule existing job if it exists (idempotent)
SELECT cron.unschedule('retry-account-deletions')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'retry-account-deletions'
);

-- Schedule hourly retry job
-- Runs at the top of every hour (0 * * * *)
-- Reads secrets from vault.decrypted_secrets at runtime
-- ERRORS if secrets are missing (shows as failed in cron.job_run_details)
SELECT cron.schedule(
  'retry-account-deletions',
  '0 * * * *',
  $$
SELECT extensions.http_post(
  url := (
    SELECT COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url'),
      (SELECT pg_catalog.current_setting('app.project_url', true))
    )
  ) || '/functions/v1/retry-account-deletions',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (
      SELECT COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
        (SELECT pg_catalog.current_setting('app.service_role_key', true))
      )
    ),
    'Content-Type', 'application/json'
  )
)::text;
$$
);
