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
  ('usage_logs', 'AI usage count logs for daily limits', 30, true),
  ('deletion_requests', 'Completed or expired account deletion requests', 90, true),
  ('waitlist_post_launch', 'Pro waitlist entries after launch email sent', 0, false)
ON CONFLICT (id) DO NOTHING;

-- Function to clean up usage logs
CREATE OR REPLACE FUNCTION public.cleanup_usage_logs()
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
  WHERE id = 'usage_logs' AND is_active = true;
  
  IF v_retention_days IS NULL THEN
    RETURN;
  END IF;
  
  v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;
  
  -- Delete old usage logs
  DELETE FROM public.usage_logs
  WHERE created_at < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Update last cleanup timestamp
  UPDATE public.data_retention_config
  SET last_cleanup_at = NOW()
  WHERE id = 'usage_logs';
  
  RAISE NOTICE 'Cleaned up % usage log entries older than % days', v_deleted_count, v_retention_days;
END;
$$;

-- Revoke public access to cleanup function
REVOKE ALL ON FUNCTION public.cleanup_usage_logs() FROM PUBLIC, anon, authenticated;

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
  
  -- Delete old deletion requests that are completed or expired
  DELETE FROM public.account_deletion_requests
  WHERE (status IN ('completed', 'expired') OR expires_at < NOW())
    AND created_at < v_cutoff_date;
  
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

-- Function to clean up waitlist after launch email
CREATE OR REPLACE FUNCTION public.cleanup_waitlist_post_launch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_active BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  -- Check if this cleanup is active (should be enabled after launch email is sent)
  SELECT is_active INTO v_is_active
  FROM public.data_retention_config
  WHERE id = 'waitlist_post_launch';
  
  IF v_is_active IS NULL OR NOT v_is_active THEN
    RETURN;
  END IF;
  
  -- Delete all waitlist entries
  DELETE FROM public.pro_waitlist;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Update last cleanup timestamp and deactivate
  UPDATE public.data_retention_config
  SET last_cleanup_at = NOW(),
      is_active = false
  WHERE id = 'waitlist_post_launch';
  
  RAISE NOTICE 'Cleaned up % waitlist entries after launch email sent', v_deleted_count;
END;
$$;

-- Revoke public access to cleanup function
REVOKE ALL ON FUNCTION public.cleanup_waitlist_post_launch() FROM PUBLIC, anon, authenticated;

-- Schedule cron jobs (requires pg_cron extension)
-- Run daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-usage-logs',
  '0 3 * * *',
  $$SELECT public.cleanup_usage_logs();$$
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
