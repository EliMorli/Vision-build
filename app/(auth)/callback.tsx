import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { colors } from "@/lib/theme";

/**
 * OAuth callback handler.
 *
 * When the user completes Google/Apple sign-in in the browser,
 * the redirect URL (visionbuild://auth/callback#access_token=...)
 * opens the app and lands here. We extract the tokens from the
 * URL fragment, hand them to Supabase, and redirect to the dashboard.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const handleDeepLink = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        await extractAndSetSession(url);
      }
    };

    // Handle cold start
    handleDeepLink();

    // Handle warm start (app already open)
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      await extractAndSetSession(url);
    });

    return () => subscription.remove();
  }, []);

  const extractAndSetSession = async (url: string) => {
    // Supabase puts tokens in the URL fragment: #access_token=...&refresh_token=...
    const fragment = url.split("#")[1];
    if (!fragment) return;

    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (data.session) {
        setSession(data.session);
        router.replace("/(tabs)");
      }
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
