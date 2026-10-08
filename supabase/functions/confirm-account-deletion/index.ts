// Supabase Edge Function: confirm-account-deletion
// GET: Validates token and returns confirmation page data (does NOT delete)
// POST: Executes the actual deletion after user confirms via button

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/auth.ts";
import { deleteUserData } from "../_shared/delete-user-data.ts";

interface TokenValidationResult {
  valid: boolean;
  email?: string;
  requestId?: string;
  error?: string;
  expired?: boolean;
  used?: boolean;
}

async function validateToken(token: string): Promise<TokenValidationResult> {
  if (!token || token.length !== 64) {
    return {
      valid: false,
      error: "Invalid or missing confirmation token",
      expired: false,
      used: false,
    };
  }

  const supabase = getServiceRoleClient();

  // Hash the provided token
  const encoder = new TextEncoder();
  const tokenData = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", tokenData);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Find the deletion request
  const { data: request, error: fetchError } = await supabase
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
  const now = new Date();
  const expiresAt = new Date(request.expires_at);
  if (now > expiresAt) {
    // Mark as expired in DB
    await supabase
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

async function executeDeleteion(requestId: string, email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceRoleClient();

  // Mark as confirmed (idempotent)
  await supabase
    .from("account_deletion_requests")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  // Look up user by email using the SECURITY DEFINER function
  const { data: userIdResult, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { user_email: email }
  );

  if (lookupError) {
    console.error(`Failed to lookup user by email ${email}:`, lookupError);
    throw new Error(`User lookup failed: ${lookupError.message}`);
  }

  const userId = userIdResult;

  if (!userId) {
    // No account found - mark as completed anyway
    await supabase
      .from("account_deletion_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    console.log(`Deletion request completed for ${email} - no account found`);
    return { success: true };
  }

  // Get user details for Apple token revocation
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

  if (userError || !user) {
    console.error(`Failed to get user details for ${userId}:`, userError);
    // Continue with deletion even if we can't get user details
  }

  // Execute deletion using shared module
  try {
    await deleteUserData({
      userId,
      userEmail: email,
      userAppMetadata: user?.app_metadata || {},
      userIdentities: user?.identities || [],
      supabase,
    });

    // Mark deletion request as completed
    await supabase
      .from("account_deletion_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return { success: true };
  } catch (deleteError: any) {
    console.error(`Deletion failed for ${email} (${userId}):`, deleteError);
    return { success: false, error: deleteError.message };
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}•••@${domain}`;
  }
  return `${local[0]}•••@${domain}`;
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

  // GET: Validate token and return page data (does NOT delete anything)
  if (req.method === "GET") {
    try {
      const validation = await validateToken(token);

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

      // Return masked email for confirmation page
      return new Response(
        JSON.stringify({
          valid: true,
          email: maskEmail(validation.email!),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("Token validation error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to validate token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // POST: Execute actual deletion
  if (req.method === "POST") {
    try {
      // Re-validate token
      const validation = await validateToken(token);

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

      // Execute deletion
      const result = await executeDeleteion(validation.requestId!, validation.email!);

      if (!result.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error || "Failed to delete account",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Your account has been permanently deleted.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("Account deletion error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to process deletion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Method not allowed
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
