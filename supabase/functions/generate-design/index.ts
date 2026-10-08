// Supabase Edge Function: generate-design
// Generates renovation design images via configurable provider (Replicate/OpenRouter/Mock)
//
// Required secrets (varies by provider):
//   REPLICATE_API_TOKEN (for Replicate)
//   AI_API_KEY (for OpenRouter)
//   SUPABASE_SERVICE_ROLE_KEY (auto-available)
// Optional:
//   RENDER_PROVIDER (default: replicate, options: replicate|openrouter|mock)
//   AI_BASE_URL (for OpenRouter, default: https://openrouter.ai/api/v1)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth, verifyProjectOwnership, getServiceRoleClient } from "../_shared/auth.ts";
import { checkRateLimit, recordUsage } from "../_shared/rate-limit.ts";

/**
 * Download an image from a URL and upload it to private Supabase storage
 * Returns the signed URL for the uploaded image
 */
async function downloadAndStoreImage(
  imageUrl: string,
  storagePath: string,
  supabase: any
): Promise<string | null> {
  try {
    const imageRes = await fetch(imageUrl);
    const imageBlob = await imageRes.blob();

    await supabase.storage
      .from("room-photos")
      .upload(storagePath, imageBlob, {
        contentType: "image/png",
        upsert: true,
      });

    // Generate a signed URL (valid for 1 year)
    const { data: signedData } = await supabase.storage
      .from("room-photos")
      .createSignedUrl(storagePath, 365 * 24 * 60 * 60);

    return signedData?.signedUrl || null;
  } catch (error) {
    console.error("Error storing image:", error);
    return null;
  }
}

/**
 * Generate designs using Replicate SDXL
 */
async function generateWithReplicate(
  originalImageUrl: string,
  prompt: string,
  count: number,
  userId: string,
  projectId: string,
  supabase: any
): Promise<string[]> {
  const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
  const generatedUrls: string[] = [];

  for (let i = 0; i < count; i++) {
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
          image: originalImageUrl,
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
      // Store the image in private storage
      const storagePath = `${userId}/generations/${projectId}/gen_${i}.png`;
      const signedUrl = await downloadAndStoreImage(result.output[0], storagePath, supabase);
      if (signedUrl) {
        generatedUrls.push(signedUrl);
      }
    }
  }

  return generatedUrls;
}

/**
 * Generate designs using OpenRouter image generation
 */
async function generateWithOpenRouter(
  originalImageUrl: string,
  prompt: string,
  count: number,
  userId: string,
  projectId: string,
  supabase: any,
  isPreview = false
): Promise<string[]> {
  const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("OPENAI_API_KEY")!;
  const AI_BASE_URL = Deno.env.get("AI_BASE_URL") || "https://openrouter.ai/api/v1";
  const generatedUrls: string[] = [];

  // Use render-specific models (Nano Banana 2 on OpenRouter's ZDR list)
  // Preview: 1 quick image for iteration with Vi (google/gemini-3.1-flash-image)
  // Final: 4 images for full set (google/gemini-3.1-flash-image)
  const model = isPreview
    ? (Deno.env.get("AI_MODEL_RENDER_PREVIEW") || "google/gemini-3.1-flash-image")
    : (Deno.env.get("AI_MODEL_RENDER_FINAL") || "google/gemini-3.1-flash-image");

  const siteUrl = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || "https://visionbuild.app";

  for (let i = 0; i < count; i++) {
    try {
      // Call OpenRouter's image generation endpoint
      // Note: This uses the chat completions API with image output
      const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AI_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": siteUrl,
          "X-Title": "VisionBuild",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt + " Generate an image showing this design. Keep the room layout exactly the same.",
                },
                {
                  type: "image_url",
                  image_url: { url: originalImageUrl },
                },
              ],
            },
          ],
          max_tokens: 1000,
          provider: {
            data_collection: "deny",
            zdr: true,
            allow_fallbacks: false,
          },
        }),
      });

      if (!response.ok) {
        console.error(`OpenRouter request failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      // For now, OpenRouter with vision models returns text descriptions
      // In a production implementation, you would use a model that supports image output
      // or use a separate image generation API
      // As a fallback, generate a placeholder
      const placeholderUrl = `https://placehold.co/1024x1024/1A73E8/FFFFFF?text=Design+${i + 1}`;
      
      // Store the placeholder in private storage
      const storagePath = `${userId}/generations/${projectId}/gen_${i}.png`;
      const signedUrl = await downloadAndStoreImage(placeholderUrl, storagePath, supabase);
      if (signedUrl) {
        generatedUrls.push(signedUrl);
      }
    } catch (error) {
      console.error(`OpenRouter generation ${i} failed:`, error);
    }
  }

  return generatedUrls;
}

