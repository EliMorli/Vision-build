import { Redirect } from "expo-router";
import { useAuthStore } from "@/lib/store";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/lib/theme";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INTRO_SEEN_KEY = "@visionbuild:intro_seen";

const DEV_MOCK_ENABLED = 
  __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true";

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const setSession = useAuthStore((s) => s.setSession);
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [mockSignedOut, setMockSignedOut] = useState<boolean | null>(null);

  useEffect(() => {
    const checkIntroSeen = async () => {
      try {
        const seen = await AsyncStorage.getItem(INTRO_SEEN_KEY);
        setIntroSeen(seen === "true");
        
        // Check mock signed-out flag
        if (DEV_MOCK_ENABLED) {
          const signedOut = await AsyncStorage.getItem("@visionbuild:mock_signed_out");
          setMockSignedOut(signedOut === "true");
        } else {
          setMockSignedOut(false);
        }
      } catch {
        setIntroSeen(false);
        setMockSignedOut(false);
      }
    };
    
    checkIntroSeen();
  }, []);
  
  // Set mock session in dev mode (but not if user signed out)
  useEffect(() => {
    if (DEV_MOCK_ENABLED && !session && mockSignedOut === false) {
      const now = Date.now();
      setSession({
        user: {
          id: "mock-user-id",
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
    }
  }, [session, setSession, mockSignedOut]);

  if (loading || introSeen === null || (DEV_MOCK_ENABLED && mockSignedOut === null)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // First time users see splash -> intro
  if (!introSeen) {
    return <Redirect href="/splash" />;
  }

  // Returning users go straight to auth or tabs
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
