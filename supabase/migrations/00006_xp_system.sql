-- ============================================================
-- Migration: XP Events and Tracking System
-- ============================================================

-- XP Events table to track all XP-earning actions
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: each user can earn XP for each event_type only once per project
-- Use COALESCE to handle NULL project_id with a zero UUID
CREATE UNIQUE INDEX idx_xp_events_unique ON public.xp_events (
  user_id,
  event_type,
  COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::UUID)
);

-- Index for efficient queries by user
CREATE INDEX idx_xp_events_user_id ON public.xp_events(user_id);

-- RLS Policies
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- Users can select their own XP events
CREATE POLICY "Users can view their own XP events"
  ON public.xp_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert XP events (handled by backend)
-- No INSERT policy for authenticated users - service role bypasses RLS

-- ============================================================
-- User XP View: Calculate total XP and level for each user
-- ============================================================

CREATE OR REPLACE VIEW public.user_xp AS
SELECT 
  user_id,
  COALESCE(SUM(amount), 0) AS total_xp,
  -- Level calculation: 200 XP per level
  GREATEST(1, FLOOR(COALESCE(SUM(amount), 0) / 200.0)::INTEGER + 1) AS level
FROM public.xp_events
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON public.user_xp TO authenticated;

-- ============================================================
-- Helper function to get user XP and level
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_xp(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  total_xp BIGINT,
  level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If no user_id provided, use the current user
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;

  -- Return XP data for the user (or zeros if no events)
  RETURN QUERY
  SELECT 
    target_user_id,
    COALESCE(SUM(amount), 0)::BIGINT AS total_xp,
    GREATEST(1, FLOOR(COALESCE(SUM(amount), 0) / 200.0)::INTEGER + 1) AS level
  FROM public.xp_events
  WHERE xp_events.user_id = target_user_id;

  -- If no rows found, return default values
  IF NOT FOUND THEN
    RETURN QUERY SELECT target_user_id, 0::BIGINT, 1::INTEGER;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_xp TO authenticated;
