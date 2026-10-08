import { useEffect } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
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
import { useAuthStore, useSettingsStore } from "@/lib/store";
import { MOCK_USER_ID } from "@/lib/constants/mock";

// Complete any pending auth sessions (handles redirect back from browser)
WebBrowser.maybeCompleteAuthSession();

// Hold splash screen until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  useEffect(() => {
    // Hydrate existing session on cold start
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // In mock mode, check signed-out flag first, then set session once
      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
        const signedOut = await AsyncStorage.getItem("@visionbuild:mock_signed_out");
        
        if (!session && signedOut !== "true") {
          const now = Date.now();
          setSession({
            user: {
              id: MOCK_USER_ID,
              email: "demo@visionbuild.app",
              app_metadata: {},
              user_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString(),
            },
            access_token: "mock-token",
            refresh_token: "mock-refresh",
            expires_in: 3600,
            expires_at: now / 1000 + 3600,
            token_type: "bearer",
          } as any);
        } else {
          setSession(session);
        }
        
        // Fetch profile immediately since there's no real session
        useAuthStore.getState().fetchProfile();
      } else {
        setSession(session);
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
  
  // Load settings whenever we have a user id
  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      loadSettings().catch((err) => {
        console.warn('Failed to load settings:', err);
      });
      // Fetch inbox unread count on app start
      const { useInboxStore } = require("@/lib/store");
      useInboxStore.getState().fetchUnreadCount().catch(() => {
        // Errors are already logged in fetchUnreadCount
      });
    }
  }, [session?.user?.id, loadSettings]);

  // Guard: redirect to sign-in when session becomes null on protected routes
  useEffect(() => {
    // Don't navigate until the root navigator is ready and session has finished loading
    if (!rootNavigationState?.key || loading) return;
    
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
              // Intentional sign-out, redirect to sign-in
              router.replace("/(auth)/sign-in");
            }
          } else {
            // Real mode: always redirect to sign-in when session is null
            router.replace("/(auth)/sign-in");
          }
        }
      }
    };
    
    checkSessionGuard();
  }, [session, segments, router, rootNavigationState?.key, loading]);

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
        <Stack.Screen 
          name="deleted-account" 
          options={{ 
            headerShown: false,
            gestureEnabled: false
          }} 
        />
        <Stack.Screen name="dev/deleted-preview" options={{ headerShown: false }} />
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
