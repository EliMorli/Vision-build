-- Migration 00018: Schedule hourly retry for failed account deletions
-- Enables pg_cron (if not already enabled)
-- Creates an hourly cron job that calls retry-account-deletions function
-- Reads project URL and service role key from Supabase Vault at runtime
--
-- NOTE: This migration creates the cron job structure, but it will only work
-- in production Supabase where pg_net and vault.decrypted_secrets are available.
-- The job will log a warning if these dependencies are missing.

-- Enable pg_cron extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension if available (Supabase-specific, not in standard PostgreSQL)
-- This will fail silently in test environments
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION
  WHEN undefined_file THEN
    RAISE NOTICE 'pg_net extension not available (expected in test environments)';
END $$;

-- Unschedule existing job if it exists (idempotent)
SELECT cron.unschedule('retry-account-deletions')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'retry-account-deletions'
);

-- Schedule hourly retry job
-- Runs at the top of every hour (0 * * * *)
-- Reads secrets from vault.decrypted_secrets at runtime
--
-- The job SQL must be a single-line string for cron.schedule, so we use
-- a slightly different format than a typical DO block
SELECT cron.schedule(
  'retry-account-deletions',
  '0 * * * *',
  $cron$
SELECT
CASE
  WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
       AND EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'vault')
  THEN
    net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/retry-account-deletions',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
        'Content-Type', 'application/json'
      )
    )::text
  ELSE
    'Skipped: pg_net or vault not available'::text
END;
$cron$
);
