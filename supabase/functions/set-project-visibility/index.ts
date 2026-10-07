import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, verifyProjectOwnership, getServiceRoleClient } from "../_shared/auth.ts";

interface SetVisibilityPayload {
  projectId: string;
  isPublic: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  try {
    // 1. Verify JWT and get userId
    const { supabase, userId } = await verifyAuth(req);

    // 2. Parse payload
    const payload: SetVisibilityPayload = await req.json();
    const { projectId, isPublic } = payload;

    if (!projectId || typeof isPublic !== "boolean") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid projectId or isPublic" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Verify project ownership
    const project = await verifyProjectOwnership(supabase, userId, projectId);

    // 4. Get service role client (admin)
    const adminClient = getServiceRoleClient();

    // 5. Update is_public in database
    const { error: updateError } = await adminClient
      .from("projects")
      .update({ is_public: isPublic })
      .eq("id", projectId);

    if (updateError) {
      console.error("Failed to update project visibility:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update project", details: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Handle file copy/removal
    if (isPublic) {
      // Copy main_image and design_image to public-designs
      const filesToCopy = [];
      if (project.main_image) filesToCopy.push(project.main_image);
      if (project.design_image) filesToCopy.push(project.design_image);

      for (const path of filesToCopy) {
        try {
          // Download from room-photos
          const { data: fileData, error: downloadError } = await adminClient.storage
            .from("room-photos")
            .download(path);

          if (downloadError) {
            console.error(`Failed to download ${path}:`, downloadError);
            continue;
          }

          // Upload to public-designs (same path)
          const { error: uploadError } = await adminClient.storage
            .from("public-designs")
            .upload(path, fileData, {
              contentType: fileData.type,
              upsert: true,
            });

          if (uploadError) {
            console.error(`Failed to upload ${path} to public-designs:`, uploadError);
          }
        } catch (err) {
          console.error(`Error copying ${path}:`, err);
        }
      }
    } else {
      // Remove from public-designs
      const filesToRemove = [];
      if (project.main_image) filesToRemove.push(project.main_image);
      if (project.design_image) filesToRemove.push(project.design_image);

      if (filesToRemove.length > 0) {
        const { error: removeError } = await adminClient.storage
          .from("public-designs")
          .remove(filesToRemove);

        if (removeError) {
          console.error("Failed to remove files from public-designs:", removeError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, projectId, isPublic }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: unknown) {
    console.error("set-project-visibility error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("Unauthorized") || message.includes("JWT") ? 401 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
