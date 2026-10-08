-- Migration 00018: Schedule hourly retry for failed account deletions
-- Enables pg_cron and pg_net (if not already enabled)
-- Creates an hourly cron job that calls retry-account-deletions function
-- Reads project URL and service role key from Supabase Vault at runtime

-- Enable pg_cron extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing job if it exists (idempotent)
SELECT cron.unschedule('retry-account-deletions')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'retry-account-deletions'
);

-- Schedule hourly retry job
-- Runs at the top of every hour (0 * * * *)
-- Reads secrets from vault.decrypted_secrets at runtime
SELECT cron.schedule(
  'retry-account-deletions',
  '0 * * * *',
  $$
  DO $$
  DECLARE
    project_url text;
    service_role_key text;
    function_url text;
  BEGIN
    -- Read secrets from Vault
    SELECT decrypted_secret INTO project_url
    FROM vault.decrypted_secrets
    WHERE name = 'project_url';
    
    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';
    
    -- Fail gracefully if secrets are missing
    IF project_url IS NULL OR service_role_key IS NULL THEN
      RAISE WARNING 'Missing Vault secrets for retry-account-deletions cron job';
      RETURN;
    END IF;
    
    -- Build function URL
    function_url := project_url || '/functions/v1/retry-account-deletions';
    
    -- Call the function via pg_net
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      )
    );
  END $$;
  $$
);
