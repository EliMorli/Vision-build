-- Migration 00012: Add user_id to deletion requests and create completion log
-- Ensures we can track completion within 45 days (CCPA) without keeping PII

-- Add user_id to account_deletion_requests (nullable for existing rows)
ALTER TABLE public.account_deletion_requests 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create FK to auth.users with CASCADE so deletion cleans up the request
-- Only add if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'account_deletion_requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create deletion completion log (NO FK cascade - survives user deletion)
CREATE TABLE IF NOT EXISTS public.deletion_completion_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL, -- NO FK, just a record
  request_id uuid, -- Link to the request if available
  completed_at timestamptz NOT NULL DEFAULT now(),
  retry_attempts int NOT NULL DEFAULT 0
);

-- Index for compliance queries (show completion within 45 days)
CREATE INDEX IF NOT EXISTS idx_deletion_completion_user 
ON public.deletion_completion_log(user_id, completed_at);

-- RLS: service_role only
ALTER TABLE public.deletion_completion_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.deletion_completion_log IS 'PII-free record of completed deletions for compliance (45-day CCPA proof). No FK cascade - survives user deletion.';
