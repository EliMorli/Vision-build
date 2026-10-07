// Supabase Edge Function: generate-design
// Calls Replicate (SDXL) to generate renovation design images.
//
// Required secrets:
//   REPLICATE_API_TOKEN
//   SUPABASE_SERVICE_ROLE_KEY (auto-available)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth, verifyProjectOwnership, getServiceRoleClient } from "../_shared/auth.ts";
import { checkRateLimit, recordUsage } from "../_shared/rate-limit.ts";

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

    const { projectId, stylePrompt, roomAnalysis } = await req.json();

    if (!projectId || !stylePrompt) {
      return new Response(
        JSON.stringify({ error: "Missing projectId or stylePrompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project ownership
    const ownershipResult = await verifyProjectOwnership(anonClient, userId, projectId);
    if (ownershipResult instanceof Response) {
      return ownershipResult;
    }
    const { project } = ownershipResult;

    // Check rate limit
    const rateLimitResult = await checkRateLimit(anonClient, userId, "generate-design");
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Now use service role client for operations
    const supabase = getServiceRoleClient();

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;

    const prompt = `Redesign this room with a ${stylePrompt}.
Current room analysis: ${roomAnalysis || "a residential room"}.
CRITICAL: PRESERVE the exact room layout (walls, windows, doors stay in place).
Only change surfaces, finishes, fixtures, furniture, and decor.
Professional interior design rendering, photorealistic, well-lit, high detail.`;

    // Generate 4 images using Replicate SDXL
    const generatedUrls: string[] = [];

    for (let i = 0; i < 4; i++) {
      // Create a prediction on Replicate
      const createRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // SDXL
          input: {
            prompt: prompt,
            image: project.original_image_url,
            num_outputs: 1,
            guidance_scale: 7.5,
            prompt_strength: 0.65, // Lower = preserves more of original structure
            num_inference_steps: 40,
            width: 1024,
            height: 1024,
          },
        }),
      });

      const prediction = await createRes.json();

      // Poll for completion
      let result = prediction;
      while (result.status !== "succeeded" && result.status !== "failed") {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } }
        );
        result = await pollRes.json();
      }

      if (result.status === "succeeded" && result.output?.length > 0) {
        // Download the image and upload to Supabase Storage
        const imageRes = await fetch(result.output[0]);
        const imageBlob = await imageRes.blob();
        const imagePath = `${userId}/generations/${projectId}/gen_${i}.png`;

        await supabase.storage
          .from("room-photos")
          .upload(imagePath, imageBlob, {
            contentType: "image/png",
            upsert: true,
          });

        // Generate a signed URL (valid for 1 year)
        const { data: signedData } = await supabase.storage
          .from("room-photos")
          .createSignedUrl(imagePath, 365 * 24 * 60 * 60);

        if (signedData) {
          generatedUrls.push(signedData.signedUrl);
        }
      }
    }

    // Update the project
    await supabase
      .from("projects")
      .update({
        generated_image_urls: generatedUrls,
        selected_style: stylePrompt,
        status: "generated",
      })
      .eq("id", projectId);

    // Record usage
    await recordUsage(anonClient, userId, "generate-design");

    return new Response(
      JSON.stringify({ success: true, generatedUrls }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
