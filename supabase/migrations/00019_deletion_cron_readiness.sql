-- Migration 00019: Deletion cron readiness check function
-- Creates a SECURITY DEFINER function to check if deletion retry cron is properly configured
-- Returns booleans only (never exposes secret values)
-- Callable by service_role only (revoked from anon and authenticated)

CREATE OR REPLACE FUNCTION public.deletion_cron_ready()
RETURNS TABLE(
  pg_cron_installed boolean,
  pg_net_installed boolean,
  job_scheduled boolean,
  vault_project_url_present boolean,
  vault_service_role_key_present boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  has_vault boolean;
  project_url_present boolean;
  service_role_key_present boolean;
BEGIN
  -- Only service_role can call this function
  -- Use session_user because current_user changes to definer in SECURITY DEFINER functions
  IF session_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'deletion_cron_ready() can only be called by service_role';
  END IF;
  
  -- Check if vault schema exists
  has_vault := EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'vault');
  
  -- Check project_url
  IF has_vault THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name = ''project_url'' AND decrypted_secret IS NOT NULL)'
    INTO project_url_present;
  ELSE
    project_url_present := current_setting('app.project_url', true) IS NOT NULL;
  END IF;
  
  -- Check service_role_key
  IF has_vault THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name = ''service_role_key'' AND decrypted_secret IS NOT NULL)'
    INTO service_role_key_present;
  ELSE
    service_role_key_present := current_setting('app.service_role_key', true) IS NOT NULL;
  END IF;
  
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') AS pg_cron_installed,
    EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') AS pg_net_installed,
    EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'retry-account-deletions') AS job_scheduled,
    project_url_present AS vault_project_url_present,
    service_role_key_present AS vault_service_role_key_present;
END;
$$;

COMMENT ON FUNCTION public.deletion_cron_ready() IS 
'Checks deletion retry cron job readiness. Returns booleans only, never secret values. Service role only.';

-- Revoke from anon and authenticated, grant to service_role
REVOKE ALL ON FUNCTION public.deletion_cron_ready() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deletion_cron_ready() TO service_role;
