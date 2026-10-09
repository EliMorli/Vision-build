-- Test data retention cleanup functions

BEGIN;

-- Create test users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000099'::uuid, 'retention-test@example.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000098'::uuid, 'retention-test-2@example.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Profile is created by trigger, use ON CONFLICT
INSERT INTO public.profiles (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000099'::uuid, 'retention-test@example.com'),
  ('00000000-0000-0000-0000-000000000098'::uuid, 'retention-test-2@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create test project for waitlist foreign key
INSERT INTO public.projects (id, user_id, original_image_url, status, created_at)
VALUES ('00000000-0000-0000-0000-000000000097'::uuid, '00000000-0000-0000-0000-000000000099'::uuid, 'https://example.com/test.jpg', 'draft', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test 1: Verify cron jobs exist
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM cron.job WHERE jobname IN ('cleanup-usage-events', 'cleanup-deletion-requests', 'cleanup-waitlist-post-launch');
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: Expected 3 cron jobs, found %', v_count;
  END IF;
  RAISE NOTICE 'PASS: All 3 cron jobs are scheduled';
END $$;

-- Test 2: Verify anon/authenticated lack EXECUTE on cleanup functions
DO $$
DECLARE
  v_has_execute BOOLEAN;
BEGIN
  SELECT has_function_privilege('anon', 'public.cleanup_usage_events()', 'EXECUTE') INTO v_has_execute;
  IF v_has_execute THEN
    RAISE EXCEPTION 'FAIL: anon should not have EXECUTE on cleanup_usage_events';
  END IF;
  
  SELECT has_function_privilege('authenticated', 'public.cleanup_usage_events()', 'EXECUTE') INTO v_has_execute;
  IF v_has_execute THEN
    RAISE EXCEPTION 'FAIL: authenticated should not have EXECUTE on cleanup_usage_events';
  END IF;
  
  RAISE NOTICE 'PASS: anon/authenticated lack EXECUTE on cleanup functions';
END $$;

-- Test 3: usage_events cleanup
DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
  v_original_retention INTEGER;
  v_test_retention INTEGER := 5;
BEGIN
  -- Save original retention
  SELECT retention_days INTO v_original_retention FROM public.data_retention_config WHERE id = 'usage_events';
  
  -- Insert test usage events
  INSERT INTO public.usage_events (user_id, action, created_at)
  VALUES
    ('00000000-0000-0000-0000-000000000099'::uuid, 'analyze', NOW() - INTERVAL '100 days'),  -- Should be deleted
    ('00000000-0000-0000-0000-000000000099'::uuid, 'generate', NOW() - INTERVAL '10 days'),  -- Should be deleted with test retention
    ('00000000-0000-0000-0000-000000000099'::uuid, 'analyze', NOW() - INTERVAL '2 days');   -- Should be kept
  
  -- Count before cleanup with original retention
  SELECT COUNT(*) INTO v_old_count FROM public.usage_events WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid;
  
  -- Run cleanup with original retention (90 days)
  PERFORM public.cleanup_usage_events();
  
  SELECT COUNT(*) INTO v_new_count FROM public.usage_events WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid;
  
  IF v_new_count <> 2 THEN
    RAISE EXCEPTION 'FAIL: usage_events cleanup with 90 days should keep 2 rows (got %)', v_new_count;
  END IF;
  
  -- Change retention to 5 days and re-run
  UPDATE public.data_retention_config SET retention_days = v_test_retention WHERE id = 'usage_events';
  PERFORM public.cleanup_usage_events();
  
  SELECT COUNT(*) INTO v_new_count FROM public.usage_events WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid;
  
  IF v_new_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: usage_events cleanup with 5 days should keep 1 row (got %)', v_new_count;
  END IF;
  
  -- Restore original retention
  UPDATE public.data_retention_config SET retention_days = v_original_retention WHERE id = 'usage_events';
  
  RAISE NOTICE 'PASS: usage_events cleanup respects config retention_days';
END $$;

-- Test 4: deletion_requests cleanup
DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Insert test deletion requests with various statuses
  INSERT INTO public.account_deletion_requests (id, user_id, email, token_hash, status, expires_at, completed_at, created_at)
  VALUES
    -- Should be deleted (completed, old)
    ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000099'::uuid, 'retention-test@example.com', 'hash1', 'completed', NOW() + INTERVAL '1 day', NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days'),
    -- Should be deleted (used, old)
    ('00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000099'::uuid, 'retention-test@example.com', 'hash2', 'used', NOW() + INTERVAL '1 day', NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days'),
    -- Should be deleted (expired, old expires_at)
    ('00000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000099'::uuid, 'retention-test@example.com', 'hash3', 'expired', NOW() - INTERVAL '100 days', NULL, NOW() - INTERVAL '50 days'),
    -- Should be kept (failed_pending_retry)
    ('00000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000099'::uuid, 'retention-test@example.com', 'hash4', 'failed_pending_retry', NOW() - INTERVAL '100 days', NULL, NOW() - INTERVAL '100 days'),
    -- Should be kept (confirmed)
    ('00000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000099'::uuid, 'retention-test@example.com', 'hash5', 'confirmed', NOW() - INTERVAL '100 days', NULL, NOW() - INTERVAL '100 days'),
    -- Should be kept (completed but recent)
    ('00000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000099'::uuid, 'retention-test@example.com', 'hash6', 'completed', NOW() + INTERVAL '1 day', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');
  
  SELECT COUNT(*) INTO v_old_count FROM public.account_deletion_requests WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid;
  
  -- Run cleanup (30 day retention)
  PERFORM public.cleanup_deletion_requests();
  
  SELECT COUNT(*) INTO v_new_count FROM public.account_deletion_requests WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid;
  
  IF v_new_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: deletion_requests cleanup should keep 3 rows (failed_pending_retry, confirmed, recent completed), got %', v_new_count;
  END IF;
  
  -- Verify the correct ones were kept
  IF NOT EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE id = '00000000-0000-0000-0000-000000000004'::uuid) THEN
    RAISE EXCEPTION 'FAIL: failed_pending_retry row should be kept';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE id = '00000000-0000-0000-0000-000000000005'::uuid) THEN
    RAISE EXCEPTION 'FAIL: confirmed row should be kept';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE id = '00000000-0000-0000-0000-000000000006'::uuid) THEN
    RAISE EXCEPTION 'FAIL: recent completed row should be kept';
  END IF;
  
  RAISE NOTICE 'PASS: deletion_requests cleanup preserves failed_pending_retry, confirmed, and recent rows';
END $$;

-- Test 5: waitlist cleanup
DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Insert test waitlist entries (only for this test user)
  INSERT INTO public.pro_waitlist (user_id, email, project_id, launch_email_sent_at, created_at)
  VALUES
    ('00000000-0000-0000-0000-000000000099'::uuid, 'retention-test-1@example.com', '00000000-0000-0000-0000-000000000097'::uuid, NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),  -- Should be deleted
    ('00000000-0000-0000-0000-000000000098'::uuid, 'retention-test-2@example.com', NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),    -- Should be kept (different user, control)
    ('00000000-0000-0000-0000-000000000099'::uuid, 'retention-test-3@example.com', NULL, NULL, NOW() - INTERVAL '50 days'),                        -- Should be kept (no email sent)
    ('00000000-0000-0000-0000-000000000099'::uuid, 'retention-test-4@example.com', NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');    -- Should be kept (recent)
  
  SELECT COUNT(*) INTO v_old_count FROM public.pro_waitlist WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid;
  
  -- Enable cleanup and run
  UPDATE public.data_retention_config SET is_active = TRUE WHERE id = 'waitlist_post_launch';
  PERFORM public.cleanup_waitlist_post_launch();
  
  SELECT COUNT(*) INTO v_new_count FROM public.pro_waitlist WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid;
  
  IF v_new_count <> 2 THEN
    RAISE EXCEPTION 'FAIL: waitlist cleanup should keep 2 rows (recent + no email), got %', v_new_count;
  END IF;
  
  RAISE NOTICE 'PASS: waitlist cleanup removes only old launch-emailed entries';
END $$;

-- Cleanup
DELETE FROM public.usage_events WHERE user_id IN ('00000000-0000-0000-0000-000000000099'::uuid, '00000000-0000-0000-0000-000000000098'::uuid);
DELETE FROM public.account_deletion_requests WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid;
DELETE FROM public.pro_waitlist WHERE user_id IN ('00000000-0000-0000-0000-000000000099'::uuid, '00000000-0000-0000-0000-000000000098'::uuid);
DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000097'::uuid;

-- Restore original data_retention_config values
UPDATE public.data_retention_config SET retention_days = 30 WHERE id = 'usage_events';

ROLLBACK;
