import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { CURRENT_AI_CONSENT_VERSION } from "../_shared/consent.ts";

// Mock dependencies
function createMockSupabaseClient(consents: any[] = []) {
  return {
    from: (table: string) => {
      if (table === "consents") {
        return {
          select: () => ({
            eq: (field: string, value: any) => ({
              eq: (field2: string, value2: any) => ({
                order: () => ({
                  limit: () => ({
                    single: () => {
                      const consent = consents.find(c => 
                        c.user_id === value && c.kind === value2
                      );
                      return consent 
                        ? { data: consent, error: null }
                        : { data: null, error: { message: "Not found" } };
                    }
                  })
                })
              })
            })
          })
        };
      }
      return {};
    }
  };
}

async function makeRequest(
  userId: string,
  consents: any[] = []
) {
  const { checkAIConsent, consentRequiredResponse } = await import("../_shared/consent.ts");
  
  const mockClient = createMockSupabaseClient(consents);
  const result = await checkAIConsent(mockClient, userId);
  
  if (!result.hasConsent) {
    return consentRequiredResponse(result);
  }
  
  return new Response(
    JSON.stringify({ success: true, response: "Hello!", timestamp: Date.now() }),
    { status: 200 }
  );
}

Deno.test("assistant-chat: no consent returns 403 with reason=never", async () => {
  const response = await makeRequest("user-123", []);
  
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error, "consent_required");
  assertEquals(body.reason, "never");
  assertEquals(body.current_version, CURRENT_AI_CONSENT_VERSION);
});

Deno.test("assistant-chat: outdated consent returns 403 with reason=outdated", async () => {
  const response = await makeRequest(
    "user-123",
    [{ user_id: "user-123", kind: "ai_processing", version: "2026-10-01", accepted_at: "2026-10-01T00:00:00Z" }]
  );
  
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error, "consent_required");
  assertEquals(body.reason, "outdated");
  assertEquals(body.current_version, CURRENT_AI_CONSENT_VERSION);
});

Deno.test("assistant-chat: current consent allows request", async () => {
  const response = await makeRequest(
    "user-123",
    [{ user_id: "user-123", kind: "ai_processing", version: CURRENT_AI_CONSENT_VERSION, accepted_at: "2026-10-08T00:00:00Z" }]
  );
  
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
});
