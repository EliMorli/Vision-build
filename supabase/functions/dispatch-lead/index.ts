// Supabase Edge Function: dispatch-lead
// Uses OpenAI GPT-4o to generate the "Perfect Lead" email,
// finds matching contractors, and sends via Resend.
//
// Required secrets:
//   OPENAI_API_KEY
//   RESEND_API_KEY
//   SUPABASE_SERVICE_ROLE_KEY (auto-available)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      projectId,
      originalImageUrl,
      generatedImageUrl,
      zipCode,
      budgetRange,
      userName,
      roomType,
      preview, // if true, only generate the email + find contractors (no send)
    } = await req.json();

    if (!projectId || !zipCode || !budgetRange) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── Generate email with GPT-4o ────────────────────────

    const emailPrompt = `You are an expert construction project manager. You will receive two images:
"Current State" (Image A) and "Goal State" (Image B).

1. Compare the images. Identify the specific work required to transform from State A to State B.
2. Do NOT suggest structural changes (moving walls) unless the difference obviously requires it.
3. Draft a high-conversion email to a contractor that summarizes this job professionally.

Return ONLY valid JSON (no markdown):
{
  "subject": "New Lead: ${roomType} Remodel in ${zipCode} - Budget ${budgetRange}",
  "scopeOfWork": ["Flooring: Replace tile with hardwood/LVP", "Cabinets: Reface existing layout"],
  "projectType": "Kitchen Modernization",
  "body": "Full professional email body as a string."
}

Client: ${userName}, Zip: ${zipCode}, Budget: ${budgetRange}, Room: ${roomType}, Timeline: Flexible`;

    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text", text: emailPrompt },
        ],
      },
    ];

    // Attach images if available
    if (originalImageUrl) {
      messages[0].content.push(
        { type: "text", text: "Image A — Current State:" },
        { type: "image_url", image_url: { url: originalImageUrl } }
      );
    }
    if (generatedImageUrl) {
      messages[0].content.push(
        { type: "text", text: "Image B — Goal State:" },
        { type: "image_url", image_url: { url: generatedImageUrl } }
      );
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 1200,
      }),
    });

    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content ?? "";

    let emailData;
    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      emailData = JSON.parse(cleaned);
    } catch {
      emailData = {
        subject: `New Renovation Lead in ${zipCode}`,
        scopeOfWork: [],
        projectType: "Renovation",
        body: text,
      };
    }

    // ─── Find contractors ──────────────────────────────────

    const { data: contractors } = await supabase
      .from("contractors")
      .select("*")
      .eq("is_active", true)
      .eq("zip_code", zipCode)
      .limit(5);

    // If preview mode, return the email + contractors without sending
    if (preview) {
      return new Response(
        JSON.stringify({
          success: true,
          email: emailData,
          contractors: contractors ?? [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Dispatch leads ────────────────────────────────────

    const leadIds: string[] = [];

    for (const contractor of contractors ?? []) {
      // Create lead row
      const { data: lead } = await supabase
        .from("leads")
        .insert({
          project_id: projectId,
          user_id: (await supabase.from("projects").select("user_id").eq("id", projectId).single()).data?.user_id,
          contractor_id: contractor.id,
          email_subject: emailData.subject,
          email_body: emailData.body,
          original_image_url: originalImageUrl ?? "",
          generated_image_url: generatedImageUrl ?? "",
          budget_range: budgetRange,
          zip_code: zipCode,
          scope_of_work: emailData.scopeOfWork,
          status: "sent",
        })
        .select("id")
        .single();

      if (lead) leadIds.push(lead.id);

      // Send email via Resend
      if (RESEND_API_KEY && contractor.email) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "VisionBuild <leads@visionbuild.app>",
              to: [contractor.email],
              subject: emailData.subject,
              html: emailData.body
                .replace(/\n/g, "<br>")
                .replace(
                  /\[Contractor Name\]/g,
                  contractor.contact_name || contractor.business_name
                ),
            }),
          });
        } catch (emailErr: any) {
          console.error(`Failed to email ${contractor.email}:`, emailErr.message);
        }
      }
    }

    // Update project status
    await supabase
      .from("projects")
      .update({
        status: "connected",
        lead_info: {
          budgetRange,
          zipCode,
          projectBrief: emailData.body,
          matchedContractorIds: (contractors ?? []).map((c: any) => c.id),
          submittedAt: new Date().toISOString(),
        },
      })
      .eq("id", projectId);

    return new Response(
      JSON.stringify({ success: true, leadsCreated: leadIds.length, leadIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
