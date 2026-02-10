// Supabase Edge Function: generate-design
// Calls Replicate (SDXL) to generate renovation design images.
//
// Required secrets:
//   REPLICATE_API_TOKEN
//   SUPABASE_SERVICE_ROLE_KEY (auto-available)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId, stylePrompt, roomAnalysis } = await req.json();

    if (!projectId || !stylePrompt) {
      return new Response(
        JSON.stringify({ error: "Missing projectId or stylePrompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the project to find the original image
    const { data: project } = await supabase
      .from("projects")
      .select("original_image_url, user_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        const imagePath = `${project.user_id}/generations/${projectId}/gen_${i}.png`;

        await supabase.storage
          .from("room-photos")
          .upload(imagePath, imageBlob, {
            contentType: "image/png",
            upsert: true,
          });

        const { data: urlData } = supabase.storage
          .from("room-photos")
          .getPublicUrl(imagePath);

        generatedUrls.push(urlData.publicUrl);
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
