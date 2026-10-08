import { useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AI_CONSENT_VERSION } from "@/lib/config";
import { useAuthStore } from "@/lib/store";

const AI_CONSENT_KEY = "@visionbuild:ai_consent";
const AI_CONSENT_VERSION_KEY = "@visionbuild:ai_consent_version";

const DEV_MOCK_ENABLED = 
  __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true";

/**
 * Check if user needs to re-consent to AI processing.
 * Navigates to ai-consent screen if version mismatch.
 * Skipped in mock mode.
 */
export function useAIConsentCheck() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);

  const checkConsentVersion = useCallback(async () => {
    // Skip consent check in mock mode
    if (DEV_MOCK_ENABLED) {
      return;
    }

    try {
      const [consented, storedVersion] = await Promise.all([
        AsyncStorage.getItem(AI_CONSENT_KEY),
        AsyncStorage.getItem(AI_CONSENT_VERSION_KEY),
      ]);

      // If not consented at all, or version mismatch, show consent screen
      if (!consented || storedVersion !== AI_CONSENT_VERSION) {
        router.push("/ai-consent");
      }
    } catch (error) {
      console.error("Failed to check AI consent version:", error);
    }
  }, [router]);

  useEffect(() => {
    if (!session) return;

    checkConsentVersion();
  }, [session, checkConsentVersion]);
}
