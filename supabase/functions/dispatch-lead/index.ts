// Supabase Edge Function: dispatch-lead
// Uses AI (OpenRouter/OpenAI) to generate the "Perfect Lead" email,
// finds matching contractors, and sends via Resend.
//
// Required secrets:
//   AI_API_KEY (or OPENAI_API_KEY for backward compatibility)
//   RESEND_API_KEY
//   BUSINESS_MAILING_ADDRESS (required for CAN-SPAM compliance)
//   SUPABASE_SERVICE_ROLE_KEY (auto-available)
// Optional:
//   AI_BASE_URL (default: https://openrouter.ai/api/v1)
//   AI_MODEL_TEXT or AI_MODEL_VISION

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth, verifyProjectOwnership, getServiceRoleClient } from "../_shared/auth.ts";
import { checkRateLimit, recordUsage } from "../_shared/rate-limit.ts";
import { generateProjectBrief } from "../_shared/ai.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check if contractor outreach is enabled
    const CONTRACTOR_OUTREACH_ENABLED = Deno.env.get("CONTRACTOR_OUTREACH_ENABLED");
    if (CONTRACTOR_OUTREACH_ENABLED !== "true") {
      return new Response(
        JSON.stringify({ 
          error: "feature_disabled",
          message: "Contractor outreach is currently disabled. Set CONTRACTOR_OUTREACH_ENABLED=true to enable."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // ─── Generate email with AI ────────────────────────

    // Build contact info based on what user chose to share
    const sharedInfo: string[] = [];
    if (fieldsToShare?.name) sharedInfo.push(`Name: ${userName}`);
    if (fieldsToShare?.email) sharedInfo.push(`Email: ${fieldsToShare.email}`);
    if (fieldsToShare?.phone) sharedInfo.push(`Phone: ${fieldsToShare.phone}`);
    if (fieldsToShare?.address) sharedInfo.push(`Address: ${fieldsToShare.address}`);
    if (fieldsToShare?.timeline) sharedInfo.push(`Timeline: ${fieldsToShare.timeline}`);
    
    const contactInfo = sharedInfo.length > 0 ? `Contact Information:\n${sharedInfo.join("\n")}` : "";

    const emailData = await generateProjectBrief({
      originalImageUrl,
      generatedImageUrl,
      roomType,
      zipCode,
      budgetRange,
      userName,
      contactInfo,
    });

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
    const UNSUBSCRIBE_SECRET = Deno.env.get("UNSUBSCRIBE_SECRET");
    if (!UNSUBSCRIBE_SECRET) {
      return new Response(
        JSON.stringify({ error: "UNSUBSCRIBE_SECRET is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const contractor of eligibleContractors) {
      // Generate HMAC token for unsubscribe link
      const message = contractor.email.toLowerCase();
      const encoder = new TextEncoder();
      const keyData = encoder.encode(UNSUBSCRIBE_SECRET);
      const messageData = encoder.encode(message);
      
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
      const token = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // Append footer with business address and signed unsubscribe link
      const footer = `

---

${BUSINESS_MAILING_ADDRESS}

To unsubscribe from future project leads, click here: ${unsubscribeBaseUrl}?email=${encodeURIComponent(contractor.email)}&token=${token}`;

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
          console.error(`Failed to email contractor ${contractor.id}:`, emailErr.message);
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

    // Award XP for requesting pros (once per project)
    // Service role bypasses RLS; unique constraint prevents duplicates
    try {
      await supabase
        .from("xp_events")
        .insert({
          user_id: userId,
          event_type: "pro_requested",
          project_id: projectId,
          amount: 30,
        });
    } catch (xpError) {
      // Ignore duplicate key errors
      console.log("XP award skipped (may already exist):", xpError);
    }

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

// ============================================================================
// TODO: Award XP when contractor replies
// ============================================================================
// When implementing the inbound contractor reply handler (e.g., Resend webhook
// or manual reply recording), award XP with the following code:
//
//   const supabase = getServiceRoleClient();
//   try {
//     await supabase
//       .from("xp_events")
//       .insert({
//         user_id: userId,
//         event_type: "contractor_replied",
//         project_id: projectId,
//         amount: 20,
//       });
//   } catch (xpError) {
//     // Ignore duplicate key errors (already awarded)
//     console.log("XP award skipped (may already exist):", xpError);
//   }
//
// This should be called once per project when the FIRST contractor reply is
// recorded. The unique constraint on (user_id, event_type, project_id) ensures
// XP is only awarded once regardless of how many contractors reply.
// ============================================================================
