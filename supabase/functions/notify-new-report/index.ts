// Supabase Edge Function: notify-new-report
//
// Emails the moderators when a user reports content, so reports are acted on
// within 24 hours (App Review guideline 1.2). Called by the reports_notify_admin
// database trigger (migration 00025) through pg_net with the service role key.
//
// Env (all optional; without them the function does nothing and says so):
//   RESEND_API_KEY      Resend key (same one the deletion emails use)
//   ADMIN_EMAILS        comma-separated moderator addresses
//   MODERATION_FROM     sender, default "VisionBuild <noreply@visionbuild.app>"
//
// PRIVACY: the email carries ids, the reason category, counts and the design
// title. Never the reporter's identity or email, never free text.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getServiceRoleClient } from "../_shared/auth.ts";

export interface NotifyDeps {
  env: {
    serviceRoleKey?: string;
    resendApiKey?: string;
    adminEmails?: string;
    from?: string;
  };
  loadReport: (reportId: string) => Promise<ReportSummary | null>;
  sendEmail: (params: { apiKey: string; from: string; to: string[]; subject: string; text: string }) =>
    Promise<{ ok: boolean; status: number }>;
  logger: { log: (m: string) => void; error: (m: string) => void };
}

export interface ReportSummary {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
  designTitle: string | null;
  reporterCount: number;
  isHidden: boolean;
}

const REASON_ID = /^[a-z_]{1,32}$/;

export function parseAdminEmails(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export function buildEmail(r: ReportSummary): { subject: string; text: string } {
  const reason = REASON_ID.test(r.reason) ? r.reason : "other";
  const title = (r.designTitle || "Untitled design").replace(/[\r\n]+/g, " ").slice(0, 80);
  const subject = r.isHidden
    ? `Design auto-hidden after ${r.reporterCount} reports – review needed`
    : `New ${r.targetType} report – review within 24 hours`;
  const text = [
    `A ${r.targetType} was reported.`,
    ``,
    `Design: ${title}`,
    `Target id: ${r.targetId}`,
    `Reason: ${reason}`,
    `People who reported it: ${r.reporterCount}`,
    `Currently hidden: ${r.isHidden ? "yes (pending review)" : "no"}`,
    `Reported at: ${r.createdAt}`,
    ``,
    `Open the moderation queue in the app (Settings > Moderation) to hide the design, dismiss the report or ban the owner from publishing.`,
  ].join("\n");
  return { subject, text };
}

export async function handleNotify(req: Request, deps: NotifyDeps): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const auth = req.headers.get("Authorization") || "";
  if (!deps.env.serviceRoleKey || auth !== `Bearer ${deps.env.serviceRoleKey}`) {
    return json(401, { error: "unauthorized" });
  }

  let reportId: unknown;
  try {
    ({ reportId } = await req.json());
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (typeof reportId !== "string" || !/^[0-9a-f-]{36}$/i.test(reportId)) {
    return json(400, { error: "invalid_report_id" });
  }

  const to = parseAdminEmails(deps.env.adminEmails);
  if (!deps.env.resendApiKey || to.length === 0) {
    deps.logger.log("notify-new-report: skipped (RESEND_API_KEY or ADMIN_EMAILS not set)");
    return json(200, { sent: false, reason: "not_configured" });
  }

  const report = await deps.loadReport(reportId);
  if (!report) return json(404, { error: "report_not_found" });

  const { subject, text } = buildEmail(report);
  const res = await deps.sendEmail({
    apiKey: deps.env.resendApiKey,
    from: deps.env.from || "VisionBuild <noreply@visionbuild.app>",
    to,
    subject,
    text,
  });
  if (!res.ok) {
    deps.logger.error(`notify-new-report: Resend error ${res.status}`);
    return json(502, { sent: false, reason: "email_failed" });
  }
  return json(200, { sent: true, recipients: to.length });
}

if (import.meta.main) {
  serve((req) => {
    const supabase = getServiceRoleClient();
    return handleNotify(req, {
      env: {
        serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        resendApiKey: Deno.env.get("RESEND_API_KEY"),
        adminEmails: Deno.env.get("ADMIN_EMAILS"),
        from: Deno.env.get("MODERATION_FROM"),
      },
      loadReport: async (reportId) => {
        const { data: r } = await supabase
          .from("reports")
          .select("id, target_type, target_id, reason, created_at")
          .eq("id", reportId)
          .maybeSingle();
        if (!r) return null;
        const { data: open } = await supabase
          .from("reports")
          .select("user_id")
          .eq("target_type", r.target_type)
          .eq("target_id", r.target_id)
          .eq("status", "open");
        const reporters = new Set((open || []).map((x: { user_id: string }) => x.user_id)).size;
        let designTitle: string | null = null;
        let isHidden = false;
        if (r.target_type === "design") {
          const { data: p } = await supabase
            .from("projects")
            .select("title, is_hidden")
            .eq("id", r.target_id)
            .maybeSingle();
          designTitle = p?.title ?? null;
          isHidden = !!p?.is_hidden;
        }
        return {
          id: r.id,
          targetType: r.target_type,
          targetId: r.target_id,
          reason: r.reason,
          createdAt: r.created_at,
          designTitle,
          reporterCount: reporters,
          isHidden,
        };
      },
      sendEmail: async ({ apiKey, from, to, subject, text }) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, subject, text }),
        });
        await res.body?.cancel();
        return { ok: res.ok, status: res.status };
      },
      logger: { log: (m) => console.log(m), error: (m) => console.error(m) },
    });
  });
}
