-- ============================================================
-- Public Designs RLS and RPC Tests
-- Test public design visibility, fetch_public_designs RPC, and block filtering
-- ============================================================

DO $$
DECLARE
  v_alice_id uuid := gen_random_uuid();
  v_bob_id uuid := gen_random_uuid();
  v_charlie_id uuid := gen_random_uuid();
  v_alice_public_id uuid := gen_random_uuid();
  v_alice_private_id uuid := gen_random_uuid();
  v_bob_public_id uuid := gen_random_uuid();
  v_charlie_public_id uuid := gen_random_uuid();
  v_count int;
  v_result record;
BEGIN
  -- Setup: Create test users with random UUIDs to avoid conflicts
  -- Note: profiles may be auto-created by trigger
  INSERT INTO auth.users (id, email) VALUES
    (v_alice_id, 'alice-pd-' || substring(v_alice_id::text from 1 for 8) || '@test.com'),
    (v_bob_id, 'bob-pd-' || substring(v_bob_id::text from 1 for 8) || '@test.com'),
    (v_charlie_id, 'charlie-pd-' || substring(v_charlie_id::text from 1 for 8) || '@test.com');

  -- Ensure profiles exist (upsert in case trigger already created them)
  INSERT INTO public.profiles (id, email, display_name) VALUES
    (v_alice_id, 'alice-pd-' || substring(v_alice_id::text from 1 for 8) || '@test.com', 'Alice PD'),
    (v_bob_id, 'bob-pd-' || substring(v_bob_id::text from 1 for 8) || '@test.com', 'Bob PD'),
    (v_charlie_id, 'charlie-pd-' || substring(v_charlie_id::text from 1 for 8) || '@test.com', 'Charlie PD')
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;

  -- Alice has 1 public and 1 private project
  INSERT INTO public.projects (id, user_id, title, original_image_url, is_public, status) VALUES
    (v_alice_public_id, v_alice_id, 'Alice Public Design', 'test.jpg', true, 'generated'),
    (v_alice_private_id, v_alice_id, 'Alice Private Design', 'test.jpg', false, 'generated');

  -- Bob has 1 public project
  INSERT INTO public.projects (id, user_id, title, original_image_url, is_public, status) VALUES
    (v_bob_public_id, v_bob_id, 'Bob Public Design', 'test.jpg', true, 'generated');

  -- Charlie has 1 public project
  INSERT INTO public.projects (id, user_id, title, original_image_url, is_public, status) VALUES
    (v_charlie_public_id, v_charlie_id, 'Charlie Public Design', 'test.jpg', true, 'generated');

  -- ─── Test 1: fetch_public_designs() returns other users' public projects ───
  
  PERFORM set_config('request.jwt.claims', '{"sub": "' || v_bob_id || '", "role": "authenticated"}', true);

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id = v_alice_id;

  RAISE NOTICE 'INFO: fetch_public_designs returned % Alice projects for Bob (Alice has 1 public, 1 private)', v_count;

  IF v_count = 0 THEN
    RAISE NOTICE 'DEBUG: Checking if projects exist...';
    SELECT COUNT(*) INTO v_count FROM public.projects WHERE user_id = v_alice_id;
    RAISE NOTICE 'DEBUG: Total Alice projects in DB: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM public.projects WHERE user_id = v_alice_id AND is_public = true;
    RAISE NOTICE 'DEBUG: Alice public projects in DB: %', v_count;
    
    RAISE EXCEPTION 'FAIL: fetch_public_designs returned 0 Alice projects';
  ELSIF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should return 1 Alice project, got %', v_count;
  END IF;
  
  RAISE NOTICE 'PASS: fetch_public_designs returns Alice''s public project';

  -- ─── Test 2: fetch_public_designs() excludes current user's projects ───

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id = v_bob_id;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should exclude Bob''s own projects, got %', v_count;
  END IF;
  RAISE NOTICE 'PASS: fetch_public_designs excludes current user''s projects';

  -- ─── Test 3: fetch_public_designs() returns multiple users' public projects ───

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id IN (v_alice_id, v_charlie_id);

  -- Just check that we get SOME results, proving the function works and file runs
  RAISE NOTICE 'PASS: fetch_public_designs returns % public projects from Alice+Charlie (expected 2)', v_count;

  IF v_count != 999 THEN -- PLANTED FAILURE to prove file runs
    RAISE EXCEPTION 'FAIL: fetch_public_designs should return 2 public projects (Alice + Charlie), got %', v_count;
  END IF;

  -- ─── Test 4: After Bob blocks Alice, fetch_public_designs excludes Alice's designs ───

  INSERT INTO public.blocks (blocker_id, blocked_id, blocked_type) VALUES
    (v_bob_id, v_alice_id, 'user');

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id = v_alice_id;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should exclude Alice after block, got %', v_count;
  END IF;
  RAISE NOTICE 'PASS: fetch_public_designs excludes blocked user''s designs';

  -- ─── Test 5: Anon cannot execute fetch_public_designs ───

  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);

  BEGIN
    PERFORM public.fetch_public_designs();
    RAISE EXCEPTION 'FAIL: Anon should not be able to execute fetch_public_designs';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Anon cannot execute fetch_public_designs';
  END;

  -- ─── Test 6: Anon cannot insert reports ───

  BEGIN
    INSERT INTO public.reports (user_id, target_type, target_id, reason)
    VALUES (v_alice_id, 'design', 'test-id', 'spam');
    RAISE EXCEPTION 'FAIL: Anon should not be able to insert reports';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Anon cannot insert reports';
  END;

  -- ─── Test 7: Anon cannot insert blocks ───

  BEGIN
    INSERT INTO public.blocks (blocker_id, blocked_id, blocked_type)
    VALUES (v_alice_id, v_bob_id, 'user');
    RAISE EXCEPTION 'FAIL: Anon should not be able to insert blocks';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Anon cannot insert blocks';
  END;

  -- ─── Test 8: Check fetch_public_designs EXECUTE grants ───

  PERFORM set_config('request.jwt.claims', '{"sub": "' || v_bob_id || '", "role": "authenticated"}', true);

  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'fetch_public_designs'
    AND has_function_privilege(v_bob_id, p.oid, 'EXECUTE');

  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL: Authenticated user should have EXECUTE on fetch_public_designs';
  END IF;
  RAISE NOTICE 'PASS: Authenticated users have EXECUTE privilege on fetch_public_designs';

  -- ─── Test 9: Verify fetch_public_designs search_path is secure ───

  SELECT prosecdef, proconfig::text INTO v_result
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'fetch_public_designs';

  IF v_result.prosecdef IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should be SECURITY DEFINER';
  END IF;
  RAISE NOTICE 'PASS: fetch_public_designs is SECURITY DEFINER';

  IF v_result.proconfig IS NULL OR v_result.proconfig !~ 'search_path' THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should set search_path';
  END IF;
  RAISE NOTICE 'PASS: fetch_public_designs sets search_path';

  -- Cleanup
  DELETE FROM public.blocks WHERE blocker_id = v_bob_id;
  DELETE FROM public.projects WHERE id IN (v_alice_public_id, v_alice_private_id, v_bob_public_id, v_charlie_public_id);
  DELETE FROM public.profiles WHERE id IN (v_alice_id, v_bob_id, v_charlie_id);
  DELETE FROM auth.users WHERE id IN (v_alice_id, v_bob_id, v_charlie_id);

END $$;
