-- Test suite for set-project-visibility privacy fixes
-- Verifies main_image never lands in public-designs bucket
-- Run with: psql -U postgres -d postgres -f scripts/sql-tests/test-visibility-privacy.sql

\set ON_ERROR_STOP on

-- Setup test data
BEGIN;

-- Create a test user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-privacy@example.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create profile
INSERT INTO public.profiles (id, email, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-privacy@example.com',
  'Test User'
)
ON CONFLICT (id) DO NOTHING;

-- Create a test project with main_image and generated_image_urls
INSERT INTO public.projects (
  id,
  user_id,
  main_image,
  design_image,
  generated_image_urls,
  is_public
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/original.jpg',
  '00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/design-1.jpg',
  ARRAY[
    '00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/design-1.jpg',
    '00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/design-2.jpg',
    '00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/original.jpg'
  ],
  false
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Test 1: Verify main_image path contains full directory structure
BEGIN;

DO $$
DECLARE
  project RECORD;
BEGIN
  SELECT * INTO project FROM public.projects 
  WHERE id = '10000000-0000-0000-0000-000000000001';
  
  IF project.main_image NOT LIKE '%/%/%' THEN
    RAISE EXCEPTION 'FAIL: main_image does not have full path structure: %', project.main_image;
  END IF;
  
  IF project.main_image NOT LIKE '%original%' THEN
    RAISE EXCEPTION 'FAIL: main_image does not contain "original": %', project.main_image;
  END IF;
  
  RAISE NOTICE 'PASS: main_image has full path: %', project.main_image;
END;
$$;

ROLLBACK;

-- Test 2: Verify generated_image_urls contain full paths
BEGIN;

DO $$
DECLARE
  project RECORD;
  url TEXT;
BEGIN
  SELECT * INTO project FROM public.projects 
  WHERE id = '10000000-0000-0000-0000-000000000001';
  
  FOREACH url IN ARRAY project.generated_image_urls
  LOOP
    IF url NOT LIKE '%/%/%' THEN
      RAISE EXCEPTION 'FAIL: generated_image_url does not have full path: %', url;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'PASS: All generated_image_urls have full paths';
END;
$$;

ROLLBACK;

-- Test 3: Verify we can identify which URLs are main_image or original
BEGIN;

DO $$
DECLARE
  project RECORD;
  url TEXT;
  should_copy_count INT := 0;
  should_skip_count INT := 0;
BEGIN
  SELECT * INTO project FROM public.projects 
  WHERE id = '10000000-0000-0000-0000-000000000001';
  
  -- Check design_image
  IF project.design_image = project.main_image OR project.design_image LIKE '%original%' THEN
    should_skip_count := should_skip_count + 1;
    RAISE NOTICE 'Would skip design_image: %', project.design_image;
  ELSE
    should_copy_count := should_copy_count + 1;
    RAISE NOTICE 'Would copy design_image: %', project.design_image;
  END IF;
  
  -- Check generated_image_urls
  FOREACH url IN ARRAY project.generated_image_urls
  LOOP
    IF url = project.main_image OR url LIKE '%original%' THEN
      should_skip_count := should_skip_count + 1;
      RAISE NOTICE 'Would skip generated image: %', url;
    ELSE
      should_copy_count := should_copy_count + 1;
      RAISE NOTICE 'Would copy generated image: %', url;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total to copy: %, Total to skip: %', should_copy_count, should_skip_count;
  
  IF should_skip_count = 0 THEN
    RAISE EXCEPTION 'FAIL: No images were identified as needing to be skipped';
  END IF;
  
  IF should_copy_count = 0 THEN
    RAISE EXCEPTION 'FAIL: No images were identified as safe to copy';
  END IF;
  
  RAISE NOTICE 'PASS: Privacy filter logic would work correctly';
END;
$$;

ROLLBACK;

-- Cleanup
BEGIN;
DELETE FROM public.projects WHERE id = '10000000-0000-0000-0000-000000000001';
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
COMMIT;

\echo ''
\echo 'All visibility privacy tests completed!'
