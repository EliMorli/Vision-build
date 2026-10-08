-- Test: Verify invoke_deletion_retry() function security and error handling
\set ON_ERROR_STOP on

DO $$
BEGIN
  -- Test 1: Function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'invoke_deletion_retry'
  ) THEN
    RAISE EXCEPTION 'FAIL: invoke_deletion_retry() function not found';
  END IF;
  RAISE NOTICE 'PASS: invoke_deletion_retry() function exists';

  -- Test 2: Anon cannot call the function
  BEGIN
    SET ROLE anon;
    PERFORM public.invoke_deletion_retry();
    SET ROLE postgres;
    RAISE EXCEPTION 'FAIL: Anon was able to call invoke_deletion_retry()';
  EXCEPTION
    WHEN insufficient_privilege THEN
      SET ROLE postgres;
      RAISE NOTICE 'PASS: Anon cannot call invoke_deletion_retry()';
  END;

  -- Test 3: Authenticated cannot call the function
  BEGIN
    SET ROLE authenticated;
    PERFORM public.invoke_deletion_retry();
    SET ROLE postgres;
    RAISE EXCEPTION 'FAIL: Authenticated was able to call invoke_deletion_retry()';
  EXCEPTION
    WHEN insufficient_privilege THEN
      SET ROLE postgres;
      RAISE NOTICE 'PASS: Authenticated cannot call invoke_deletion_retry()';
  END;

  -- Test 4: Raises error when project_url secret is missing
  BEGIN
    SAVEPOINT before_delete_url;
    DELETE FROM vault.decrypted_secrets WHERE name = 'project_url';
    
    BEGIN
      SET ROLE service_role;
      PERFORM public.invoke_deletion_retry();
      SET ROLE postgres;
      RAISE EXCEPTION 'FAIL: Function did not raise error for missing project_url';
    EXCEPTION
      WHEN OTHERS THEN
        SET ROLE postgres;
        IF SQLERRM LIKE '%vault secret project_url missing%' THEN
          RAISE NOTICE 'PASS: Function raises error for missing project_url';
        ELSE
          RAISE EXCEPTION 'FAIL: Wrong error message for missing project_url: %', SQLERRM;
        END IF;
    END;
    
    ROLLBACK TO SAVEPOINT before_delete_url;
  END;

  -- Test 5: Raises error when service_role_key secret is missing
  BEGIN
    SAVEPOINT before_delete_key;
    DELETE FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    
    BEGIN
      SET ROLE service_role;
      PERFORM public.invoke_deletion_retry();
      SET ROLE postgres;
      RAISE EXCEPTION 'FAIL: Function did not raise error for missing service_role_key';
    EXCEPTION
      WHEN OTHERS THEN
        SET ROLE postgres;
        IF SQLERRM LIKE '%vault secret service_role_key missing%' THEN
          RAISE NOTICE 'PASS: Function raises error for missing service_role_key';
        ELSE
          RAISE EXCEPTION 'FAIL: Wrong error message for missing service_role_key: %', SQLERRM;
        END IF;
    END;
    
    ROLLBACK TO SAVEPOINT before_delete_key;
  END;
END $$;