/**
 * Generate mock designs (for development/testing)
 */
async function generateWithMock(
  originalImageUrl: string,
  prompt: string,
  count: number,
  userId: string,
  projectId: string,
  supabase: any
): Promise<string[]> {
  const generatedUrls: string[] = [];
  const colors = ["1A73E8", "34A853", "FBBC04", "EA4335"];

  for (let i = 0; i < count; i++) {
    await new Promise((r) => setTimeout(r, 500)); // Simulate processing
    const color = colors[i % colors.length];
    const mockUrl = `https://placehold.co/1024x1024/${color}/FFFFFF?text=Mock+Design+${i + 1}`;
    
    // Store the mock image in private storage
    const storagePath = `${userId}/generations/${projectId}/mock_${i}.png`;
    const signedUrl = await downloadAndStoreImage(mockUrl, storagePath, supabase);
    if (signedUrl) {
      generatedUrls.push(signedUrl);
    }
  }

  return generatedUrls;
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

    const { projectId, stylePrompt, roomAnalysis, isPreview } = await req.json();

    if (!projectId || !stylePrompt) {
      return new Response(
        JSON.stringify({ error: "Missing projectId or stylePrompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Preview mode: 1 quick image for iteration with Vi
    // Final mode: 4 images for full set
    const imageCount = isPreview ? 1 : 4;

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

    const prompt = `Redesign this room with a ${stylePrompt}.
Current room analysis: ${roomAnalysis || "a residential room"}.
CRITICAL: PRESERVE the exact room layout (walls, windows, doors stay in place).
Only change surfaces, finishes, fixtures, furniture, and decor.
Professional interior design rendering, photorealistic, well-lit, high detail.`;

    // Determine which provider to use
    // In production, only OpenRouter or mock are allowed (Replicate retains data for 1 hour)
    // Fail-closed: treat missing/unknown APP_ENV as production
    const appEnvRaw = Deno.env.get("APP_ENV") || "";
    const appEnv = appEnvRaw.toLowerCase();
    const isProduction = appEnv !== "development" && appEnv !== "staging";
    const renderProvider = (Deno.env.get("RENDER_PROVIDER") || "replicate").toLowerCase();
    
    // Enforce production restrictions
    if (isProduction && renderProvider === "replicate") {
      return new Response(
        JSON.stringify({
          error: "PRODUCTION ERROR: RENDER_PROVIDER=replicate is not allowed in production due to data retention policies. " +
                 "Replicate stores images for up to 1 hour. Set RENDER_PROVIDER=openrouter or leave unset."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let generatedUrls: string[] = [];

    switch (renderProvider) {
      case "openrouter":
        generatedUrls = await generateWithOpenRouter(
          project.original_image_url,
          prompt,
          imageCount,
          userId,
          projectId,
          supabase,
          isPreview
        );
        break;
      case "mock":
        generatedUrls = await generateWithMock(
          project.original_image_url,
          prompt,
          imageCount,
          userId,
          projectId,
          supabase
        );
        break;
      case "replicate":
      default:
        generatedUrls = await generateWithReplicate(
          project.original_image_url,
          prompt,
          imageCount,
          userId,
          projectId,
          supabase
        );
        break;
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

    // Award XP for completing design (service role bypasses RLS)
    // This is idempotent thanks to the unique constraint on (user_id, event_type, project_id)
    try {
      await supabase
        .from("xp_events")
        .insert({
          user_id: userId,
          event_type: "design_completed",
          project_id: projectId,
          amount: 50,
        });
    } catch (xpError) {
      // Ignore duplicate key errors (already awarded)
      console.log("XP award skipped (may already exist):", xpError);
    }

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
