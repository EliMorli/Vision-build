-- Data retention configuration and pg_cron jobs

-- Configuration table for data retention periods
CREATE TABLE IF NOT EXISTS public.data_retention_config (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  last_cleanup_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lock down the config table
ALTER TABLE public.data_retention_config ENABLE ROW LEVEL SECURITY;

-- No public access
REVOKE ALL ON public.data_retention_config FROM PUBLIC, anon, authenticated;

-- Only service role can access
-- Note: In production, grant only to specific service accounts if available

-- Insert default retention periods
INSERT INTO public.data_retention_config (id, description, retention_days, is_active) VALUES
  ('usage_events', 'AI usage count events for daily limits', 30, true),
  ('deletion_requests', 'Completed or expired account deletion requests', 90, true),
  ('waitlist_post_launch', 'Pro waitlist entries after launch email sent', 30, true)
ON CONFLICT (id) DO NOTHING;

-- Function to clean up usage events
CREATE OR REPLACE FUNCTION public.cleanup_usage_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_retention_days INTEGER;
  v_cutoff_date TIMESTAMPTZ;
  v_deleted_count INTEGER;
BEGIN
  -- Get retention period from config
  SELECT retention_days INTO v_retention_days
  FROM public.data_retention_config
  WHERE id = 'usage_events' AND is_active = true;
  
  IF v_retention_days IS NULL THEN
    RETURN;
  END IF;
  
  v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;
  
  -- Delete old usage events
  DELETE FROM public.usage_events
  WHERE created_at < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Update last cleanup timestamp
  UPDATE public.data_retention_config
  SET last_cleanup_at = NOW()
  WHERE id = 'usage_events';
  
  RAISE NOTICE 'Cleaned up % usage event entries older than % days', v_deleted_count, v_retention_days;
END;
$$;

-- Revoke public access to cleanup function
REVOKE ALL ON FUNCTION public.cleanup_usage_events() FROM PUBLIC, anon, authenticated;

-- Function to clean up deletion requests
CREATE OR REPLACE FUNCTION public.cleanup_deletion_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_retention_days INTEGER;
  v_cutoff_date TIMESTAMPTZ;
  v_completed_cutoff TIMESTAMPTZ;
  v_deleted_count INTEGER;
BEGIN
  -- Get retention period from config
  SELECT retention_days INTO v_retention_days
  FROM public.data_retention_config
  WHERE id = 'deletion_requests' AND is_active = true;
  
  IF v_retention_days IS NULL THEN
    RETURN;
  END IF;
  
  v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;
  v_completed_cutoff := NOW() - (v_retention_days || ' days')::INTERVAL;
  
  -- Delete old deletion requests:
  -- - completed/used: use COALESCE(completed_at, created_at)
  -- - pending/expired: use expires_at
  -- Never touch failed_pending_retry or confirmed
  DELETE FROM public.account_deletion_requests
  WHERE (status IN ('completed','used') AND COALESCE(completed_at, created_at) < v_completed_cutoff)
     OR (status IN ('pending','expired') AND expires_at < v_cutoff_date);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Update last cleanup timestamp
  UPDATE public.data_retention_config
  SET last_cleanup_at = NOW()
  WHERE id = 'deletion_requests';
  
  RAISE NOTICE 'Cleaned up % deletion request entries older than % days', v_deleted_count, v_retention_days;
END;
$$;

-- Revoke public access to cleanup function
REVOKE ALL ON FUNCTION public.cleanup_deletion_requests() FROM PUBLIC, anon, authenticated;

-- Add launch_email_sent_at column to pro_waitlist if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pro_waitlist' 
      AND column_name = 'launch_email_sent_at'
  ) THEN
    ALTER TABLE public.pro_waitlist
    ADD COLUMN launch_email_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Function to clean up waitlist after launch email
CREATE OR REPLACE FUNCTION public.cleanup_waitlist_post_launch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_retention_days INTEGER;
  v_cutoff_date TIMESTAMPTZ;
  v_deleted_count INTEGER;
BEGIN
  -- Get retention period from config
  SELECT retention_days INTO v_retention_days
  FROM public.data_retention_config
  WHERE id = 'waitlist_post_launch' AND is_active = true;
  
  IF v_retention_days IS NULL THEN
    RETURN;
  END IF;
  
  v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;
  
  -- Delete only waitlist entries where launch email was sent > retention_days ago
  DELETE FROM public.pro_waitlist
  WHERE launch_email_sent_at IS NOT NULL
    AND launch_email_sent_at < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Update last cleanup timestamp
  UPDATE public.data_retention_config
  SET last_cleanup_at = NOW()
  WHERE id = 'waitlist_post_launch';
  
  RAISE NOTICE 'Cleaned up % waitlist entries older than % days after launch email', v_deleted_count, v_retention_days;
END;
$$;

-- Revoke public access to cleanup function
REVOKE ALL ON FUNCTION public.cleanup_waitlist_post_launch() FROM PUBLIC, anon, authenticated;

-- Unschedule existing cron jobs if they exist (idempotent)
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'cleanup-usage-events';
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'cleanup-deletion-requests';
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'cleanup-waitlist-post-launch';

-- Schedule cron jobs (requires pg_cron extension)
-- Run daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-usage-events',
  '0 3 * * *',
  $$SELECT public.cleanup_usage_events();$$
);

SELECT cron.schedule(
  'cleanup-deletion-requests',
  '0 3 * * *',
  $$SELECT public.cleanup_deletion_requests();$$
);

SELECT cron.schedule(
  'cleanup-waitlist-post-launch',
  '0 4 * * *',
  $$SELECT public.cleanup_waitlist_post_launch();$$
);
