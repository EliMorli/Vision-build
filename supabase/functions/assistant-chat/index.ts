// Supabase Edge Function: assistant-chat
// Server-side Vi chat with auth, ownership check, and rate limiting
//
// Required secrets:
//   AI_API_KEY (or OPENAI_API_KEY for backward compatibility)
// Optional:
//   AI_BASE_URL (default: https://openrouter.ai/api/v1)
//   AI_MODEL_CHAT (default: anthropic/claude-3.5-sonnet)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { checkRateLimit, recordUsage } from "../_shared/rate-limit.ts";
import { viChat } from "../_shared/ai.ts";

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

    // Check rate limit (generous limit for chat)
    const rateLimitResult = await checkRateLimit(anonClient, userId, "assistant-chat", 50);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { conversationHistory, userMessage, projectId } = await req.json();

    if (!userMessage || typeof userMessage !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid userMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional: Verify project ownership if projectId is provided
    if (projectId) {
      const { data: project } = await anonClient
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();

      if (!project) {
        return new Response(
          JSON.stringify({ error: "Project not found or access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Call Vi chat
    const response = await viChat(
      conversationHistory || [],
      userMessage
    );

    // Record usage
    await recordUsage(anonClient, userId, "assistant-chat");

    return new Response(
      JSON.stringify({
        success: true,
        response,
        timestamp: Date.now(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("assistant-chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
