// Supabase Edge Function: get-project-images
// Returns short-lived signed URLs (1 hour) for a user's own project images
// Verifies ownership before generating URLs

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth, verifyProjectOwnership, getServiceRoleClient } from "../_shared/auth.ts";

interface GetProjectImagesPayload {
  projectId: string;
}

interface ProjectImages {
  original_image_url?: string | null;
  generated_image_urls?: string[] | null;
  selected_generation_url?: string | null;
}

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

    // Parse payload
    const { projectId } = await req.json() as GetProjectImagesPayload;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Missing projectId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project ownership
    const ownershipResult = await verifyProjectOwnership(anonClient, userId, projectId);
    if (ownershipResult instanceof Response) {
      return ownershipResult;
    }
    const { project } = ownershipResult;

    // Get service role client to generate signed URLs
    const supabase = getServiceRoleClient();
    
    const expiresIn = 3600; // 1 hour
    const signedUrls: ProjectImages = {};

    // Generate signed URL for original_image_url if it exists
    if (project.original_image_url) {
      const { data, error } = await supabase.storage
        .from("room-photos")
        .createSignedUrl(project.original_image_url, expiresIn);
      
      if (!error && data) {
        signedUrls.original_image_url = data.signedUrl;
      }
    }

    // Generate signed URLs for generated_image_urls if they exist
    if (project.generated_image_urls && Array.isArray(project.generated_image_urls)) {
      const signedGeneratedUrls: string[] = [];
      
      for (const path of project.generated_image_urls) {
        if (path && typeof path === "string") {
          const { data, error } = await supabase.storage
            .from("room-photos")
            .createSignedUrl(path, expiresIn);
          
          if (!error && data) {
            signedGeneratedUrls.push(data.signedUrl);
          }
        }
      }
      
      signedUrls.generated_image_urls = signedGeneratedUrls.length > 0 ? signedGeneratedUrls : null;
    }

    // Generate signed URL for selected_generation_url if it exists
    if (project.selected_generation_url) {
      const { data, error } = await supabase.storage
        .from("room-photos")
        .createSignedUrl(project.selected_generation_url, expiresIn);
      
      if (!error && data) {
        signedUrls.selected_generation_url = data.signedUrl;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        projectId,
        images: signedUrls,
        expiresIn,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("get-project-images error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get project images" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
