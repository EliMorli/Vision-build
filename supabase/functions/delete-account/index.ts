// Supabase Edge Function: delete-account
// Permanently deletes a user's account and all associated data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SignJWT } from "https://deno.land/x/jose@v5.2.0/index.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth, getServiceRoleClient } from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { userId, anonClient } = authResult;

    const supabase = getServiceRoleClient();

    // ─── Delete storage objects ────────────────────────────

    // Delete from room-photos bucket
    const { data: roomPhotos } = await supabase.storage
      .from("room-photos")
      .list(userId);

    if (roomPhotos && roomPhotos.length > 0) {
      const paths = roomPhotos.map((file) => `${userId}/${file.name}`);
      await supabase.storage.from("room-photos").remove(paths);
    }

    // Delete from public-designs bucket (find by user_id in projects)
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId);

    if (projects && projects.length > 0) {
      for (const project of projects) {
        const { data: publicDesigns } = await supabase.storage
          .from("public-designs")
          .list(`${project.id}`);

        if (publicDesigns && publicDesigns.length > 0) {
          const paths = publicDesigns.map((file) => `${project.id}/${file.name}`);
          await supabase.storage.from("public-designs").remove(paths);
        }
      }
    }

    // ─── Delete database rows ──────────────────────────────
    // RLS + cascade delete handles most of these automatically,
    // but we delete explicitly for clarity and logging

    await supabase.from("leads").delete().eq("user_id", userId);
    await supabase.from("reports").delete().eq("user_id", userId);
    await supabase.from("consents").delete().eq("user_id", userId);
    await supabase.from("usage_events").delete().eq("user_id", userId);
    await supabase.from("projects").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    // ─── Revoke Apple Sign-In token (if applicable) ────────

    const APPLE_TEAM_ID = Deno.env.get("APPLE_TEAM_ID");
    const APPLE_KEY_ID = Deno.env.get("APPLE_KEY_ID");
    const APPLE_PRIVATE_KEY = Deno.env.get("APPLE_PRIVATE_KEY");
    const APPLE_CLIENT_ID = Deno.env.get("APPLE_CLIENT_ID");

    // Get user to check if they signed in with Apple
    const { data: { user } } = await anonClient.auth.getUser();
    const isAppleUser = user?.app_metadata?.provider === "apple";

    if (isAppleUser) {
      if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY || !APPLE_CLIENT_ID) {
        console.warn(
          "User signed in with Apple but Apple credentials not configured. Skipping token revocation. " +
          "Set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, and APPLE_CLIENT_ID to enable."
        );
      } else {
        try {
          // Generate client secret JWT (ES256) as required by Apple
          const now = Math.floor(Date.now() / 1000);
          
          // Import Apple private key
          const pemKey = APPLE_PRIVATE_KEY
            .replace(/\\n/g, "\n")
            .replace(/-----BEGIN PRIVATE KEY-----/, "")
            .replace(/-----END PRIVATE KEY-----/, "")
            .trim();
          
          const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
          
          const privateKey = await crypto.subtle.importKey(
            "pkcs8",
            binaryKey,
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["sign"]
          );

          // Build client secret JWT
          const clientSecret = await new SignJWT({
            iss: APPLE_TEAM_ID,
            iat: now,
            exp: now + 3600,
            aud: "https://appleid.apple.com",
            sub: APPLE_CLIENT_ID,
          })
            .setProtectedHeader({ alg: "ES256", kid: APPLE_KEY_ID })
            .sign(privateKey);

          // Get refresh token from user metadata or identities
          const refreshToken = user?.identities?.[0]?.refresh_token || 
                             user?.user_metadata?.provider_refresh_token;

          if (!refreshToken) {
            console.warn("No Apple refresh token found for user. Token revocation skipped.");
          } else {
            // Revoke the token
            const revokeRes = await fetch("https://appleid.apple.com/auth/revoke", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: APPLE_CLIENT_ID,
                client_secret: clientSecret,
                token: refreshToken,
                token_type_hint: "refresh_token",
              }),
            });

            if (!revokeRes.ok) {
              const errorText = await revokeRes.text();
              console.error("Apple token revocation failed:", revokeRes.status, errorText);
            } else {
              console.log("Apple token revoked successfully");
            }
          }
        } catch (appleErr: any) {
          console.error("Apple token revocation error:", appleErr.message);
        }
      }
    }

    // ─── Delete auth user ──────────────────────────────────

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw new Error(`Failed to delete auth user: ${deleteError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
