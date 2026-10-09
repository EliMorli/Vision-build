import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, verifyProjectOwnership, getServiceRoleClient } from "../_shared/auth.ts";
import { MIME_TYPES, tagAsAiGenerated } from "../_shared/ai-provenance.ts";

interface SetVisibilityPayload {
  projectId: string;
  isPublic: boolean;
}

export interface SetVisibilityDeps {
  supabase: any;
  verifyAuth: (req: Request) => Promise<{ anonClient: any; userId: string } | Response>;
  verifyOwnership: (client: any, userId: string, projectId: string) => Promise<{ project: any } | Response>;
  logger: {
    log: (message: string) => void;
    error: (message: string, ...args: any[]) => void;
    warn: (message: string) => void;
  };
}

function normalizeToPath(value: string): string {
  // If it's already a path (no protocol), return as-is
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return value;
  }
  
  // Parse URL and extract path
  try {
    const url = new URL(value);
    // Remove leading slash and extract the object path
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/[^/]+\/(.*)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    // Fallback: just remove leading slash
    return url.pathname.replace(/^\//, '');
  } catch {
    // If URL parsing fails, return as-is
    return value;
  }
}

export async function handleSetVisibility(
  userId: string,
  payload: SetVisibilityPayload,
  project: any,
  deps: SetVisibilityDeps
): Promise<Response> {
  const { projectId, isPublic } = payload;

  // Update is_public in database
  const { error: updateError } = await deps.supabase
    .from("projects")
    .update({ is_public: isPublic })
    .eq("id", projectId);

  if (updateError) {
    deps.logger.error("Failed to update project visibility:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to update project", details: updateError.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  // Handle file copy/removal
  if (isPublic) {
    // PRIVACY: Copy ONLY generated design images to public-designs, NEVER original_image_url (original room photo)
    const filesToCopy = [];
    
    // Add selected_generation_url (the final selected design)
    if (project.selected_generation_url) {
      const normalized = normalizeToPath(project.selected_generation_url);
      // Skip if it's the original_image_url or contains 'original'
      if (normalized !== project.original_image_url && !normalized.includes("original")) {
        filesToCopy.push(normalized);
      } else {
        deps.logger.warn(`Skipping selected_generation_url copy (matches original_image_url or is original): ${normalized}`);
      }
    }
    
    // Add any generated_image_urls (array of all generated designs)
    if (project.generated_image_urls && Array.isArray(project.generated_image_urls)) {
      for (const url of project.generated_image_urls) {
        if (url && typeof url === "string") {
          const normalized = normalizeToPath(url);
          // Skip if it's the original_image_url or contains 'original'
          if (normalized === project.original_image_url || normalized.includes("original")) {
            deps.logger.warn(`Skipping generated image copy (matches original_image_url or is original): ${normalized}`);
            continue;
          }
          
          // Keep full storage path (do NOT split('/').pop())
          // Paths should be like "userId/projectId/design-1.jpg"
          filesToCopy.push(normalized);
        }
      }
    }

    for (const path of filesToCopy) {
      try {
        // Download from room-photos
        const { data: fileData, error: downloadError } = await deps.supabase.storage
          .from("room-photos")
          .download(path);

        if (downloadError) {
          deps.logger.error(`Failed to download ${path}:`, downloadError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to make project public", 
              details: `Could not download ${path}: ${downloadError.message}` 
            }),
            { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
          );
        }

        // Label the public copy as AI-generated (IPTC DigitalSourceType
        // trainedAlgorithmicMedia in embedded XMP). Metadata only: pixel data is
        // copied byte for byte, so invisible watermarks (Gemini SynthID) survive.
        const source = new Uint8Array(await fileData.arrayBuffer());
        const tag = tagAsAiGenerated(source);
        let publicCopy: Blob = fileData;
        let contentType: string = fileData.type;
        if (tag.tagged && tag.format !== "unknown") {
          contentType = MIME_TYPES[tag.format];
          publicCopy = new Blob([tag.bytes as BlobPart], { type: contentType });
        } else {
          deps.logger.warn(`Copying ${path} without the AI metadata tag (${tag.reason ?? "not tagged"})`);
        }

        // Upload to public-designs (same path)
        const { error: uploadError } = await deps.supabase.storage
          .from("public-designs")
          .upload(path, publicCopy, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          deps.logger.error(`Failed to upload ${path} to public-designs:`, uploadError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to make project public", 
              details: `Could not upload ${path}: ${uploadError.message}` 
            }),
            { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
          );
        }
        
        deps.logger.log(`Successfully copied ${path} to public-designs`);
      } catch (err: any) {
        deps.logger.error(`Error copying ${path}:`, err);
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
    
    // Add selected_generation_url (normalize and keep full path)
    if (project.selected_generation_url) {
      filesToRemove.push(normalizeToPath(project.selected_generation_url));
    }
    
    // Add generated_image_urls (normalize and keep full paths)
    if (project.generated_image_urls && Array.isArray(project.generated_image_urls)) {
      for (const url of project.generated_image_urls) {
        if (url && typeof url === "string") {
          filesToRemove.push(normalizeToPath(url));
        }
      }
    }
    
    // Defensively remove original_image_url in case it was copied before this fix
    if (project.original_image_url) {
      filesToRemove.push(normalizeToPath(project.original_image_url));
    }

    if (filesToRemove.length > 0) {
      const { error: removeError } = await deps.supabase.storage
        .from("public-designs")
        .remove(filesToRemove);

      if (removeError) {
        deps.logger.error("Failed to remove files from public-designs:", removeError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to make project private", 
            details: `Could not remove files: ${removeError.message}` 
          }),
          { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }
      
      deps.logger.log(`Successfully removed ${filesToRemove.length} files from public-designs`);
    }
  }

  return new Response(
    JSON.stringify({ success: true, projectId, isPublic }),
    { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
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

    const deps: SetVisibilityDeps = {
      supabase: getServiceRoleClient(),
      verifyAuth,
      verifyOwnership: verifyProjectOwnership,
      logger: {
        log: (message: string) => console.log(message),
        error: (message: string, ...args: any[]) => console.error(message, ...args),
        warn: (message: string) => console.warn(message),
      },
    };

    return await handleSetVisibility(userId, payload, project, deps);
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
