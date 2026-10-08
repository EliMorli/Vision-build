-- Migration 00011: Deletion retry tracking for failed account deletions
-- Ensures users who requested deletion still get deleted even if storage/network fails

-- Add retry status to account_deletion_requests
ALTER TABLE public.account_deletion_requests 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS retry_attempts int NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
ADD COLUMN IF NOT EXISTS last_error_code text,
ADD COLUMN IF NOT EXISTS first_failed_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS alerted_at timestamptz;

-- Add constraint for valid statuses
ALTER TABLE public.account_deletion_requests
DROP CONSTRAINT IF EXISTS account_deletion_requests_status_check;

ALTER TABLE public.account_deletion_requests
ADD CONSTRAINT account_deletion_requests_status_check
CHECK (status IN ('pending', 'confirmed', 'failed_pending_retry', 'completed', 'expired', 'used'));

-- Index for retry queries (service_role only accesses this)
CREATE INDEX IF NOT EXISTS idx_deletion_requests_retry 
ON public.account_deletion_requests(next_retry_at, status)
WHERE status = 'failed_pending_retry' AND next_retry_at IS NOT NULL;

-- Index for alert queries
CREATE INDEX IF NOT EXISTS idx_deletion_requests_alerts
ON public.account_deletion_requests(first_failed_at, retry_attempts)
WHERE status = 'failed_pending_retry';

COMMENT ON COLUMN public.account_deletion_requests.status IS 'pending: awaiting user confirmation, confirmed: user confirmed (legacy), failed_pending_retry: deletion failed and awaiting retry, completed: deletion succeeded, expired: token expired before confirmation, used: token was already used';
COMMENT ON COLUMN public.account_deletion_requests.retry_attempts IS 'Number of retry attempts made after initial failure';
COMMENT ON COLUMN public.account_deletion_requests.next_retry_at IS 'When to next attempt retry (NULL if not scheduled)';
COMMENT ON COLUMN public.account_deletion_requests.last_error_code IS 'Error code from last failure (no PII)';
COMMENT ON COLUMN public.account_deletion_requests.first_failed_at IS 'When the deletion first failed';
COMMENT ON COLUMN public.account_deletion_requests.completed_at IS 'When the deletion successfully completed';
