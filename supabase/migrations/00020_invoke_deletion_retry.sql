-- Migration 00020: Wrapper function for cron job to invoke deletion retry
-- SECURITY DEFINER function that validates vault secrets and calls net.http_post
-- Raises explicit errors when secrets are missing
-- Prevents direct access from anon/authenticated

CREATE OR REPLACE FUNCTION public.invoke_deletion_retry()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_service_role_key text;
  v_response_id bigint;
BEGIN
  -- Read project_url from Vault
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';
  
  IF v_project_url IS NULL THEN
    RAISE EXCEPTION 'deletion retry: vault secret project_url missing';
  END IF;
  
  -- Read service_role_key from Vault
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';
  
  IF v_service_role_key IS NULL THEN
    RAISE EXCEPTION 'deletion retry: vault secret service_role_key missing';
  END IF;
  
  -- Call the retry function via net.http_post
  SELECT net.http_post(
    url := v_project_url || '/functions/v1/retry-account-deletions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_role_key,
      'Content-Type', 'application/json'
    )
  ) INTO v_response_id;
  
  RETURN 'Invoked retry-account-deletions (net.http_post request id: ' || v_response_id || ')';
END;
$$;

COMMENT ON FUNCTION public.invoke_deletion_retry() IS 
'Invokes retry-account-deletions edge function via net.http_post. Raises explicit error if vault secrets missing. Cron only.';

-- Revoke from PUBLIC (new functions grant EXECUTE to PUBLIC by default)
REVOKE ALL ON FUNCTION public.invoke_deletion_retry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_deletion_retry() TO service_role;
