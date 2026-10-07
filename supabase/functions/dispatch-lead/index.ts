// Supabase Edge Function: dispatch-lead
// Uses OpenAI GPT-4o to generate the "Perfect Lead" email,
// finds matching contractors, and sends via Resend.
//
// Required secrets:
//   OPENAI_API_KEY
//   RESEND_API_KEY
//   BUSINESS_MAILING_ADDRESS (required for CAN-SPAM compliance)
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

    const {
      projectId,
      originalImageUrl,
      generatedImageUrl,
      zipCode,
      budgetRange,
      userName,
      roomType,
      fieldsToShare, // { name, email, phone, address, timeline }
      preview, // if true, only generate the email + find contractors (no send)
    } = await req.json();

    if (!projectId || !zipCode || !budgetRange) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project ownership
    const ownershipResult = await verifyProjectOwnership(anonClient, userId, projectId);
    if (ownershipResult instanceof Response) {
      return ownershipResult;
    }

    // Check rate limit (skip for preview mode)
    if (!preview) {
      const rateLimitResult = await checkRateLimit(anonClient, userId, "dispatch-lead");
      if (rateLimitResult) {
        return rateLimitResult;
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const BUSINESS_MAILING_ADDRESS = Deno.env.get("BUSINESS_MAILING_ADDRESS");

    // Require business address for actual sends
    if (!preview && !BUSINESS_MAILING_ADDRESS) {
      return new Response(
        JSON.stringify({
          error: "Configuration error: BUSINESS_MAILING_ADDRESS not set. Cannot send emails without CAN-SPAM compliance.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getServiceRoleClient();

    // ─── Generate email with GPT-4o ────────────────────────

    // Build contact info based on what user chose to share
    const sharedInfo: string[] = [];
    if (fieldsToShare?.name) sharedInfo.push(`Name: ${userName}`);
    if (fieldsToShare?.email) sharedInfo.push(`Email: ${fieldsToShare.email}`);
    if (fieldsToShare?.phone) sharedInfo.push(`Phone: ${fieldsToShare.phone}`);
    if (fieldsToShare?.address) sharedInfo.push(`Address: ${fieldsToShare.address}`);
    if (fieldsToShare?.timeline) sharedInfo.push(`Timeline: ${fieldsToShare.timeline}`);
    
    const contactBlock = sharedInfo.length > 0 ? `\n\nContact Information:\n${sharedInfo.join("\n")}` : "";

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

Client: Zip: ${zipCode}, Budget: ${budgetRange}, Room: ${roomType}, Timeline: Flexible${contactBlock}`;

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

    // First, get opted-out emails
    const { data: optouts } = await supabase
      .from("contractor_optouts")
      .select("email");
    
    const optoutEmails = new Set((optouts ?? []).map((o: any) => o.email.toLowerCase()));

    const { data: contractors } = await supabase
      .from("contractors")
      .select("*")
      .eq("is_active", true)
      .eq("zip_code", zipCode)
      .limit(10);

    // Filter out opted-out contractors
    const eligibleContractors = (contractors ?? []).filter(
      (c: any) => !optoutEmails.has(c.email.toLowerCase())
    ).slice(0, 5);

    // If preview mode, return the email + contractors without sending
    if (preview) {
      return new Response(
        JSON.stringify({
          success: true,
          email: emailData,
          contractors: eligibleContractors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Dispatch leads ────────────────────────────────────

    const leadIds: string[] = [];
    const unsubscribeBaseUrl = Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "") + "/functions/v1/unsubscribe";

    for (const contractor of eligibleContractors) {
      // Append footer with business address and unsubscribe link
      const footer = `

---

${BUSINESS_MAILING_ADDRESS}

To unsubscribe from future project leads, click here: ${unsubscribeBaseUrl}?email=${encodeURIComponent(contractor.email)}`;

      const fullEmailBody = emailData.body + footer;

      // Create lead row
      const { data: lead } = await supabase
        .from("leads")
        .insert({
          project_id: projectId,
          user_id: userId,
          contractor_id: contractor.id,
          email_subject: emailData.subject,
          email_body: fullEmailBody,
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
          const sendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "VisionBuild <leads@visionbuild.app>",
              to: [contractor.email],
              subject: emailData.subject,
              html: fullEmailBody
                .replace(/\n/g, "<br>")
                .replace(
                  /\[Contractor Name\]/g,
                  contractor.contact_name || contractor.business_name
                ),
            }),
          });

          const sendData = await sendRes.json();

          // Log the outreach
          await supabase.from("outreach_log").insert({
            project_id: projectId,
            contractor_id: contractor.id,
            contractor_email: contractor.email,
            fields_shared: fieldsToShare || {},
            provider_message_id: sendData.id || null,
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
          matchedContractorIds: eligibleContractors.map((c: any) => c.id),
          submittedAt: new Date().toISOString(),
        },
      })
      .eq("id", projectId);

    // Record usage
    await recordUsage(anonClient, userId, "dispatch-lead");

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
