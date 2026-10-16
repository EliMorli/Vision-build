import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AI_CONSENT_VERSION } from "@/lib/config";
import { useProjectStore } from "@/lib/store";

const AI_CONSENT_KEY = "@visionbuild:ai_consent";
const AI_CONSENT_VERSION_KEY = "@visionbuild:ai_consent_version";

export type ViConsentState = "checking" | "granted" | "needed";

// "Not now" on the consent screen shouldn't bounce the user straight back into
// it; after a decline Vi shows its gate card until they choose to review again.
let declinedThisSession = false;

export function markViConsentDeclined() {
  declinedThisSession = true;
}

export function clearViConsentDeclined() {
  declinedThisSession = false;
}

/**
 * Vi (assistant chat) sends messages to AI, and the server refuses chat without
 * AI consent. On focus: if the current consent version isn't recorded, open the
 * consent screen first; accepting returns to Vi.
 */
export function useViConsentGate(): { state: ViConsentState; openConsent: () => void } {
  const router = useRouter();
  const [state, setState] = useState<ViConsentState>("checking");

  const openConsent = useCallback(
    (reason: "never" | "outdated" = "never") => {
      clearViConsentDeclined();
      useProjectStore.getState().setPendingConsent({ reason, resume: { type: "assistant" } });
      router.push("/ai-consent");
    },
    [router]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [consented, version] = await Promise.all([
          AsyncStorage.getItem(AI_CONSENT_KEY),
          AsyncStorage.getItem(AI_CONSENT_VERSION_KEY),
        ]);
        if (!active) return;
        if (consented === "true" && version === AI_CONSENT_VERSION) {
          setState("granted");
          return;
        }
        setState("needed");
        if (!declinedThisSession) openConsent(consented ? "outdated" : "never");
      })().catch(() => {
        if (active) setState("needed");
      });
      return () => {
        active = false;
      };
    }, [openConsent])
  );

  return { state, openConsent: () => openConsent("never") };
}
