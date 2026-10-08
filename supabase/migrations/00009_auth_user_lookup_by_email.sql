-- Migration 00009: SECURITY DEFINER function to look up auth.users by email
-- Only callable by service_role. Prevents listUsers() pagination bug where
-- users past the first page return false negative.
-- NOTE: In public schema because local Supabase migrations can't create functions in auth schema

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, pg_temp
AS $$
DECLARE
  found_id uuid;
BEGIN
  SELECT id INTO found_id
  FROM auth.users
  WHERE lower(email) = lower(user_email)
  LIMIT 1;
  
  RETURN found_id;
END;
$$;

-- Revoke from public, anon, authenticated
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM authenticated;

-- Only service_role can execute
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;

COMMENT ON FUNCTION public.get_user_id_by_email IS 'SECURITY DEFINER: Returns user UUID by email. Only callable by service_role to avoid pagination bugs in listUsers().';
