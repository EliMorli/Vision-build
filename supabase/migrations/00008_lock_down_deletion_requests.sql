-- Migration 00008: Security fix for account_deletion_requests
-- Removes all anon/authenticated access. Only service-role may write.
-- Prevents attack where anon inserts a victim's email with self-made token hash.

-- Drop the existing anon INSERT policy
DROP POLICY IF EXISTS "Anonymous can create deletion requests" ON public.account_deletion_requests;

-- Explicitly deny all operations for anon and authenticated roles
-- (Service role bypasses RLS, so this doesn't affect edge functions)

-- No SELECT for anyone
CREATE POLICY "Block all SELECT"
  ON public.account_deletion_requests
  FOR SELECT
  USING (false);

-- No INSERT for anon/authenticated
CREATE POLICY "Block all INSERT"
  ON public.account_deletion_requests
  FOR INSERT
  WITH CHECK (false);

-- No UPDATE for anon/authenticated
CREATE POLICY "Block all UPDATE"
  ON public.account_deletion_requests
  FOR UPDATE
  USING (false);

-- No DELETE for anon/authenticated
CREATE POLICY "Block all DELETE"
  ON public.account_deletion_requests
  FOR DELETE
  USING (false);

COMMENT ON TABLE public.account_deletion_requests IS 'Secure account deletion requests with token-based confirmation. Only service-role edge functions may read/write. All anon/authenticated access blocked to prevent token injection attacks.';
