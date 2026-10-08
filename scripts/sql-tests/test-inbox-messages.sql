-- Test inbox_messages RLS and permissions

BEGIN;

-- Create test user profiles
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'test1@example.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'test2@example.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Profiles are created by trigger, use ON CONFLICT
INSERT INTO public.profiles (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'test1@example.com'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'test2@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create test project
INSERT INTO public.projects (id, user_id, title, status, room_analysis, selected_style)
VALUES (
  '00000000-0000-0000-0000-000000000010'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Test Project',
  'draft',
  '{"roomType": "test", "currentStyle": "test", "estimatedSqFt": 100, "keyElements": [], "rawAnalysis": "test"}',
  'modern'
) ON CONFLICT (id) DO NOTHING;

-- Insert test messages
INSERT INTO public.inbox_messages (id, user_id, sender_id, project_id, message_text, is_read)
VALUES
  ('00000000-0000-0000-0000-000000000100'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 'Message to user 1', FALSE),
  ('00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'Message to user 2', FALSE);

-- Test 1: authenticated user can read own messages
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.inbox_messages WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: User should see their own message (expected 1, got %)', v_count;
  END IF;
  RAISE NOTICE 'PASS: User can read own messages';
END $$;

-- Test 2: authenticated user cannot read other user's messages
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.inbox_messages WHERE user_id = '00000000-0000-0000-0000-000000000002'::uuid;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: User should not see other user messages (expected 0, got %)', v_count;
  END IF;
  RAISE NOTICE 'PASS: User cannot read other user messages';
END $$;

-- Test 3: authenticated user can update is_read on own messages
DO $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE public.inbox_messages SET is_read = TRUE WHERE id = '00000000-0000-0000-0000-000000000100'::uuid;
  SELECT is_read INTO v_updated FROM public.inbox_messages WHERE id = '00000000-0000-0000-0000-000000000100'::uuid;
  IF NOT v_updated THEN
    RAISE EXCEPTION 'FAIL: User should be able to mark own message as read';
  END IF;
  RAISE NOTICE 'PASS: User can update is_read on own messages';
END $$;

-- Test 4: authenticated user cannot update message_text
DO $$
BEGIN
  UPDATE public.inbox_messages SET message_text = 'Hacked!' WHERE id = '00000000-0000-0000-0000-000000000100'::uuid;
  RAISE EXCEPTION 'FAIL: User should not be able to update message_text';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: User cannot update message_text';
END $$;

-- Test 5: authenticated user cannot update sender_id
DO $$
BEGIN
  UPDATE public.inbox_messages SET sender_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE id = '00000000-0000-0000-0000-000000000100'::uuid;
  RAISE EXCEPTION 'FAIL: User should not be able to update sender_id';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: User cannot update sender_id';
END $$;

-- Test 6: authenticated user cannot update created_at
DO $$
BEGIN
  UPDATE public.inbox_messages SET created_at = NOW() - INTERVAL '1 day' WHERE id = '00000000-0000-0000-0000-000000000100'::uuid;
  RAISE EXCEPTION 'FAIL: User should not be able to update created_at';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: User cannot update created_at';
END $$;

RESET ROLE;

-- Cleanup
DELETE FROM public.inbox_messages WHERE id IN ('00000000-0000-0000-0000-000000000100'::uuid, '00000000-0000-0000-0000-000000000101'::uuid);
DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000010'::uuid;

ROLLBACK;
