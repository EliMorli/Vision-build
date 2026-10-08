// Supabase Edge Function: confirm-account-deletion
// GET: Validates token and returns confirmation page data (does NOT delete)
// POST: Executes the actual deletion after user confirms via button

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/auth.ts";
import { deleteUserData, DeleteUserDataParams, DeleteUserDataResult } from "../_shared/delete-user-data.ts";

export interface ConfirmDeletionDeps {
  supabase: any;
  clock: { now: () => Date };
  deleteUser: (params: DeleteUserDataParams) => Promise<DeleteUserDataResult>;
  crypto: {
    sha256: (data: Uint8Array) => Promise<Uint8Array>;
  };
}

interface TokenValidationResult {
  valid: boolean;
  email?: string;
  requestId?: string;
  error?: string;
  expired?: boolean;
  used?: boolean;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}•••@${domain}`;
  }
  return `${local[0]}•••@${domain}`;
}

async function validateToken(
  token: string,
  deps: ConfirmDeletionDeps
): Promise<TokenValidationResult> {
  if (!token || token.length !== 64) {
    return {
      valid: false,
      error: "Invalid or missing confirmation token",
      expired: false,
      used: false,
    };
  }

  // Hash the provided token
  const encoder = new TextEncoder();
  const tokenData = encoder.encode(token);
  const hashBuffer = await deps.crypto.sha256(tokenData);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Find the deletion request
  const { data: request, error: fetchError } = await deps.supabase
    .from("account_deletion_requests")
    .select("*")
    .eq("token_hash", tokenHash)
    .single();

  if (fetchError || !request) {
    return {
      valid: false,
      error: "Invalid or expired confirmation link",
      expired: false,
      used: false,
    };
  }

  // Check if already used
  if (request.status === "completed") {
    return {
      valid: false,
      error: "This confirmation link has already been used",
      expired: false,
      used: true,
    };
  }

  // Check if expired
  const now = deps.clock.now();
  const expiresAt = new Date(request.expires_at);
  if (now > expiresAt) {
    // Mark as expired in DB
    await deps.supabase
      .from("account_deletion_requests")
      .update({ status: "expired" })
      .eq("id", request.id);

    return {
      valid: false,
      error: "This confirmation link has expired. Please submit a new deletion request.",
      expired: true,
      used: false,
    };
  }

  // Token is valid
  return {
    valid: true,
    email: request.email,
    requestId: request.id,
  };
}

export async function handleConfirmGet(
  token: string,
  deps: ConfirmDeletionDeps
): Promise<Response> {
  const validation = await validateToken(token, deps);

  if (!validation.valid) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: validation.error,
        expired: validation.expired,
        used: validation.used,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Look up user to check if they're an Apple user
  const { data: userIdResult } = await deps.supabase.rpc(
    "get_user_id_by_email",
    { user_email: validation.email }
  );

  let isAppleUser = false;
  if (userIdResult) {
    const { data: { user } } = await deps.supabase.auth.admin.getUserById(userIdResult);
    isAppleUser = user?.app_metadata?.provider === "apple";
  }

  // Return masked email for confirmation page
  return new Response(
    JSON.stringify({
      valid: true,
      email: maskEmail(validation.email!),
      isAppleUser,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export async function handleConfirmPost(
  token: string,
  appleAuthCode: string | undefined,
  deps: ConfirmDeletionDeps
): Promise<Response> {
  // Re-validate token
  const validation = await validateToken(token, deps);

  if (!validation.valid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: validation.error,
        expired: validation.expired,
        used: validation.used,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const requestId = validation.requestId!;
  const email = validation.email!;

  // Mark as confirmed (idempotent)
  await deps.supabase
    .from("account_deletion_requests")
    .update({
      status: "confirmed",
      confirmed_at: deps.clock.now().toISOString(),
    })
    .eq("id", requestId);

  // Look up user by email using the SECURITY DEFINER function
  const { data: userIdResult, error: lookupError } = await deps.supabase.rpc(
    "get_user_id_by_email",
    { user_email: email }
  );

  if (lookupError) {
    console.error(`Failed to lookup user by email ${email}:`, lookupError);
    return new Response(
      JSON.stringify({
        success: false,
        error: `User lookup failed: ${lookupError.message}`,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = userIdResult;

  if (!userId) {
    // No account found - mark as completed anyway
    await deps.supabase
      .from("account_deletion_requests")
      .update({
        status: "completed",
        completed_at: deps.clock.now().toISOString(),
      })
      .eq("id", requestId);

    console.log(`Deletion request completed for ${email} - no account found`);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Your account has been permanently deleted.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get user details for Apple token revocation
  const { data: { user }, error: userError } = await deps.supabase.auth.admin.getUserById(userId);

  if (userError || !user) {
    console.error(`Failed to get user details for ${userId}:`, userError);
    // Continue with deletion even if we can't get user details
  }

  // Execute deletion using shared module
  const result = await deps.deleteUser({
    userId,
    userEmail: email,
    userAppMetadata: user?.app_metadata || {},
    userIdentities: user?.identities || [],
    supabase: deps.supabase,
    appleAuthCode,
  });

  if (!result.success) {
    // Deletion failed - persist for retry
    const now = deps.clock.now();
    const nextRetryAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 minutes
    const errorCode = `${result.stage}:${result.error.substring(0, 50)}`;

    await deps.supabase
      .from("account_deletion_requests")
      .update({
        status: "failed_pending_retry",
        retry_attempts: 0,
        next_retry_at: nextRetryAt,
        last_error_code: errorCode,
        first_failed_at: now.toISOString(),
      })
      .eq("id", requestId);

    console.error(`Deletion failed for user ${userId} at stage ${result.stage}: ${result.error}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "We couldn't finish deleting your account. Some of your data may already be removed. Please try again.",
        canRetry: true,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Deletion succeeded - mark as completed
  await deps.supabase
    .from("account_deletion_requests")
    .update({
      status: "completed",
      completed_at: deps.clock.now().toISOString(),
    })
    .eq("id", requestId);

  const isAppleUser = user?.app_metadata?.provider === "apple";
  const needsManualDisconnect = isAppleUser && result.appleRevokeStatus.status !== 'success';

  return new Response(
    JSON.stringify({
      success: true,
      message: "Your account has been permanently deleted.",
      appleRevokeStatus: result.appleRevokeStatus,
      needsManualDisconnect,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing confirmation token" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const deps: ConfirmDeletionDeps = {
    supabase: getServiceRoleClient(),
    clock: { now: () => new Date() },
    deleteUser: deleteUserData,
    crypto: {
      sha256: async (data: Uint8Array) => {
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return new Uint8Array(hashBuffer);
      },
    },
  };

  try {
    // GET: Validate token and return page data (does NOT delete anything)
    if (req.method === "GET") {
      return await handleConfirmGet(token, deps);
    }

    // POST: Execute actual deletion
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const appleAuthCode = body.appleAuthCode;
      return await handleConfirmPost(token, appleAuthCode, deps);
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("confirm-account-deletion error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
