-- ============================================================
-- Admin moderation tests (00025)
-- Non-admins cannot read the queue, the audit log or admins, and cannot act.
-- Admins can hide, dismiss and ban; every action is logged.
-- N distinct reporters auto-hide a design pending review.
-- Owners cannot clear is_hidden / is_banned themselves.
-- ============================================================

\set ON_ERROR_STOP on

-- ─── Setup (as postgres) ───────────────────────────────────
-- a0 admin via admins table, a9 admin via app_metadata claim,
-- o1 owner, r1..r4 reporters

INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'admin-mod@test.com'),
  ('a9000000-0000-0000-0000-000000000000', 'claim-admin-mod@test.com'),
  ('01000000-0000-0000-0000-000000000000', 'owner-mod@test.com'),
  ('0e000000-0000-0000-0000-000000000001', 'r1-mod@test.com'),
  ('0e000000-0000-0000-0000-000000000002', 'r2-mod@test.com'),
  ('0e000000-0000-0000-0000-000000000003', 'r3-mod@test.com'),
  ('0e000000-0000-0000-0000-000000000004', 'r4-mod@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, display_name) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'admin-mod@test.com', 'Admin'),
  ('a9000000-0000-0000-0000-000000000000', 'claim-admin-mod@test.com', 'Claim Admin'),
  ('01000000-0000-0000-0000-000000000000', 'owner-mod@test.com', 'Owner'),
  ('0e000000-0000-0000-0000-000000000001', 'r1-mod@test.com', 'R1'),
  ('0e000000-0000-0000-0000-000000000002', 'r2-mod@test.com', 'R2'),
  ('0e000000-0000-0000-0000-000000000003', 'r3-mod@test.com', 'R3'),
  ('0e000000-0000-0000-0000-000000000004', 'r4-mod@test.com', 'R4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admins (user_id) VALUES ('a0000000-0000-0000-0000-000000000000');

-- d1: reported by 2 (below threshold), one report 30h old (overdue)
-- d2: reported by 3 distinct users -> auto-hidden
-- d3: reported 3 times by the SAME user -> not auto-hidden
INSERT INTO public.projects (id, user_id, title, original_image_url, selected_generation_url, is_public, status) VALUES
  ('d1000000-0000-0000-0000-000000000000', '01000000-0000-0000-0000-000000000000', 'Design one',   'o/1.jpg', 'o/d1/gen.jpg', true, 'generated'),
  ('d2000000-0000-0000-0000-000000000000', '01000000-0000-0000-0000-000000000000', 'Design two',   'o/2.jpg', 'o/d2/gen.jpg', true, 'generated'),
  ('d3000000-0000-0000-0000-000000000000', '01000000-0000-0000-0000-000000000000', 'Design three', 'o/3.jpg', 'o/d3/gen.jpg', true, 'generated');

-- Reports are inserted as the reporters themselves (through RLS), like the app does.
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000001", "role": "authenticated"}';
INSERT INTO public.reports (user_id, target_type, target_id, reason) VALUES
  ('0e000000-0000-0000-0000-000000000001', 'design', 'd1000000-0000-0000-0000-000000000000', 'spam'),
  ('0e000000-0000-0000-0000-000000000001', 'design', 'd2000000-0000-0000-0000-000000000000', 'inappropriate'),
  ('0e000000-0000-0000-0000-000000000001', 'design', 'd3000000-0000-0000-0000-000000000000', 'spam'),
  ('0e000000-0000-0000-0000-000000000001', 'design', 'd3000000-0000-0000-0000-000000000000', 'spam'),
  ('0e000000-0000-0000-0000-000000000001', 'design', 'd3000000-0000-0000-0000-000000000000', 'other');
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000002", "role": "authenticated"}';
INSERT INTO public.reports (user_id, target_type, target_id, reason) VALUES
  ('0e000000-0000-0000-0000-000000000002', 'design', 'd1000000-0000-0000-0000-000000000000', 'copyright'),
  ('0e000000-0000-0000-0000-000000000002', 'design', 'd2000000-0000-0000-0000-000000000000', 'inappropriate');
COMMIT;

-- Age one d1 report past the review window (deterministic, relative to now()).
UPDATE public.reports SET created_at = now() - interval '30 hours'
 WHERE target_id = 'd1000000-0000-0000-0000-000000000000' AND reason = 'spam';

-- ─── Test 1: below threshold is not hidden ─────────────────
DO $$
BEGIN
  IF (SELECT is_hidden FROM public.projects WHERE id = 'd2000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: d2 hidden with only 2 reporters';
  END IF;
  RAISE NOTICE 'PASS: 2 distinct reporters do not auto-hide';
END $$;

-- ─── Test 2: third distinct reporter auto-hides ────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000003", "role": "authenticated"}';
INSERT INTO public.reports (user_id, target_type, target_id, reason) VALUES
  ('0e000000-0000-0000-0000-000000000003', 'design', 'd2000000-0000-0000-0000-000000000000', 'misleading');
COMMIT;

DO $$
DECLARE v_log int;
BEGIN
  IF NOT (SELECT is_hidden FROM public.projects WHERE id = 'd2000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: d2 not auto-hidden at 3 distinct reporters';
  END IF;
  SELECT count(*) INTO v_log FROM public.moderation_log
   WHERE action = 'auto_hide_design' AND target_id = 'd2000000-0000-0000-0000-000000000000' AND admin_id IS NULL;
  IF v_log <> 1 THEN
    RAISE EXCEPTION 'FAIL: expected 1 auto_hide log row, got %', v_log;
  END IF;
  IF (SELECT count(*) FROM public.reports WHERE target_id = 'd2000000-0000-0000-0000-000000000000' AND status = 'open') <> 3 THEN
    RAISE EXCEPTION 'FAIL: auto-hide must leave reports open for review';
  END IF;
  RAISE NOTICE 'PASS: 3 distinct reporters auto-hide, logged, reports stay open';
END $$;

DO $$
BEGIN
  IF (SELECT is_hidden FROM public.projects WHERE id = 'd3000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: one user reporting 3 times auto-hid d3';
  END IF;
  RAISE NOTICE 'PASS: repeated reports from one user do not count as distinct';
END $$;

-- ─── Test 3: auto-hidden design leaves Explore ─────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000004", "role": "authenticated"}';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fetch_public_designs() WHERE id = 'd2000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: auto-hidden design still in Explore';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fetch_public_designs() WHERE id = 'd1000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: d1 should still be in Explore';
  END IF;
  RAISE NOTICE 'PASS: auto-hidden design removed from Explore';
END $$;
ROLLBACK;

-- ─── Test 4: non-admin cannot read the queue ───────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000004", "role": "authenticated"}';
DO $$
BEGIN
  IF public.is_admin() THEN RAISE EXCEPTION 'FAIL: reporter is_admin() true'; END IF;
  BEGIN
    PERFORM * FROM public.admin_report_queue();
    RAISE EXCEPTION 'FAIL: non-admin read the queue';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: non-admin cannot read the queue';
  END;
END $$;
ROLLBACK;

-- ─── Test 5: non-admin cannot act (each RPC) ───────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000004", "role": "authenticated"}';
DO $$
BEGIN
  BEGIN
    PERFORM public.admin_hide_design('d1000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: non-admin hid a design';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.admin_dismiss_reports('d1000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: non-admin dismissed reports';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.admin_ban_user('01000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: non-admin banned a user';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS: non-admin cannot hide, dismiss or ban';
END $$;
ROLLBACK;

-- ─── Test 6: non-admin cannot read or write log / admins / other reports ──
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000004", "role": "authenticated"}';
DO $$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.moderation_log;
  IF v <> 0 THEN RAISE EXCEPTION 'FAIL: non-admin sees % log rows', v; END IF;
  SELECT count(*) INTO v FROM public.admins;
  IF v <> 0 THEN RAISE EXCEPTION 'FAIL: non-admin sees admins'; END IF;
  SELECT count(*) INTO v FROM public.reports;
  IF v <> 0 THEN RAISE EXCEPTION 'FAIL: non-admin sees other users reports'; END IF;
  BEGIN
    INSERT INTO public.admins (user_id) VALUES ('0e000000-0000-0000-0000-000000000004');
    RAISE EXCEPTION 'FAIL: non-admin made themselves admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.moderation_log (action, target_type, target_id)
    VALUES ('dismiss_report', 'design', 'd1000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: non-admin wrote the audit log';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.moderation_settings SET auto_hide_threshold = 100;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v <> 0 THEN RAISE EXCEPTION 'FAIL: non-admin changed moderation settings'; END IF;
  RAISE NOTICE 'PASS: non-admin cannot read/write log, admins, settings or others reports';
END $$;
ROLLBACK;

-- ─── Test 7: a fake app_metadata in user_metadata does not grant admin ──
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000004", "role": "authenticated", "user_metadata": {"role": "admin"}}';
DO $$
BEGIN
  IF public.is_admin() THEN RAISE EXCEPTION 'FAIL: user_metadata role granted admin'; END IF;
  RAISE NOTICE 'PASS: user_metadata cannot grant admin';
END $$;
ROLLBACK;

-- ─── Test 8: reporters cannot pre-resolve or edit reports ──
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000001", "role": "authenticated"}';
DO $$
DECLARE v int;
BEGIN
  BEGIN
    INSERT INTO public.reports (user_id, target_type, target_id, reason, status)
    VALUES ('0e000000-0000-0000-0000-000000000001', 'design', 'd1000000-0000-0000-0000-000000000000', 'spam', 'dismissed');
    RAISE EXCEPTION 'FAIL: reporter inserted a dismissed report';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.reports SET status = 'dismissed' WHERE user_id = '0e000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v <> 0 THEN RAISE EXCEPTION 'FAIL: reporter updated own report status'; END IF;
  RAISE NOTICE 'PASS: reporters cannot resolve reports';
END $$;
ROLLBACK;

-- ─── Test 9: owner cannot unhide or unban themselves ───────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "01000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DO $$
BEGIN
  BEGIN
    UPDATE public.projects SET is_hidden = false WHERE id = 'd2000000-0000-0000-0000-000000000000';
    RAISE EXCEPTION 'FAIL: owner unhid an auto-hidden design';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- Ordinary edits still work
  UPDATE public.projects SET title = 'Renamed' WHERE id = 'd3000000-0000-0000-0000-000000000000';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: owner can no longer rename own project'; END IF;
  RAISE NOTICE 'PASS: owner cannot unhide, can still edit';
END $$;
ROLLBACK;

-- ─── Test 10: admin (admins table) reads queue ─────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DO $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FAIL: admins-table user not admin'; END IF;
  IF (SELECT count(*) FROM public.admin_report_queue()) <> 3 THEN
    RAISE EXCEPTION 'FAIL: expected 3 queue rows, got %', (SELECT count(*) FROM public.admin_report_queue());
  END IF;
  SELECT * INTO r FROM public.admin_report_queue() WHERE project_id = 'd1000000-0000-0000-0000-000000000000';
  IF r.reporter_count <> 2 OR NOT r.overdue OR r.thumbnail_path <> 'o/d1/gen.jpg' OR r.title <> 'Design one' THEN
    RAISE EXCEPTION 'FAIL: d1 row wrong: %', row_to_json(r);
  END IF;
  SELECT * INTO r FROM public.admin_report_queue() WHERE project_id = 'd3000000-0000-0000-0000-000000000000';
  IF r.reporter_count <> 1 OR r.report_count <> 3 OR r.overdue THEN
    RAISE EXCEPTION 'FAIL: d3 row wrong: %', row_to_json(r);
  END IF;
  SELECT * INTO r FROM public.admin_report_queue() WHERE project_id = 'd2000000-0000-0000-0000-000000000000';
  IF NOT r.is_hidden OR r.reporter_count <> 3 THEN RAISE EXCEPTION 'FAIL: d2 row wrong: %', row_to_json(r); END IF;
  -- Overdue first
  SELECT * INTO r FROM public.admin_report_queue() LIMIT 1;
  IF r.project_id <> 'd1000000-0000-0000-0000-000000000000' THEN RAISE EXCEPTION 'FAIL: overdue not sorted first'; END IF;
  IF (SELECT count(*) FROM public.moderation_log) < 1 THEN RAISE EXCEPTION 'FAIL: admin cannot read log'; END IF;
  RAISE NOTICE 'PASS: admin reads queue with counts, thumbnail and 24h flag';
END $$;
ROLLBACK;

-- ─── Test 11: app_metadata role admin also works ───────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a9000000-0000-0000-0000-000000000000", "role": "authenticated", "app_metadata": {"role": "admin"}}';
DO $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FAIL: app_metadata admin not admin'; END IF;
  PERFORM * FROM public.admin_report_queue();
  RAISE NOTICE 'PASS: app_metadata.role = admin grants admin';
END $$;
ROLLBACK;

-- ─── Test 12: admin dismisses auto-hidden d2 -> restored ───
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
SELECT public.admin_dismiss_reports('d2000000-0000-0000-0000-000000000000', 'Looks fine');
COMMIT;

DO $$
BEGIN
  IF (SELECT is_hidden FROM public.projects WHERE id = 'd2000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: dismissing reports did not restore auto-hidden design';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE target_id = 'd2000000-0000-0000-0000-000000000000' AND status <> 'dismissed') THEN
    RAISE EXCEPTION 'FAIL: d2 reports not all dismissed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moderation_log WHERE action = 'dismiss_report'
                 AND target_id = 'd2000000-0000-0000-0000-000000000000'
                 AND admin_id = 'a0000000-0000-0000-0000-000000000000'
                 AND (details->>'restored')::boolean) THEN
    RAISE EXCEPTION 'FAIL: dismiss not logged';
  END IF;
  RAISE NOTICE 'PASS: dismiss restores auto-hidden design and is logged';
END $$;

-- ─── Test 13: admin hides d1 ───────────────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
SELECT public.admin_hide_design('d1000000-0000-0000-0000-000000000000', NULL);
COMMIT;

DO $$
BEGIN
  IF NOT (SELECT is_hidden AND NOT is_public FROM public.projects WHERE id = 'd1000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: hide did not hide + unpublish d1';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE target_id = 'd1000000-0000-0000-0000-000000000000' AND status <> 'actioned') THEN
    RAISE EXCEPTION 'FAIL: d1 reports not actioned';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moderation_log WHERE action = 'hide_design' AND target_id = 'd1000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: hide not logged';
  END IF;
  RAISE NOTICE 'PASS: hide unpublishes, actions reports, logs';
END $$;

-- ─── Test 14: admin bans owner ─────────────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DO $$
BEGIN
  BEGIN
    PERFORM public.admin_ban_user('a0000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: admin banned themselves';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SELECT public.admin_ban_user('01000000-0000-0000-0000-000000000000', 'Repeat spam');
COMMIT;

DO $$
BEGIN
  IF NOT (SELECT is_banned FROM public.profiles WHERE id = '01000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: owner not banned';
  END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE user_id = '01000000-0000-0000-0000-000000000000' AND is_public) THEN
    RAISE EXCEPTION 'FAIL: banned owner still has public designs';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE target_id = 'd3000000-0000-0000-0000-000000000000' AND status = 'open') THEN
    RAISE EXCEPTION 'FAIL: ban did not resolve d3 reports';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moderation_log WHERE action = 'ban_user' AND target_id = '01000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: ban not logged';
  END IF;
  RAISE NOTICE 'PASS: ban unpublishes all designs, resolves reports, logs';
END $$;

-- ─── Test 15: banned owner cannot republish or unban ───────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "01000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DO $$
BEGIN
  BEGIN
    UPDATE public.projects SET is_public = true WHERE id = 'd3000000-0000-0000-0000-000000000000';
    RAISE EXCEPTION 'FAIL: banned user republished';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET is_banned = false WHERE id = '01000000-0000-0000-0000-000000000000';
    RAISE EXCEPTION 'FAIL: banned user unbanned themselves';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.profiles SET display_name = 'Still editable' WHERE id = '01000000-0000-0000-0000-000000000000';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: banned user cannot edit name'; END IF;
  RAISE NOTICE 'PASS: banned user cannot republish or unban';
END $$;
ROLLBACK;

-- ─── Test 16: queue is empty after resolution; log is append-only ──
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DO $$
DECLARE v int;
BEGIN
  IF (SELECT count(*) FROM public.admin_report_queue()) <> 0 THEN
    RAISE EXCEPTION 'FAIL: queue not empty after resolution';
  END IF;
  UPDATE public.moderation_log SET notes = 'tampered';
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v <> 0 THEN RAISE EXCEPTION 'FAIL: admin edited audit log'; END IF;
  DELETE FROM public.moderation_log;
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v <> 0 THEN RAISE EXCEPTION 'FAIL: admin deleted audit log'; END IF;
  RAISE NOTICE 'PASS: queue empty after resolution; admin cannot edit or delete log';
END $$;
ROLLBACK;

DO $$
BEGIN
  BEGIN
    UPDATE public.moderation_log SET notes = 'tampered';
    RAISE EXCEPTION 'FAIL: superuser edited audit log';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.moderation_log;
    RAISE EXCEPTION 'FAIL: superuser deleted audit log';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS: audit log is append-only even for privileged roles';
END $$;

-- ─── Test 17: a report never fails because notify is not configured ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reports_notify_admin') THEN
    RAISE EXCEPTION 'FAIL: notify trigger missing';
  END IF;
  RAISE NOTICE 'PASS: notify trigger present and reports above inserted without errors';
END $$;

-- ─── Test 18: threshold cannot be configured below 2 ───────
DO $$
BEGIN
  BEGIN
    UPDATE public.moderation_settings SET auto_hide_threshold = 1;
    RAISE EXCEPTION 'FAIL: threshold 1 accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF (SELECT auto_hide_threshold FROM public.moderation_settings) <> 3 THEN
    RAISE EXCEPTION 'FAIL: default threshold is not 3';
  END IF;
  RAISE NOTICE 'PASS: threshold defaults to 3 and cannot go below 2';
END $$;

-- ============================================================
-- Revision: keep hidden / restore / undo / details / owner count
-- Owner o2 so the ban above does not interfere.
-- ============================================================
INSERT INTO auth.users (id, email) VALUES ('02000000-0000-0000-0000-000000000000', 'owner2-mod@test.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, display_name) VALUES ('02000000-0000-0000-0000-000000000000', 'owner2-mod@test.com', 'Owner Two') ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET display_name = 'Owner Two' WHERE id = '02000000-0000-0000-0000-000000000000';
INSERT INTO public.projects (id, user_id, title, original_image_url, selected_generation_url, is_public, status) VALUES
  ('d4000000-0000-0000-0000-000000000000', '02000000-0000-0000-0000-000000000000', 'Keep me hidden', 'o/4.jpg', 'o/d4/gen.jpg', true, 'generated'),
  ('d5000000-0000-0000-0000-000000000000', '02000000-0000-0000-0000-000000000000', 'Undo me',        'o/5.jpg', 'o/d5/gen.jpg', true, 'generated'),
  ('d6000000-0000-0000-0000-000000000000', '02000000-0000-0000-0000-000000000000', 'Restore me',     'o/6.jpg', 'o/d6/gen.jpg', true, 'generated'),
  ('d7000000-0000-0000-0000-000000000000', '02000000-0000-0000-0000-000000000000', 'Private one',    'o/7.jpg', 'o/d7/gen.jpg', false, 'generated');

DO $$
DECLARE u text; d text;
BEGIN
  FOREACH u IN ARRAY ARRAY['0e000000-0000-0000-0000-000000000001','0e000000-0000-0000-0000-000000000002','0e000000-0000-0000-0000-000000000003'] LOOP
    FOREACH d IN ARRAY ARRAY['d4000000-0000-0000-0000-000000000000','d6000000-0000-0000-0000-000000000000'] LOOP
      PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
      EXECUTE 'SET LOCAL ROLE authenticated';
      INSERT INTO public.reports (user_id, target_type, target_id, reason, note)
      VALUES (u::uuid, 'design', d, 'inappropriate', CASE WHEN u LIKE '%1' THEN 'Shows a brand logo' END);
      EXECUTE 'RESET ROLE';
    END LOOP;
  END LOOP;
END $$;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000004", "role": "authenticated"}';
INSERT INTO public.reports (user_id, target_type, target_id, reason)
VALUES ('0e000000-0000-0000-0000-000000000004', 'design', 'd5000000-0000-0000-0000-000000000000', 'spam');
COMMIT;

-- ─── Test R1: non-admin cannot keep hidden, restore or read details ──
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "0e000000-0000-0000-0000-000000000004", "role": "authenticated"}';
DO $$
BEGIN
  BEGIN PERFORM public.admin_keep_hidden('d4000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: non-admin kept hidden'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.admin_restore_design('d4000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: non-admin restored'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.admin_restore_design('d4000000-0000-0000-0000-000000000000', true);
    RAISE EXCEPTION 'FAIL: non-admin undid'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM * FROM public.admin_report_details('d4000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: non-admin read details'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- the owner cannot either
  PERFORM set_config('request.jwt.claims', '{"sub": "02000000-0000-0000-0000-000000000000", "role": "authenticated"}', true);
  BEGIN PERFORM public.admin_restore_design('d4000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: owner restored own design'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS: non-admin and owner cannot keep hidden, restore, undo or read details';
END $$;
ROLLBACK;

-- ─── Test R2: details show reasons + notes, never reporter identity ──
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DO $$
DECLARE v_res text;
BEGIN
  IF (SELECT count(*) FROM public.admin_report_details('d4000000-0000-0000-0000-000000000000')) <> 3 THEN
    RAISE EXCEPTION 'FAIL: expected 3 detail rows';
  END IF;
  IF (SELECT count(*) FROM public.admin_report_details('d4000000-0000-0000-0000-000000000000') WHERE note = 'Shows a brand logo') <> 1 THEN
    RAISE EXCEPTION 'FAIL: reporter note missing';
  END IF;
  v_res := pg_get_function_result('public.admin_report_details(uuid)'::regprocedure);
  IF v_res ILIKE '%user%' OR v_res ILIKE '%email%' OR v_res ILIKE '%reporter%' THEN
    RAISE EXCEPTION 'FAIL: details expose reporter identity: %', v_res;
  END IF;
  RAISE NOTICE 'PASS: details return reasons and notes without reporter identity';
END $$;
ROLLBACK;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.reports (user_id, target_type, target_id, reason, note)
    VALUES ('0e000000-0000-0000-0000-000000000004', 'design', 'd5000000-0000-0000-0000-000000000000', 'spam', repeat('x', 201));
    RAISE EXCEPTION 'FAIL: 201-char note accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO public.reports (user_id, target_type, target_id, reason, note)
  VALUES ('0e000000-0000-0000-0000-000000000004', 'design', 'd7000000-0000-0000-0000-000000000000', 'other', repeat('y', 200));
  DELETE FROM public.reports WHERE target_id = 'd7000000-0000-0000-0000-000000000000' AND note = repeat('y', 200);
  RAISE NOTICE 'PASS: reporter notes allowed up to 200 characters, refused above';
END $$;

-- ─── Test R3: queue shows owner name and real public-design count ──
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.admin_report_queue() WHERE project_id = 'd5000000-0000-0000-0000-000000000000';
  IF r.owner_name <> 'Owner Two' OR r.owner_public_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: owner name/count wrong: % %', r.owner_name, r.owner_public_count;
  END IF;
  RAISE NOTICE 'PASS: queue returns owner name and public design count';
END $$;
ROLLBACK;

-- ─── Test R4: keep hidden ───────────────────────────────────
DO $$ BEGIN
  IF NOT (SELECT is_hidden FROM public.projects WHERE id = 'd4000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: d4 should be auto-hidden'; END IF; END $$;
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DO $$ BEGIN
  BEGIN PERFORM public.admin_keep_hidden('d5000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FAIL: keep hidden on a visible design'; EXCEPTION WHEN no_data_found THEN NULL; END;
END $$;
SELECT public.admin_keep_hidden('d4000000-0000-0000-0000-000000000000');
COMMIT;
DO $$ BEGIN
  IF NOT (SELECT is_hidden FROM public.projects WHERE id = 'd4000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: keep hidden unhid'; END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE target_id = 'd4000000-0000-0000-0000-000000000000' AND status <> 'actioned') THEN
    RAISE EXCEPTION 'FAIL: keep hidden left reports open'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moderation_log WHERE action = 'keep_hidden' AND target_id = 'd4000000-0000-0000-0000-000000000000'
                 AND admin_id = 'a0000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: keep hidden not logged'; END IF;
  RAISE NOTICE 'PASS: keep hidden resolves reports, stays hidden, logged';
END $$;

-- ─── Test R5: restore an auto-hidden design ─────────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
SELECT public.admin_restore_design('d6000000-0000-0000-0000-000000000000');
COMMIT;
DO $$ BEGIN
  IF (SELECT is_hidden OR NOT is_public FROM public.projects WHERE id = 'd6000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: restore did not unhide d6'; END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE target_id = 'd6000000-0000-0000-0000-000000000000' AND status <> 'dismissed') THEN
    RAISE EXCEPTION 'FAIL: restore did not dismiss reports'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moderation_log WHERE action = 'restore_design' AND target_id = 'd6000000-0000-0000-0000-000000000000'
                 AND NOT (details->>'undo')::boolean) THEN
    RAISE EXCEPTION 'FAIL: restore not logged'; END IF;
  RAISE NOTICE 'PASS: restore unhides, dismisses reports, logged';
END $$;

-- ─── Test R6: hide then undo puts it back, reports reopen ───
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
SELECT public.admin_hide_design('d5000000-0000-0000-0000-000000000000');
COMMIT;
DO $$ BEGIN
  IF NOT (SELECT is_hidden AND NOT is_public FROM public.projects WHERE id = 'd5000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: d5 not hidden'; END IF; END $$;
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
SELECT public.admin_restore_design('d5000000-0000-0000-0000-000000000000', true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_report_queue() WHERE project_id = 'd5000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: undone design not back in queue'; END IF; END $$;
COMMIT;
DO $$ BEGIN
  IF (SELECT is_hidden OR NOT is_public FROM public.projects WHERE id = 'd5000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: undo did not republish d5'; END IF;
  IF (SELECT count(*) FROM public.reports WHERE target_id = 'd5000000-0000-0000-0000-000000000000' AND status = 'open') <> 1 THEN
    RAISE EXCEPTION 'FAIL: undo did not reopen the report'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moderation_log WHERE action = 'restore_design' AND target_id = 'd5000000-0000-0000-0000-000000000000'
                 AND (details->>'undo')::boolean AND (details->>'republished')::boolean) THEN
    RAISE EXCEPTION 'FAIL: undo not logged'; END IF;
  RAISE NOTICE 'PASS: undo restores and republishes, reopens reports, logged';
END $$;

-- ─── Test R7: undo never republishes a design that was private ──
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a0000000-0000-0000-0000-000000000000", "role": "authenticated"}';
SELECT public.admin_hide_design('d7000000-0000-0000-0000-000000000000');
SELECT public.admin_restore_design('d7000000-0000-0000-0000-000000000000', true);
COMMIT;
DO $$ BEGIN
  IF (SELECT is_public OR is_hidden FROM public.projects WHERE id = 'd7000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'FAIL: undo made a private design public'; END IF;
  RAISE NOTICE 'PASS: undo keeps a private design private';
END $$;

-- ─── Test 19: with pg_net + vault secrets, a report queues one notify call ──
-- (CI installs pg_net and seeds vault secrets; skipped where pg_net is absent.)
DO $$
DECLARE v_before int; v_after int; v_body text;
BEGIN
  IF to_regclass('net.http_request_queue') IS NULL
     OR NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url') THEN
    RAISE NOTICE 'SKIP: pg_net or vault secrets not available';
    RETURN;
  END IF;
  SELECT count(*) INTO v_before FROM net.http_request_queue WHERE url LIKE '%/functions/v1/notify-new-report';
  INSERT INTO public.reports (user_id, target_type, target_id, reason)
  VALUES ('0e000000-0000-0000-0000-000000000004', 'design', 'd3000000-0000-0000-0000-000000000000', 'private reason text');
  SELECT count(*) INTO v_after FROM net.http_request_queue WHERE url LIKE '%/functions/v1/notify-new-report';
  IF v_after <> v_before + 1 THEN
    RAISE EXCEPTION 'FAIL: expected one queued notify call, got %', v_after - v_before;
  END IF;
  SELECT convert_from(body, 'UTF8') INTO v_body FROM net.http_request_queue
   WHERE url LIKE '%/functions/v1/notify-new-report' ORDER BY id DESC LIMIT 1;
  IF v_body LIKE '%private reason text%' OR v_body LIKE '%@%' THEN
    RAISE EXCEPTION 'FAIL: notify payload carries report text or email: %', v_body;
  END IF;
  RAISE NOTICE 'PASS: report queues one notify call with ids only';
END $$;

-- ─── Cleanup ───────────────────────────────────────────────
-- (Fresh database per run; profiles cascade. Audit rows stay by design.)
