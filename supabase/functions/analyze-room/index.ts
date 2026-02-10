// Supabase Edge Function: analyze-room
// Sends a room photo to OpenAI GPT-4o for structured analysis.
//
// Required secrets (set in Supabase Dashboard):
//   OPENAI_API_KEY

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

    const prompt = `You are an expert interior designer and construction analyst. Analyze the provided room photo and return ONLY a valid JSON object (no markdown, no explanation) with this exact schema:

{
  "roomType": "kitchen|bathroom|bedroom|living_room|dining_room|office|other",
  "currentStyle": "a short style description, e.g. dated oak traditional",
  "estimatedSqFt": 150,
  "keyElements": ["oak cabinets", "tile flooring", "fluorescent lighting"],
  "rawAnalysis": "A 2-3 sentence human-readable summary of what you see."
}

Be specific about materials, finishes, and notable features. Estimate square footage based on visual cues.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    // Parse the JSON response
    let analysis;
    try {
      const cleaned = text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        roomType: "other",
        currentStyle: "unknown",
        estimatedSqFt: 0,
        keyElements: [],
        rawAnalysis: text,
      };
    }

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
