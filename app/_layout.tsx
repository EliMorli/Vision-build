import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";

// Complete any pending auth sessions (handles redirect back from browser)
WebBrowser.maybeCompleteAuthSession();

// Hold splash screen until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  useEffect(() => {
    // Hydrate existing session on cold start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      // In mock mode, fetch profile immediately since there's no real session
      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
        useAuthStore.getState().fetchProfile();
      }
    });

    // React to all auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  // Guard: redirect to root when session becomes null on protected routes
  useEffect(() => {
    const checkSessionGuard = async () => {
      if (!session && segments.length > 0) {
        const firstSegment = segments[0];
        
        // Protected routes: (tabs) and profile-settings
        const isProtectedRoute = firstSegment === '(tabs)' || segments.join('/').includes('profile-settings');
        
        if (isProtectedRoute) {
          // In mock mode, check if this is an intentional sign-out
          if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
            const mockSignedOut = await AsyncStorage.getItem("@visionbuild:mock_signed_out");
            if (mockSignedOut === "true") {
              // Intentional sign-out, redirect to root
              router.replace("/");
            }
          } else {
            // Real mode: always redirect to root when session is null
            router.replace("/");
          }
        }
      }
    };
    
    checkSessionGuard();
  }, [session, segments, router]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#202124",
          headerTitleStyle: { fontFamily: "Nunito_800ExtraBold" },
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
        <Stack.Screen name="delete-account/index" options={{ title: "Delete Account" }} />
        <Stack.Screen name="delete-account/confirm" options={{ headerShown: false }} />
        <Stack.Screen name="pros-coming-soon" options={{ title: "Find a pro" }} />
        <Stack.Screen name="terms" options={{ title: "Terms of Service" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy Policy" }} />
      </Stack>
    </>
  );
}
