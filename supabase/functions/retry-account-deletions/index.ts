// Retry failed account deletions
// Called hourly via pg_cron to process failed deletions with exponential backoff

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteUserData, type DeleteUserDataParams } from "../_shared/delete-user-data.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Backoff schedule: 15min, 1h, 6h, 24h, then daily
const RETRY_DELAYS_MS = [
  15 * 60 * 1000,      // 15 minutes
  60 * 60 * 1000,      // 1 hour
  6 * 60 * 60 * 1000,  // 6 hours
  24 * 60 * 60 * 1000, // 24 hours
];

// Takes the NEW retry_attempts count (after increment) and returns delay for next retry
// attempts=1 (first retry) -> 15m, attempts=2 -> 1h, attempts=3 -> 6h, attempts=4 -> 24h, attempts=5+ -> daily
function getNextRetryDelay(attempts: number): number {
  // attempts is the new count after incrementing, so we use attempts-1 as the array index
  const index = attempts - 1;
  if (index >= 0 && index < RETRY_DELAYS_MS.length) {
    return RETRY_DELAYS_MS[index];
  }
  return 24 * 60 * 60 * 1000; // Daily after exhausting schedule
}

export interface RetryDeps {
  supabase: any;
  clock: { now: () => Date };
  deleteUser: (params: DeleteUserDataParams) => Promise<any>;
  sendAlert: (userId: string, attempts: number, errorCode: string, firstFailedAt: string) => Promise<void>;
  env: {
    resendApiKey?: string;
    opsAlertEmail?: string;
    alertFromEmail?: string;
  };
}

export interface RetryRequest {
  id: string;
  user_id: string;
  email: string;
  retry_attempts: number;
  next_retry_at: string;
  last_error_code: string | null;
  first_failed_at: string | null;
  alerted_at: string | null;
  status: string;
}

export interface RetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  alerted: number;
}

export async function handleRetry(requests: RetryRequest[], deps: RetryDeps): Promise<RetryResult> {
  const results: RetryResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    alerted: 0,
  };

  for (const request of requests) {
    results.processed++;
    
    console.log(`Retrying deletion for user ${request.user_id} (attempt ${request.retry_attempts + 1})`);

    // Get user details
    const { data: { user }, error: getUserError } = await deps.supabase.auth.admin.getUserById(request.user_id);

    if (getUserError || !user) {
      console.log(`User ${request.user_id} no longer exists, marking as completed`);
      await deps.supabase
        .from("account_deletion_requests")
        .update({
          status: "completed",
          completed_at: deps.clock.now().toISOString(),
        })
        .eq("id", request.id);
      results.succeeded++;
      continue;
    }

    // Attempt deletion
    const deleteResult = await deps.deleteUser({
      userId: request.user_id,
      userEmail: user.email!,
      userAppMetadata: user.app_metadata,
      userIdentities: user.identities || [],
      supabase: deps.supabase,
    });

    if (deleteResult.success) {
      console.log(`Successfully deleted user ${request.user_id} on retry`);
      
      // Mark request as completed
      await deps.supabase
        .from("account_deletion_requests")
        .update({
          status: "completed",
          completed_at: deps.clock.now().toISOString(),
        })
        .eq("id", request.id);
      
      // Log completion for compliance
      await deps.supabase.from("deletion_completion_log").insert({
        user_id: request.user_id,
        request_id: request.id,
        retry_attempts: request.retry_attempts + 1,
      });
      
      results.succeeded++;
    } else {
      const newAttempts = request.retry_attempts + 1;
      const nextRetryAt = new Date(deps.clock.now().getTime() + getNextRetryDelay(newAttempts)).toISOString();

      console.log(`Deletion failed for user ${request.user_id} (attempt ${newAttempts}): ${deleteResult.error}`);

      await deps.supabase
        .from("account_deletion_requests")
        .update({
          retry_attempts: newAttempts,
          next_retry_at: nextRetryAt,
          last_error_code: deleteResult.error,
          first_failed_at: request.first_failed_at || deps.clock.now().toISOString(),
        })
        .eq("id", request.id);

      results.failed++;

      // Check if we need to alert ops
      const daysSinceFirstFailed = request.first_failed_at
        ? (deps.clock.now().getTime() - new Date(request.first_failed_at).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      // Alert if attempts >= 5 OR first failure > 7 days ago
      if ((newAttempts >= 5 || daysSinceFirstFailed > 7) && !request.alerted_at) {
        await deps.sendAlert(request.user_id, newAttempts, deleteResult.error, request.first_failed_at || deps.clock.now().toISOString());
        
        // Mark as alerted
        await deps.supabase
          .from("account_deletion_requests")
          .update({ alerted_at: deps.clock.now().toISOString() })
          .eq("id", request.id);
        
        results.alerted++;
      }
    }
  }

  return results;
}

