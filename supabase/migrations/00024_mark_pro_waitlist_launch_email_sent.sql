-- Service role RPC to mark pro_waitlist entries as launch email sent

CREATE OR REPLACE FUNCTION public.mark_pro_waitlist_launch_email_sent(ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.pro_waitlist
  SET launch_email_sent_at = NOW()
  WHERE id = ANY(ids)
    AND launch_email_sent_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;

-- Revoke public access
REVOKE ALL ON FUNCTION public.mark_pro_waitlist_launch_email_sent(uuid[]) FROM PUBLIC, anon, authenticated;

-- Grant to service_role only (in production, grant to specific service account if available)
-- Service role can execute this function via the Supabase client with service_role key
