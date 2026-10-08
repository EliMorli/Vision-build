import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";

// Complete any pending auth sessions (handles redirect back from browser)
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    // Hydrate existing session on cold start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // React to all auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#202124",
          headerTitleStyle: { fontWeight: "600" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="intro" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-choice" options={{ headerShown: false }} />
        <Stack.Screen name="space-type" options={{ headerShown: false }} />
        <Stack.Screen name="assistant-chat" options={{ headerShown: false }} />
        <Stack.Screen name="permission-primer" options={{ headerShown: false }} />
        <Stack.Screen name="ai-consent" options={{ headerShown: false }} />
        <Stack.Screen name="handoff-location" options={{ headerShown: false }} />
        <Stack.Screen name="handoff-confirm" options={{ headerShown: false }} />
        <Stack.Screen name="profile-settings" options={{ headerShown: false }} />
        <Stack.Screen name="help-contact" options={{ headerShown: false }} />
        <Stack.Screen name="result-error" options={{ headerShown: false }} />
        <Stack.Screen name="project/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="editor/[id]" options={{ title: "Choose Style" }} />
        <Stack.Screen name="generating/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="result/[id]" options={{ title: "Your Designs" }} />
        <Stack.Screen name="handoff/[id]" options={{ title: "Get Estimates" }} />
      </Stack>
    </>
  );
}
