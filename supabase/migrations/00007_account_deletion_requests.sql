-- Migration 00007: Secure account deletion requests table
-- For signed-out users requesting account deletion via web form

-- Table for deletion requests with secure token hashing
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  token_hash text NOT NULL, -- SHA-256 hash of the confirmation token
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  confirmed_at timestamptz,
  completed_at timestamptz,
  ip_address text, -- For rate limiting
  note text -- Optional user note
);

-- Index for token lookups (hash is unique per request)
CREATE UNIQUE INDEX idx_deletion_token_hash ON public.account_deletion_requests(token_hash) WHERE status != 'completed';

-- Index for email lookups and rate limiting
CREATE INDEX idx_deletion_email ON public.account_deletion_requests(email, created_at);
CREATE INDEX idx_deletion_ip ON public.account_deletion_requests(ip_address, created_at) WHERE ip_address IS NOT NULL;

-- Index for cleanup of old requests
CREATE INDEX idx_deletion_expires ON public.account_deletion_requests(expires_at) WHERE status = 'pending';

-- RLS Policies

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Anonymous users can INSERT (to create requests) but cannot SELECT
-- This prevents enumeration of email addresses
CREATE POLICY "Anonymous can create deletion requests"
  ON public.account_deletion_requests
  FOR INSERT
  WITH CHECK (auth.role() = 'anon');

-- Service role can do everything (for edge functions)
-- (Service role bypasses RLS by default, but we document it here)

-- No SELECT policy for anyone except service role
-- This ensures the form can't be used to check if an account exists

COMMENT ON TABLE public.account_deletion_requests IS 'Secure account deletion requests with token-based confirmation. Anon can only INSERT. Service role processes confirmations.';
