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
    const authResult = await verifyAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { anonClient, userId } = authResult;

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
    const projectResult = await verifyProjectOwnership(anonClient, userId, projectId);
    if (projectResult instanceof Response) {
      return projectResult;
    }
    const { project } = projectResult;

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
      // PRIVACY: Copy ONLY generated design images to public-designs, NEVER original_image_url (original room photo)
      const filesToCopy = [];
      
      // Add selected_generation_url (the final selected design)
      if (project.selected_generation_url) {
        // Skip if it's the original_image_url or contains 'original'
        if (project.selected_generation_url !== project.original_image_url && !project.selected_generation_url.includes("original")) {
          filesToCopy.push(project.selected_generation_url);
        } else {
          console.warn(`Skipping selected_generation_url copy (matches original_image_url or is original): ${project.selected_generation_url}`);
        }
      }
      
      // Add any generated_image_urls (array of all generated designs)
      if (project.generated_image_urls && Array.isArray(project.generated_image_urls)) {
        for (const url of project.generated_image_urls) {
          if (url && typeof url === "string") {
            // Skip if it's the original_image_url or contains 'original'
            if (url === project.original_image_url || url.includes("original")) {
              console.warn(`Skipping generated image copy (matches original_image_url or is original): ${url}`);
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
      // Remove from public-designs (generated designs + defensively remove original_image_url if it was copied)
      const filesToRemove = [];
      
      // Add selected_generation_url (keep full path)
      if (project.selected_generation_url) {
        filesToRemove.push(project.selected_generation_url);
      }
      
      // Add generated_image_urls (keep full paths, do NOT split)
      if (project.generated_image_urls && Array.isArray(project.generated_image_urls)) {
        for (const url of project.generated_image_urls) {
          if (url && typeof url === "string") {
            filesToRemove.push(url);
          }
        }
      }
      
      // Defensively remove original_image_url in case it was copied before this fix
      if (project.original_image_url) {
        filesToRemove.push(project.original_image_url);
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