async function sendOpsAlert(userId: string, attempts: number, errorCode: string, firstFailedAt: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const OPS_ALERT_EMAIL = Deno.env.get("OPS_ALERT_EMAIL");
  const ALERT_FROM = Deno.env.get("ALERT_FROM_EMAIL");
  
  if (!RESEND_API_KEY) {
    console.warn(`Ops alert needed for user ${userId} but RESEND_API_KEY not set - skipping`);
    return;
  }

  if (!OPS_ALERT_EMAIL || !ALERT_FROM) {
    console.warn(`Ops alert needed for user ${userId} but OPS_ALERT_EMAIL or ALERT_FROM_EMAIL not set - skipping`);
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `VisionBuild Alerts <${ALERT_FROM}>`,
        to: [OPS_ALERT_EMAIL],
        subject: `[ALERT] Account deletion retry threshold exceeded`,
        html: `
          <h2>Account Deletion Retry Alert</h2>
          <p>A user deletion has exceeded the alert threshold:</p>
          <ul>
            <li><strong>User ID:</strong> ${userId}</li>
            <li><strong>Attempts:</strong> ${attempts}</li>
            <li><strong>Error Code:</strong> ${errorCode}</li>
            <li><strong>First Failed:</strong> ${firstFailedAt}</li>
          </ul>
          <p>Manual intervention may be required.</p>
        `,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to send ops alert for user ${userId}: ${response.status}`);
    } else {
      console.log(`Ops alert sent for user ${userId}`);
    }
  } catch (error: any) {
    console.error(`Error sending ops alert for user ${userId}:`, error.message);
  }
}

Deno.serve(async (req) => {
  // Require service role key or CRON_SECRET
  const authHeader = req.headers.get("Authorization");
  const cronSecret = req.headers.get("X-Cron-Secret");
  const expectedCronSecret = Deno.env.get("CRON_SECRET");

  // Exact match only (an empty key or substring match must never authorize)
  const hasServiceRole = !!SUPABASE_SERVICE_ROLE_KEY && authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  const hasValidCronSecret = expectedCronSecret && cronSecret === expectedCronSecret;

  if (!hasServiceRole && !hasValidCronSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Find deletion requests that are due for retry
    const now = new Date().toISOString();
    
    const { data: pendingDeletions, error: fetchError } = await supabase
      .from("account_deletion_requests")
      .select("*")
      .eq("status", "failed_pending_retry")
      .lte("next_retry_at", now)
      .order("next_retry_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Error fetching pending deletions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending deletions" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      console.log("No pending deletions to retry");
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending deletions" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingDeletions.length} deletion(s) to retry`);

    const results = await handleRetry(pendingDeletions, {
      supabase,
      clock: { now: () => new Date() },
      deleteUser: deleteUserData,
      sendAlert: sendOpsAlert,
      env: {
        resendApiKey: Deno.env.get("RESEND_API_KEY"),
        opsAlertEmail: Deno.env.get("OPS_ALERT_EMAIL"),
        alertFromEmail: Deno.env.get("ALERT_FROM_EMAIL"),
      },
    });

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Retry function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
