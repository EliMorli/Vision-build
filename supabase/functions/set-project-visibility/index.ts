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
      // PRIVACY: Copy ONLY generated design images to public-designs, NEVER main_image (original room photo)
      const filesToCopy = [];
      
      // Add design_image (the final selected design)
      if (project.design_image) {
        // Skip if it's the main_image or contains 'original'
        if (project.design_image !== project.main_image && !project.design_image.includes("original")) {
          filesToCopy.push(project.design_image);
        } else {
          console.warn(`Skipping design_image copy (matches main_image or is original): ${project.design_image}`);
        }
      }
      
      // Add any generated_image_urls (array of all generated designs)
      if (project.generated_image_urls && Array.isArray(project.generated_image_urls)) {
        for (const url of project.generated_image_urls) {
          if (url && typeof url === "string") {
            // Skip if it's the main_image or contains 'original'
            if (url === project.main_image || url.includes("original")) {
              console.warn(`Skipping generated image copy (matches main_image or is original): ${url}`);
              continue;
            }
            
            // Keep full storage path (do NOT split('/').pop())
            // Paths should be like "userId/projectId/design-1.jpg"
            filesToCopy.push(url);
          }
        }
      }

      for (const path of filesToCopy) {
        try {
          // Download from room-photos
          const { data: fileData, error: downloadError } = await adminClient.storage
            .from("room-photos")
            .download(path);

          if (downloadError) {
            console.error(`Failed to download ${path}:`, downloadError);
            // Log error and fail instead of silently continuing
            return new Response(
              JSON.stringify({ 
                error: "Failed to make project public", 
                details: `Could not download ${path}: ${downloadError.message}` 
              }),
              { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
            );
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
            // Log error and fail instead of silently continuing
            return new Response(
              JSON.stringify({ 
                error: "Failed to make project public", 
                details: `Could not upload ${path}: ${uploadError.message}` 
              }),
              { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
            );
          }
          
          console.log(`Successfully copied ${path} to public-designs`);
        } catch (err: any) {
          console.error(`Error copying ${path}:`, err);
          return new Response(
            JSON.stringify({ 
              error: "Failed to make project public", 
              details: `Error copying ${path}: ${err.message}` 
            }),
            { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
          );
        }
      }
    } else {
      // Remove from public-designs (generated designs + defensively remove main_image if it was copied)
      const filesToRemove = [];
      
      // Add design_image (keep full path)
      if (project.design_image) {
        filesToRemove.push(project.design_image);
      }
      
      // Add generated_image_urls (keep full paths, do NOT split)
      if (project.generated_image_urls && Array.isArray(project.generated_image_urls)) {
        for (const url of project.generated_image_urls) {
          if (url && typeof url === "string") {
            filesToRemove.push(url);
          }
        }
      }
      
      // Defensively remove main_image in case it was copied before this fix
      if (project.main_image) {
        filesToRemove.push(project.main_image);
      }

      if (filesToRemove.length > 0) {
        const { error: removeError } = await adminClient.storage
          .from("public-designs")
          .remove(filesToRemove);

        if (removeError) {
          console.error("Failed to remove files from public-designs:", removeError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to make project private", 
              details: `Could not remove files: ${removeError.message}` 
            }),
            { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
          );
        }
        
        console.log(`Successfully removed ${filesToRemove.length} files from public-designs`);
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
