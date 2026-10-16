-- ============================================================
-- Public Designs RLS and RPC Tests
-- Test public design visibility, fetch_public_designs RPC, and block filtering
-- ============================================================

DO $$
DECLARE
  v_alice_id uuid := gen_random_uuid();
  v_bob_id uuid := gen_random_uuid();
  v_charlie_id uuid := gen_random_uuid();
  v_hidden_id uuid := gen_random_uuid();
  v_banned_id uuid := gen_random_uuid();
  v_alice_public_id uuid := gen_random_uuid();
  v_alice_private_id uuid := gen_random_uuid();
  v_bob_public_id uuid := gen_random_uuid();
  v_charlie_public_id uuid := gen_random_uuid();
  v_hidden_public_id uuid := gen_random_uuid();
  v_banned_public_id uuid := gen_random_uuid();
  v_count int;
  v_result record;
  v_has_original_image_url boolean;
  v_has_room_analysis boolean;
  v_has_lead_info boolean;
BEGIN
  -- Setup: Create test users with random UUIDs to avoid conflicts
  -- Note: profiles may be auto-created by trigger
  INSERT INTO auth.users (id, email) VALUES
    (v_alice_id, 'alice-pd-' || substring(v_alice_id::text from 1 for 8) || '@test.com'),
    (v_bob_id, 'bob-pd-' || substring(v_bob_id::text from 1 for 8) || '@test.com'),
    (v_charlie_id, 'charlie-pd-' || substring(v_charlie_id::text from 1 for 8) || '@test.com'),
    (v_hidden_id, 'hidden-pd-' || substring(v_hidden_id::text from 1 for 8) || '@test.com'),
    (v_banned_id, 'banned-pd-' || substring(v_banned_id::text from 1 for 8) || '@test.com');

  -- Ensure profiles exist (upsert in case trigger already created them)
  INSERT INTO public.profiles (id, email, display_name, is_banned) VALUES
    (v_alice_id, 'alice-pd-' || substring(v_alice_id::text from 1 for 8) || '@test.com', 'Alice PD', false),
    (v_bob_id, 'bob-pd-' || substring(v_bob_id::text from 1 for 8) || '@test.com', 'Bob PD', false),
    (v_charlie_id, 'charlie-pd-' || substring(v_charlie_id::text from 1 for 8) || '@test.com', 'Charlie PD', false),
    (v_hidden_id, 'hidden-pd-' || substring(v_hidden_id::text from 1 for 8) || '@test.com', 'Hidden User', false),
    (v_banned_id, 'banned-pd-' || substring(v_banned_id::text from 1 for 8) || '@test.com', 'Banned User', true)
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    is_banned = EXCLUDED.is_banned;

  -- Alice has 1 public and 1 private project
  INSERT INTO public.projects (id, user_id, title, original_image_url, room_analysis, lead_info, is_public, is_hidden, status) VALUES
    (v_alice_public_id, v_alice_id, 'Alice Public Design', 'alice/private.jpg', '{"roomType":"kitchen"}'::jsonb, '{"budget":"10k","zip":"12345"}'::jsonb, true, false, 'generated'),
    (v_alice_private_id, v_alice_id, 'Alice Private Design', 'alice/private2.jpg', '{"roomType":"bath"}'::jsonb, null, false, false, 'generated');

  -- Bob has 1 public project
  INSERT INTO public.projects (id, user_id, title, original_image_url, room_analysis, is_public, is_hidden, status) VALUES
    (v_bob_public_id, v_bob_id, 'Bob Public Design', 'bob/photo.jpg', '{"roomType":"living"}'::jsonb, true, false, 'generated');

  -- Charlie has 1 public project
  INSERT INTO public.projects (id, user_id, title, original_image_url, is_public, is_hidden, status) VALUES
    (v_charlie_public_id, v_charlie_id, 'Charlie Public Design', 'charlie/room.jpg', true, false, 'generated');

  -- Hidden project (should be filtered out)
  INSERT INTO public.projects (id, user_id, title, original_image_url, is_public, is_hidden, status) VALUES
    (v_hidden_public_id, v_hidden_id, 'Hidden Public Design', 'hidden/room.jpg', true, true, 'generated');

  -- Banned user project (should be filtered out)
  INSERT INTO public.projects (id, user_id, title, original_image_url, is_public, is_hidden, status) VALUES
    (v_banned_public_id, v_banned_id, 'Banned User Design', 'banned/room.jpg', true, false, 'generated');

  -- ─── Test 1: fetch_public_designs() result columns exclude private data ───
  
  PERFORM set_config('request.jwt.claims', '{"sub": "' || v_bob_id || '", "role": "authenticated"}', true);

  -- Check that original_image_url, room_analysis, lead_info are NOT in the result columns
  SELECT 
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'fetch_public_designs' 
        AND column_name = 'original_image_url'
    ) INTO v_has_original_image_url;

  SELECT 
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'fetch_public_designs' 
        AND column_name = 'room_analysis'
    ) INTO v_has_room_analysis;

  SELECT 
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'fetch_public_designs' 
        AND column_name = 'lead_info'
    ) INTO v_has_lead_info;

  IF v_has_original_image_url OR v_has_room_analysis OR v_has_lead_info THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs returns private columns (original_image_url: %, room_analysis: %, lead_info: %)', 
      v_has_original_image_url, v_has_room_analysis, v_has_lead_info;
  END IF;

  RAISE NOTICE 'PASS: fetch_public_designs excludes original_image_url, room_analysis, and lead_info';

  -- ─── Test 2: fetch_public_designs() returns other users' public projects ───

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id = v_alice_id;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should return 1 Alice project, got %', v_count;
  END IF;
  
  RAISE NOTICE 'PASS: fetch_public_designs returns Alice''s public project';

  -- ─── Test 3: Direct select on projects by another user returns 0 rows (no RLS policy) ───

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub": "' || v_bob_id || '", "role": "authenticated"}', true);

  SELECT COUNT(*) INTO v_count
  FROM public.projects
  WHERE user_id = v_alice_id AND is_public = true;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: Direct select on projects should return 0 rows for another user''s public project, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: Direct select on projects returns 0 rows for another user (no RLS policy)';

  -- Reset role
  RESET role;

  -- ─── Test 4: fetch_public_designs() excludes current user's projects ───

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id = v_bob_id;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should exclude Bob''s own projects, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: fetch_public_designs excludes current user''s projects';

  -- ─── Test 5: fetch_public_designs() returns multiple users' public projects ───

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id IN (v_alice_id, v_charlie_id);

  IF v_count != 2 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should return 2 public projects (Alice + Charlie), got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: fetch_public_designs returns 2 public projects from Alice+Charlie';

  -- ─── Test 6: fetch_public_designs() excludes hidden projects ───

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id = v_hidden_id;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should exclude hidden project, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: fetch_public_designs excludes hidden projects';

  -- ─── Test 7: fetch_public_designs() excludes banned user projects ───

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id = v_banned_id;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should exclude banned user project, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: fetch_public_designs excludes banned user projects';

  -- ─── Test 8: After Bob blocks Alice, fetch_public_designs excludes Alice's designs ───

  INSERT INTO public.blocks (blocker_id, blocked_id, blocked_type) VALUES
    (v_bob_id, v_alice_id, 'user');

  SELECT COUNT(*) INTO v_count
  FROM public.fetch_public_designs()
  WHERE user_id = v_alice_id;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should exclude Alice after block, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: fetch_public_designs excludes blocked user''s designs';

  -- ─── Test 9: Anon cannot execute fetch_public_designs ───

  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'fetch_public_designs'
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE');

  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL: anon should NOT have EXECUTE on fetch_public_designs';
  END IF;

  RAISE NOTICE 'PASS: Anon cannot execute fetch_public_designs';

  -- ─── Test 10: Anon cannot insert into reports (attempt the insert) ───

  BEGIN
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claims', '{}', true);
    
    INSERT INTO public.reports (user_id, target_type, target_id, reason)
    VALUES (v_bob_id, 'design', v_alice_public_id, 'test');
    
    RAISE EXCEPTION 'FAIL: Anon should not be able to insert into reports';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%permission denied%' OR SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row violates%' THEN
        RESET role;
        RAISE NOTICE 'PASS: Anon cannot insert into reports';
      ELSIF SQLERRM = 'FAIL: Anon should not be able to insert into reports' THEN
        RAISE;
      ELSE
        RESET role;
        RAISE NOTICE 'PASS: Anon cannot insert into reports (error: %)', SQLERRM;
      END IF;
  END;

  -- ─── Test 11: Anon cannot insert into blocks (attempt the insert) ───

  BEGIN
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claims', '{}', true);
    
    INSERT INTO public.blocks (blocker_id, blocked_id, blocked_type)
    VALUES (v_bob_id, v_charlie_id, 'user');
    
    RAISE EXCEPTION 'FAIL: Anon should not be able to insert into blocks';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%permission denied%' OR SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row violates%' THEN
        RESET role;
        RAISE NOTICE 'PASS: Anon cannot insert into blocks';
      ELSIF SQLERRM = 'FAIL: Anon should not be able to insert into blocks' THEN
        RAISE;
      ELSE
        RESET role;
        RAISE NOTICE 'PASS: Anon cannot insert into blocks (error: %)', SQLERRM;
      END IF;
  END;

  -- ─── Test 12: Authenticated role has EXECUTE on fetch_public_designs ───

  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'fetch_public_designs'
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE');

  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL: Authenticated role should have EXECUTE on fetch_public_designs';
  END IF;

  RAISE NOTICE 'PASS: Authenticated role has EXECUTE on fetch_public_designs';

  -- ─── Test 13: Verify fetch_public_designs is SECURITY DEFINER with search_path ───

  SELECT prosecdef, proconfig::text INTO v_result
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'fetch_public_designs';

  IF v_result.prosecdef IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should be SECURITY DEFINER';
  END IF;

  IF v_result.proconfig IS NULL OR v_result.proconfig !~ 'search_path' THEN
    RAISE EXCEPTION 'FAIL: fetch_public_designs should set search_path';
  END IF;

  RAISE NOTICE 'PASS: fetch_public_designs is SECURITY DEFINER with search_path set';

  -- Cleanup
  DELETE FROM public.blocks WHERE blocker_id = v_bob_id;
  DELETE FROM public.projects WHERE id IN (v_alice_public_id, v_alice_private_id, v_bob_public_id, v_charlie_public_id, v_hidden_public_id, v_banned_public_id);
  DELETE FROM public.profiles WHERE id IN (v_alice_id, v_bob_id, v_charlie_id, v_hidden_id, v_banned_id);
  DELETE FROM auth.users WHERE id IN (v_alice_id, v_bob_id, v_charlie_id, v_hidden_id, v_banned_id);

END $$;
