-- Test mark_pro_waitlist_launch_email_sent RPC

BEGIN;

-- Create test user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000091'::uuid, 'waitlist-rpc-test@example.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email)
VALUES ('00000000-0000-0000-0000-000000000091'::uuid, 'waitlist-rpc-test@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create test projects for unique constraint
INSERT INTO public.projects (id, user_id, original_image_url, status, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000091'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'https://example.com/test1.jpg', 'draft', NOW()),
  ('00000000-0000-0000-0000-000000000092'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'https://example.com/test2.jpg', 'draft', NOW()),
  ('00000000-0000-0000-0000-000000000093'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'https://example.com/test3.jpg', 'draft', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test waitlist entries (distinct project_id per entry to avoid unique constraint)
INSERT INTO public.pro_waitlist (id, user_id, email, project_id, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000081'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'test1@example.com', '00000000-0000-0000-0000-000000000091'::uuid, NOW()),
  ('00000000-0000-0000-0000-000000000082'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'test2@example.com', '00000000-0000-0000-0000-000000000092'::uuid, NOW()),
  ('00000000-0000-0000-0000-000000000083'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'test3@example.com', '00000000-0000-0000-0000-000000000093'::uuid, NOW());

-- Test: Mark entries as launch email sent
DO $$
DECLARE
  v_count INTEGER;
  v_marked TIMESTAMPTZ;
BEGIN
  -- Call RPC
  SELECT public.mark_pro_waitlist_launch_email_sent(
    ARRAY['00000000-0000-0000-0000-000000000081'::uuid, '00000000-0000-0000-0000-000000000082'::uuid]
  ) INTO v_count;
  
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'FAIL: Expected 2 rows updated, got %', v_count;
  END IF;
  
  -- Verify launch_email_sent_at was set
  SELECT launch_email_sent_at INTO v_marked
  FROM public.pro_waitlist
  WHERE id = '00000000-0000-0000-0000-000000000081'::uuid;
  
  IF v_marked IS NULL THEN
    RAISE EXCEPTION 'FAIL: launch_email_sent_at should be set';
  END IF;
  
  -- Verify third entry was not marked
  SELECT launch_email_sent_at INTO v_marked
  FROM public.pro_waitlist
  WHERE id = '00000000-0000-0000-0000-000000000083'::uuid;
  
  IF v_marked IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: Third entry should not be marked';
  END IF;
  
  RAISE NOTICE 'PASS: mark_pro_waitlist_launch_email_sent works correctly';
END $$;

-- Cleanup
DELETE FROM public.pro_waitlist WHERE user_id = '00000000-0000-0000-0000-000000000091'::uuid;
DELETE FROM public.projects WHERE id IN ('00000000-0000-0000-0000-000000000091'::uuid, '00000000-0000-0000-0000-000000000092'::uuid, '00000000-0000-0000-0000-000000000093'::uuid);

ROLLBACK;
