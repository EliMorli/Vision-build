// Shared AI consent configuration
// This constant must match lib/config.ts AI_CONSENT_VERSION

export const CURRENT_AI_CONSENT_VERSION = "2026-10-07b";

export interface ConsentCheckResult {
  hasConsent: boolean;
  reason?: "never" | "outdated";
  currentVersion: string;
}

/**
 * Check if a user has current AI consent
 * Returns result indicating consent status and reason if missing/outdated
 */
export async function checkAIConsent(
  supabaseClient: any,
  userId: string
): Promise<ConsentCheckResult> {
  const { data: consent } = await supabaseClient
    .from("consents")
    .select("version")
    .eq("user_id", userId)
    .eq("kind", "ai_processing")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .single();

  if (!consent) {
    return {
      hasConsent: false,
      reason: "never",
      currentVersion: CURRENT_AI_CONSENT_VERSION,
    };
  }

  if (consent.version !== CURRENT_AI_CONSENT_VERSION) {
    return {
      hasConsent: false,
      reason: "outdated",
      currentVersion: CURRENT_AI_CONSENT_VERSION,
    };
  }

  return {
    hasConsent: true,
    currentVersion: CURRENT_AI_CONSENT_VERSION,
  };
}

/**
 * Create a 403 response for missing/outdated consent
 */
export function consentRequiredResponse(result: ConsentCheckResult): Response {
  return new Response(
    JSON.stringify({
      error: "consent_required",
      reason: result.reason,
      current_version: result.currentVersion,
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}
