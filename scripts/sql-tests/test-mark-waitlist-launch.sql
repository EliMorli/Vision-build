-- Test mark_pro_waitlist_launch_email_sent RPC

BEGIN;

-- Create test user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000091'::uuid, 'waitlist-rpc-test@example.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email)
VALUES ('00000000-0000-0000-0000-000000000091'::uuid, 'waitlist-rpc-test@example.com')
ON CONFLICT (id) DO NOTHING;

-- Insert test waitlist entries
INSERT INTO public.pro_waitlist (id, user_id, email, project_id, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000081'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'test1@example.com', NULL, NOW()),
  ('00000000-0000-0000-0000-000000000082'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'test2@example.com', NULL, NOW()),
  ('00000000-0000-0000-0000-000000000083'::uuid, '00000000-0000-0000-0000-000000000091'::uuid, 'test3@example.com', NULL, NOW());

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

ROLLBACK;
