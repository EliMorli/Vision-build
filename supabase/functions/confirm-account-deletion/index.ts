// Supabase Edge Function: confirm-account-deletion
// Confirms a deletion request via token and executes the deletion

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SignJWT } from "https://deno.land/x/jose@v5.2.0/index.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token || token.length !== 64) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid or missing confirmation token",
          expired: false,
          used: false,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ 
          error: "Invalid or expired confirmation link",
          expired: false,
          used: false,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already used
    if (request.status === "completed") {
      return new Response(
        JSON.stringify({ 
          error: "This confirmation link has already been used",
          expired: false,
          used: true,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(request.expires_at);
    if (now > expiresAt) {
      await supabase
        .from("account_deletion_requests")
        .update({ status: "expired" })
        .eq("id", request.id);

      return new Response(
        JSON.stringify({ 
          error: "This confirmation link has expired. Please submit a new deletion request.",
          expired: true,
          used: false,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as confirmed
    await supabase
      .from("account_deletion_requests")
      .update({ 
        status: "confirmed", 
        confirmed_at: new Date().toISOString() 
      })
      .eq("id", request.id);

    // Find the user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    const user = users?.find((u: any) => u.email?.toLowerCase() === request.email.toLowerCase());

    if (!user) {
      // No account found - mark as completed anyway
      await supabase
        .from("account_deletion_requests")
        .update({ 
          status: "completed", 
          completed_at: new Date().toISOString() 
        })
        .eq("id", request.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "If an account existed, it has been deleted.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // ─── Execute the same deletion logic as in-app delete-account ───

    // Delete storage objects
    const { data: roomPhotos } = await supabase.storage
      .from("room-photos")
      .list(userId);

    if (roomPhotos && roomPhotos.length > 0) {
      const paths = roomPhotos.map((file) => `${userId}/${file.name}`);
      await supabase.storage.from("room-photos").remove(paths);
    }

    // Delete from public-designs bucket
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

    // Delete database rows (cascade will handle most)
    await supabase.from("leads").delete().eq("user_id", userId);
    await supabase.from("reports").delete().eq("user_id", userId);
    await supabase.from("consents").delete().eq("user_id", userId);
    await supabase.from("usage_events").delete().eq("user_id", userId);
    await supabase.from("projects").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    // Revoke Apple Sign-In token if applicable
    const isAppleUser = user?.app_metadata?.provider === "apple";
    if (isAppleUser) {
      const APPLE_TEAM_ID = Deno.env.get("APPLE_TEAM_ID");
      const APPLE_KEY_ID = Deno.env.get("APPLE_KEY_ID");
      const APPLE_PRIVATE_KEY = Deno.env.get("APPLE_PRIVATE_KEY");
      const APPLE_CLIENT_ID = Deno.env.get("APPLE_CLIENT_ID");

      if (APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY && APPLE_CLIENT_ID) {
        try {
          const now = Math.floor(Date.now() / 1000);
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

          const clientSecret = await new SignJWT({
            iss: APPLE_TEAM_ID,
            iat: now,
            exp: now + 3600,
            aud: "https://appleid.apple.com",
            sub: APPLE_CLIENT_ID,
          })
            .setProtectedHeader({ alg: "ES256", kid: APPLE_KEY_ID })
            .sign(privateKey);

          const refreshToken = user?.identities?.[0]?.refresh_token || 
                             user?.user_metadata?.provider_refresh_token;

          if (refreshToken) {
            await fetch("https://appleid.apple.com/auth/revoke", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: APPLE_CLIENT_ID,
                client_secret: clientSecret,
                token: refreshToken,
                token_type_hint: "refresh_token",
              }),
            });
          }
        } catch (appleErr: any) {
          console.error("Apple token revocation error:", appleErr.message);
        }
      }
    }

    // Delete auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw new Error(`Failed to delete auth user: ${deleteError.message}`);
    }

    // Mark deletion request as completed
    await supabase
      .from("account_deletion_requests")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString() 
      })
      .eq("id", request.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Your account has been permanently deleted.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("confirm-account-deletion error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process deletion" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
