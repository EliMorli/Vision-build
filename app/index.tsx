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
  
  // Mock session is now created in _layout.tsx so it works on all routes

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
