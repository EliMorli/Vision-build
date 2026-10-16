import { assertEquals, assert } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { buildEmail, handleNotify, NotifyDeps, parseAdminEmails, ReportSummary } from "./index.ts";

const REPORT_ID = "11111111-2222-3333-4444-555555555555";
const summary: ReportSummary = {
  id: REPORT_ID,
  targetType: "design",
  targetId: "d1000000-0000-0000-0000-000000000000",
  reason: "inappropriate",
  createdAt: "2026-10-13T00:00:00Z",
  designTitle: "Cozy loft",
  reporterCount: 2,
  isHidden: false,
};

function deps(overrides: Partial<NotifyDeps["env"]> = {}, sent: unknown[] = []): NotifyDeps {
  return {
    env: { serviceRoleKey: "srk", resendApiKey: "re_test", adminEmails: "mod@example.com, bad, two@example.com", ...overrides },
    loadReport: async (id) => (id === REPORT_ID ? summary : null),
    sendEmail: async (p) => { sent.push(p); return { ok: true, status: 200 }; },
    logger: { log: () => {}, error: () => {} },
  };
}

function req(body: unknown, auth = "Bearer srk") {
  return new Request("http://x/notify-new-report", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("notify: rejects callers without the service role key", async () => {
  const sent: unknown[] = [];
  const res = await handleNotify(req({ reportId: REPORT_ID }, "Bearer user-jwt"), deps({}, sent));
  assertEquals(res.status, 401);
  assertEquals(sent.length, 0);
});

Deno.test("notify: env-gated, does nothing without RESEND_API_KEY or ADMIN_EMAILS", async () => {
  for (const env of [{ resendApiKey: undefined }, { adminEmails: "" }]) {
    const sent: unknown[] = [];
    const res = await handleNotify(req({ reportId: REPORT_ID }), deps(env, sent));
    assertEquals(res.status, 200);
    assertEquals((await res.json()).reason, "not_configured");
    assertEquals(sent.length, 0);
  }
});

Deno.test("notify: emails valid admin addresses only", async () => {
  const sent: any[] = [];
  const res = await handleNotify(req({ reportId: REPORT_ID }), deps({}, sent));
  assertEquals(res.status, 200);
  assertEquals(sent.length, 1);
  assertEquals(sent[0].to, ["mod@example.com", "two@example.com"]);
});

Deno.test("notify: invalid id and unknown report", async () => {
  assertEquals((await handleNotify(req({ reportId: "nope" }), deps())).status, 400);
  assertEquals((await handleNotify(req({ reportId: "99999999-2222-3333-4444-555555555555" }), deps())).status, 404);
});

Deno.test("notify: email has no reporter identity and sanitises reason/title", () => {
  const { subject, text } = buildEmail({ ...summary, reason: "<script>", designTitle: "a\nb" });
  assert(text.includes("Reason: other"));
  assert(text.includes("Design: a b"));
  assert(!text.includes("@"));
  assert(subject.includes("24 hours"));
  assert(buildEmail({ ...summary, isHidden: true, reporterCount: 3 }).subject.includes("auto-hidden"));
});

Deno.test("notify: parseAdminEmails", () => {
  assertEquals(parseAdminEmails(undefined), []);
  assertEquals(parseAdminEmails(" a@b.co ,x"), ["a@b.co"]);
});
