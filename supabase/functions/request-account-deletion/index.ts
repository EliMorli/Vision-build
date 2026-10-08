// Supabase Edge Function: request-account-deletion
// Creates a secure token-based deletion request for signed-out users

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/auth.ts";

// Rate limit helper (reuse pattern from rate-limit.ts but for anon requests)
async function checkAnonRateLimit(
  supabase: any,
  email: string,
  ipAddress: string | null
): Promise<Response | null> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour window
  
  // Check email-based rate limit (max 3 requests per hour per email)
  const { data: emailRequests } = await supabase
    .from("account_deletion_requests")
    .select("id")
    .eq("email", email.toLowerCase())
    .gte("created_at", windowStart);

  if ((emailRequests?.length ?? 0) >= 3) {
    return new Response(
      JSON.stringify({
        success: true, // Fail open to prevent enumeration
        message: "If an account exists for that email, we sent a confirmation link. Check your inbox.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check IP-based rate limit if IP available (max 10 requests per hour per IP)
  if (ipAddress) {
    const { data: ipRequests } = await supabase
      .from("account_deletion_requests")
      .select("id")
      .eq("ip_address", ipAddress)
      .gte("created_at", windowStart);

    if ((ipRequests?.length ?? 0) >= 10) {
      return new Response(
        JSON.stringify({
          success: true, // Fail open
          message: "If an account exists for that email, we sent a confirmation link. Check your inbox.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, note } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getServiceRoleClient();

    // Get IP address for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;

    // Check rate limits
    const rateLimitResult = await checkAnonRateLimit(supabase, normalizedEmail, ipAddress);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Generate a secure random token (32 bytes = 64 hex chars)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Hash the token with SHA-256
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", tokenData);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create deletion request
    const { error: insertError } = await supabase
      .from("account_deletion_requests")
      .insert({
        email: normalizedEmail,
        token_hash: tokenHash,
        status: "pending",
        ip_address: ipAddress,
        note: note || null,
      });

    if (insertError) {
      console.error("Failed to create deletion request:", insertError);
      // Return success message anyway to prevent enumeration
    }

    // Send confirmation email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const APP_ENV = (Deno.env.get("APP_ENV") || "").toLowerCase();
    const isDev = APP_ENV === "development" || APP_ENV === "staging";
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || "https://visionbuild.app";
    const confirmUrl = `${baseUrl}/delete-account/confirm?token=${token}`;

    if (!RESEND_API_KEY) {
      if (isDev) {
        // Log the link ONLY in development/staging, never in production
        console.log(`[DEV MODE] Account deletion confirmation link for ${normalizedEmail}:`);
        console.log(confirmUrl);
      } else {
        // Production without RESEND_API_KEY: fail closed with server error, no token logging
        console.error("SECURITY: RESEND_API_KEY not set in production - cannot send deletion emails");
        return new Response(
          JSON.stringify({ error: "Email service unavailable" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Dev/staging: return success message
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists for that email, we sent a confirmation link. Check your inbox.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    try {
      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "VisionBuild <noreply@visionbuild.app>", // Update with actual domain
          to: [normalizedEmail],
          subject: "Confirm your account deletion request",
          html: `
            <p>Hi,</p>
            <p>You requested to delete your VisionBuild account associated with this email address.</p>
            <p><strong>To confirm and permanently delete your account, click this link:</strong></p>
            <p><a href="${confirmUrl}">${confirmUrl}</a></p>
            <p>This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
            <p><strong>What gets deleted:</strong></p>
            <ul>
              <li>Your account and profile</li>
              <li>All your projects and designs</li>
              <li>Your chat history and messages</li>
            </ul>
            <p>This action cannot be undone.</p>
            <p>— VisionBuild</p>
          `,
        }),
      });

      if (!sendRes.ok) {
        const errorText = await sendRes.text();
        console.error("Resend API error:", sendRes.status, errorText);
      }
    } catch (emailError: any) {
      console.error("Failed to send confirmation email:", emailError.message);
    }

    // Always return the same success message to prevent email enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists for that email, we sent a confirmation link. Check your inbox.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("request-account-deletion error:", error);
    
    // Return success message even on error to prevent enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists for that email, we sent a confirmation link. Check your inbox.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
