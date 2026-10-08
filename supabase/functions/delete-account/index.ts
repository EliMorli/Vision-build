// Supabase Edge Function: delete-account
// Permanently deletes a user's account and all associated data (authenticated users)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth, getServiceRoleClient } from "../_shared/auth.ts";
import { deleteUserData } from "../_shared/delete-user-data.ts";

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

    // Get user details for deletion
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Failed to get user details");
    }

    // Execute deletion using shared module
    await deleteUserData({
      userId,
      userEmail: user.email || "",
      userAppMetadata: user.app_metadata || {},
      userIdentities: user.identities || [],
      supabase,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("delete-account error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
