// Supabase Edge Function: analyze-room
// Sends a room photo to AI (OpenRouter/OpenAI) for structured analysis.
//
// Required secrets (set in Supabase Dashboard):
//   AI_API_KEY (or OPENAI_API_KEY for backward compatibility)
// Optional:
//   AI_BASE_URL (default: https://openrouter.ai/api/v1)
//   AI_MODEL_VISION (default: openai/gpt-4o-2024-11-20)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { isOwnRoomPhotoUrl } from "../_shared/validate.ts";
import { checkRateLimit, recordUsage } from "../_shared/rate-limit.ts";
import { analyzeRoom } from "../_shared/ai.ts";
import { checkAIConsent, consentRequiredResponse } from "../_shared/consent.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
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

    // Check AI consent BEFORE any processing
    const consentResult = await checkAIConsent(anonClient, userId);
    if (!consentResult.hasConsent) {
      return consentRequiredResponse(consentResult);
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(anonClient, userId, "analyze-room");
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only the caller's own private room photo may be sent to the AI provider
    if (!isOwnRoomPhotoUrl(
        imageUrl,
        [Deno.env.get("SUPABASE_URL"), Deno.env.get("PUBLIC_SUPABASE_URL")],
        userId,
      )) {
      return new Response(
        JSON.stringify({ error: "Invalid imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze room using shared AI module
    const analysis = await analyzeRoom(imageUrl);

    // Record usage
    await recordUsage(anonClient, userId, "analyze-room");

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
