-- Test: Verify deletion_cron_ready() function security and functionality
\set ON_ERROR_STOP on

DO $$
DECLARE
  v_result RECORD;
BEGIN
  -- Test 1: Function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'deletion_cron_ready'
  ) THEN
    RAISE EXCEPTION 'FAIL: deletion_cron_ready() function not found';
  END IF;
  RAISE NOTICE 'PASS: deletion_cron_ready() function exists';

  -- Test 2: Anon cannot call the function
  BEGIN
    SET ROLE anon;
    PERFORM * FROM public.deletion_cron_ready();
    SET ROLE postgres;
    RAISE EXCEPTION 'FAIL: Anon was able to call deletion_cron_ready()';
  EXCEPTION
    WHEN insufficient_privilege THEN
      SET ROLE postgres;
      RAISE NOTICE 'PASS: Anon cannot call deletion_cron_ready()';
  END;

  -- Test 3: Authenticated cannot call the function
  BEGIN
    SET ROLE authenticated;
    PERFORM * FROM public.deletion_cron_ready();
    SET ROLE postgres;
    RAISE EXCEPTION 'FAIL: Authenticated was able to call deletion_cron_ready()';
  EXCEPTION
    WHEN insufficient_privilege THEN
      SET ROLE postgres;
      RAISE NOTICE 'PASS: Authenticated cannot call deletion_cron_ready()';
  END;

  -- Test 4: Service role can call the function
  BEGIN
    SET ROLE service_role;
    SELECT * INTO v_result FROM public.deletion_cron_ready();
    SET ROLE postgres;
    RAISE NOTICE 'PASS: Service role can call deletion_cron_ready()';
  EXCEPTION
    WHEN OTHERS THEN
      SET ROLE postgres;
      RAISE EXCEPTION 'FAIL: Service role cannot call deletion_cron_ready()';
  END;

  -- Test 5: Function returns boolean columns only
  IF NOT (
    pg_typeof(v_result.pg_cron_installed) = 'boolean'::regtype AND
    pg_typeof(v_result.pg_net_installed) = 'boolean'::regtype AND
    pg_typeof(v_result.job_scheduled) = 'boolean'::regtype AND
    pg_typeof(v_result.vault_project_url_present) = 'boolean'::regtype AND
    pg_typeof(v_result.vault_service_role_key_present) = 'boolean'::regtype
  ) THEN
    RAISE EXCEPTION 'FAIL: Function does not return all boolean columns';
  END IF;
  RAISE NOTICE 'PASS: Function returns boolean columns only';

  -- Test 6: With seeded secrets, all five checks are true
  SET ROLE service_role;
  SELECT * INTO v_result FROM public.deletion_cron_ready();
  SET ROLE postgres;
  
  IF NOT (
    v_result.pg_cron_installed = true AND
    v_result.pg_net_installed = true AND
    v_result.job_scheduled = true AND
    v_result.vault_project_url_present = true AND
    v_result.vault_service_role_key_present = true
  ) THEN
    RAISE EXCEPTION 'FAIL: Not all checks returned true with seeded secrets (cron:%, net:%, job:%, url:%, key:%)', 
      v_result.pg_cron_installed, v_result.pg_net_installed, v_result.job_scheduled,
      v_result.vault_project_url_present, v_result.vault_service_role_key_present;
  END IF;
  RAISE NOTICE 'PASS: All five checks return true with seeded secrets';

  -- Test 7: With project_url removed, that flag is false
  DELETE FROM vault.decrypted_secrets WHERE name = 'project_url';
  
  SET ROLE service_role;
  SELECT * INTO v_result FROM public.deletion_cron_ready();
  SET ROLE postgres;
  
  IF v_result.vault_project_url_present <> false THEN
    RAISE EXCEPTION 'FAIL: vault_project_url_present should be false when secret is missing';
  END IF;
  RAISE NOTICE 'PASS: vault_project_url_present is false when secret is missing';
  
  -- Restore secret
  INSERT INTO vault.decrypted_secrets (name, decrypted_secret) 
  VALUES ('project_url', 'http://localhost:54321');

  -- Test 8: With service_role_key removed, that flag is false
  DELETE FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  
  SET ROLE service_role;
  SELECT * INTO v_result FROM public.deletion_cron_ready();
  SET ROLE postgres;
  
  IF v_result.vault_service_role_key_present <> false THEN
    RAISE EXCEPTION 'FAIL: vault_service_role_key_present should be false when secret is missing';
  END IF;
  RAISE NOTICE 'PASS: vault_service_role_key_present is false when secret is missing';
  
  -- Restore secret
  INSERT INTO vault.decrypted_secrets (name, decrypted_secret) 
  VALUES ('service_role_key', 'test-service-role-key-ci');
END $$;
