-- Test: Verify data retention cleanup functions work correctly
\set ON_ERROR_STOP on

DO $$
DECLARE
  v_old_usage_id UUID;
  v_new_usage_id UUID;
  v_old_deletion_id UUID;
  v_new_deletion_id UUID;
  v_test_user_id UUID;
BEGIN
  -- Create a test user
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'retention-test@example.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_test_user_id;

  -- Insert profile for test user
  INSERT INTO public.profiles (id, email, display_name, created_at, last_login_at)
  VALUES (v_test_user_id, 'retention-test@example.com', 'Retention Test', NOW(), NOW());

  -- Test 1: Usage logs cleanup
  RAISE NOTICE 'Test 1: Usage logs cleanup';
  
  -- Insert old usage log (35 days ago, should be deleted with 30-day retention)
  INSERT INTO public.usage_logs (user_id, action, created_at)
  VALUES (v_test_user_id, 'analyze', NOW() - INTERVAL '35 days')
  RETURNING id INTO v_old_usage_id;
  
  -- Insert new usage log (10 days ago, should be kept)
  INSERT INTO public.usage_logs (user_id, action, created_at)
  VALUES (v_test_user_id, 'analyze', NOW() - INTERVAL '10 days')
  RETURNING id INTO v_new_usage_id;
  
  -- Run cleanup
  PERFORM public.cleanup_usage_logs();
  
  -- Verify old log was deleted
  IF EXISTS (SELECT 1 FROM public.usage_logs WHERE id = v_old_usage_id) THEN
    RAISE EXCEPTION 'FAIL: Old usage log was not deleted';
  END IF;
  RAISE NOTICE 'PASS: Old usage log was deleted';
  
  -- Verify new log was kept
  IF NOT EXISTS (SELECT 1 FROM public.usage_logs WHERE id = v_new_usage_id) THEN
    RAISE EXCEPTION 'FAIL: New usage log was incorrectly deleted';
  END IF;
  RAISE NOTICE 'PASS: New usage log was kept';

  -- Test 2: Deletion requests cleanup
  RAISE NOTICE 'Test 2: Deletion requests cleanup';
  
  -- Insert old completed deletion request (100 days ago, should be deleted with 90-day retention)
  INSERT INTO public.account_deletion_requests (
    email, token_hash, ip_address, status, created_at, expires_at
  )
  VALUES (
    'old-deletion@example.com',
    'hash1',
    '127.0.0.1',
    'completed',
    NOW() - INTERVAL '100 days',
    NOW() - INTERVAL '99 days'
  )
  RETURNING id INTO v_old_deletion_id;
  
  -- Insert new pending deletion request (10 days ago, should be kept)
  INSERT INTO public.account_deletion_requests (
    email, token_hash, ip_address, status, created_at, expires_at
  )
  VALUES (
    'new-deletion@example.com',
    'hash2',
    '127.0.0.1',
    'pending',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO v_new_deletion_id;
  
  -- Run cleanup
  PERFORM public.cleanup_deletion_requests();
  
  -- Verify old request was deleted
  IF EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE id = v_old_deletion_id) THEN
    RAISE EXCEPTION 'FAIL: Old deletion request was not deleted';
  END IF;
  RAISE NOTICE 'PASS: Old deletion request was deleted';
  
  -- Verify new request was kept
  IF NOT EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE id = v_new_deletion_id) THEN
    RAISE EXCEPTION 'FAIL: New deletion request was incorrectly deleted';
  END IF;
  RAISE NOTICE 'PASS: New deletion request was kept';

  -- Test 3: Waitlist cleanup (when inactive, should not delete)
  RAISE NOTICE 'Test 3: Waitlist cleanup (inactive)';
  
  -- Ensure waitlist cleanup is inactive
  UPDATE public.data_retention_config
  SET is_active = false
  WHERE id = 'waitlist_post_launch';
  
  -- Insert a waitlist entry
  INSERT INTO public.pro_waitlist (user_id, email, project_id)
  VALUES (v_test_user_id, 'retention-test@example.com', NULL);
  
  -- Run cleanup (should not delete because inactive)
  PERFORM public.cleanup_waitlist_post_launch();
  
  -- Verify entry still exists
  IF NOT EXISTS (SELECT 1 FROM public.pro_waitlist WHERE user_id = v_test_user_id) THEN
    RAISE EXCEPTION 'FAIL: Waitlist entry was deleted when cleanup was inactive';
  END IF;
  RAISE NOTICE 'PASS: Waitlist entry kept when cleanup inactive';

  -- Test 4: Waitlist cleanup (when active, should delete all)
  RAISE NOTICE 'Test 4: Waitlist cleanup (active)';
  
  -- Activate waitlist cleanup
  UPDATE public.data_retention_config
  SET is_active = true
  WHERE id = 'waitlist_post_launch';
  
  -- Run cleanup (should delete all and deactivate)
  PERFORM public.cleanup_waitlist_post_launch();
  
  -- Verify all entries deleted
  IF EXISTS (SELECT 1 FROM public.pro_waitlist WHERE user_id = v_test_user_id) THEN
    RAISE EXCEPTION 'FAIL: Waitlist entries were not deleted when cleanup was active';
  END IF;
  RAISE NOTICE 'PASS: Waitlist entries deleted when cleanup active';
  
  -- Verify cleanup was deactivated
  IF EXISTS (
    SELECT 1 FROM public.data_retention_config
    WHERE id = 'waitlist_post_launch' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'FAIL: Waitlist cleanup was not deactivated after running';
  END IF;
  RAISE NOTICE 'PASS: Waitlist cleanup was deactivated after running';

  -- Cleanup test data
  DELETE FROM public.usage_logs WHERE user_id = v_test_user_id;
  DELETE FROM public.account_deletion_requests WHERE id = v_new_deletion_id;
  DELETE FROM public.profiles WHERE id = v_test_user_id;
  DELETE FROM auth.users WHERE id = v_test_user_id;

  RAISE NOTICE 'All data retention tests passed!';
END $$;
