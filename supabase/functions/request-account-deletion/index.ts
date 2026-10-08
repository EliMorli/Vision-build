// Supabase Edge Function: request-account-deletion
// Creates a secure token-based deletion request for signed-out users

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/auth.ts";

export interface RequestDeletionDeps {
  supabase: any;
  clock: { now: () => Date };
  env: {
    resendApiKey?: string;
    appEnv?: string;
    baseUrl?: string;
  };
  emailSender: (params: {
    apiKey: string;
    to: string;
    subject: string;
    html: string;
  }) => Promise<{ ok: boolean; status: number; text: string }>;
  logger: {
    log: (message: string) => void;
    error: (message: string, ...args: any[]) => void;
  };
  crypto: {
    getRandomBytes: (length: number) => Uint8Array;
    sha256: (data: Uint8Array) => Promise<Uint8Array>;
  };
}

interface RateLimitCheckResult {
  limited: boolean;
  reason?: string;
}

async function checkAnonRateLimit(
  supabase: any,
  email: string,
  ipAddress: string | null,
  clock: { now: () => Date }
): Promise<RateLimitCheckResult> {
  const windowStart = new Date(clock.now().getTime() - 60 * 60 * 1000).toISOString();
  
  // Check email-based rate limit (max 3 requests per hour per email)
  const { data: emailRequests } = await supabase
    .from("account_deletion_requests")
    .select("id")
    .eq("email", email.toLowerCase())
    .gte("created_at", windowStart);

  if ((emailRequests?.length ?? 0) >= 3) {
    return { limited: true, reason: "email" };
  }

  // Check IP-based rate limit if IP available (max 10 requests per hour per IP)
  if (ipAddress) {
    const { data: ipRequests } = await supabase
      .from("account_deletion_requests")
      .select("id")
      .eq("ip_address", ipAddress)
      .gte("created_at", windowStart);

    if ((ipRequests?.length ?? 0) >= 10) {
      return { limited: true, reason: "ip" };
    }
  }

  return { limited: false };
}

async function lookupUserByEmail(
  supabase: any,
  email: string
): Promise<{ exists: boolean }> {
  const { data: userIdResult } = await supabase.rpc(
    "get_user_id_by_email",
    { user_email: email }
  );
  
  return { exists: !!userIdResult };
}

export async function handleRequestDeletion(
  payload: { email: string; note?: string },
  ipAddress: string | null,
  deps: RequestDeletionDeps
): Promise<Response> {
  const NEUTRAL_RESPONSE = {
    success: true,
    message: "If an account exists for that email, we sent a confirmation link. Check your inbox.",
  };

  if (!payload.email || typeof payload.email !== "string" || !payload.email.includes("@")) {
    return new Response(
      JSON.stringify({ error: "Invalid email address" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const normalizedEmail = payload.email.toLowerCase().trim();

  // Check rate limits
  const rateLimitResult = await checkAnonRateLimit(deps.supabase, normalizedEmail, ipAddress, deps.clock);
  if (rateLimitResult.limited) {
    // Return neutral response to prevent enumeration
    return new Response(
      JSON.stringify(NEUTRAL_RESPONSE),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Look up user to determine if we should send email
  const userLookup = await lookupUserByEmail(deps.supabase, normalizedEmail);

  // Generate a secure random token (32 bytes = 64 hex chars)
  const tokenBytes = deps.crypto.getRandomBytes(32);
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Hash the token with SHA-256
  const encoder = new TextEncoder();
  const tokenData = encoder.encode(token);
  const hashBuffer = await deps.crypto.sha256(tokenData);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Create deletion request only if user exists
  if (userLookup.exists) {
    const { error: insertError } = await deps.supabase
      .from("account_deletion_requests")
      .insert({
        email: normalizedEmail,
        token_hash: tokenHash,
        status: "pending",
        ip_address: ipAddress,
        note: payload.note || null,
      });

    if (insertError) {
      deps.logger.error("Failed to create deletion request:", insertError);
    }
  }

  // Handle email sending
  const appEnv = (deps.env.appEnv || "").toLowerCase();
  const isDev = appEnv === "development";
  const isStaging = appEnv === "staging";
  const isProd = !isDev && !isStaging;
  const baseUrl = deps.env.baseUrl || "https://visionbuild.app";
  const confirmUrl = `${baseUrl}/delete-account/confirm?token=${token}`;

  if (!deps.env.resendApiKey) {
    if (isProd) {
      // Production without RESEND_API_KEY: fail closed, never log token
      deps.logger.error("SECURITY: RESEND_API_KEY not set in production - cannot send deletion emails");
      return new Response(
        JSON.stringify({ error: "Email service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (isDev) {
      // Development: log the link
      deps.logger.log(`[DEV MODE] Account deletion confirmation link for ${normalizedEmail}:`);
      deps.logger.log(confirmUrl);
    }
    // Staging: do NOT log the link
    
    return new Response(
      JSON.stringify(NEUTRAL_RESPONSE),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Send email only if user exists
  if (userLookup.exists) {
    try {
      const emailResult = await deps.emailSender({
        apiKey: deps.env.resendApiKey,
        to: normalizedEmail,
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
      });

      if (!emailResult.ok) {
        deps.logger.error("Resend API error:", emailResult.status, emailResult.text);
      }
    } catch (emailError: any) {
      deps.logger.error("Failed to send confirmation email:", emailError.message);
    }
  }

  // Always return the same success message to prevent enumeration
  return new Response(
    JSON.stringify(NEUTRAL_RESPONSE),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;

    const deps: RequestDeletionDeps = {
      supabase: getServiceRoleClient(),
      clock: { now: () => new Date() },
      env: {
        resendApiKey: Deno.env.get("RESEND_API_KEY"),
        appEnv: Deno.env.get("APP_ENV"),
        baseUrl: Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || "https://visionbuild.app",
      },
      emailSender: async (params) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${params.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "VisionBuild <noreply@visionbuild.app>",
            to: [params.to],
            subject: params.subject,
            html: params.html,
          }),
        });
        return { ok: res.ok, status: res.status, text: await res.text() };
      },
      logger: {
        log: (message: string) => console.log(message),
        error: (message: string, ...args: any[]) => console.error(message, ...args),
      },
      crypto: {
        getRandomBytes: (length: number) => {
          const bytes = new Uint8Array(length);
          crypto.getRandomValues(bytes);
          return bytes;
        },
        sha256: async (data: Uint8Array) => {
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          return new Uint8Array(hashBuffer);
        },
      },
    };

    return await handleRequestDeletion(payload, ipAddress, deps);
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
