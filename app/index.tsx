import { Redirect } from "expo-router";
import { useAuthStore } from "@/lib/store";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/lib/theme";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INTRO_SEEN_KEY = "@visionbuild:intro_seen";
const DEV_SKIP_AUTH = process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === "true";

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);

  useEffect(() => {
    checkIntroSeen();
  }, []);

  const checkIntroSeen = async () => {
    try {
      const seen = await AsyncStorage.getItem(INTRO_SEEN_KEY);
      setIntroSeen(seen === "true");
    } catch {
      setIntroSeen(false);
    }
  };

  if (loading || introSeen === null) {
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
  if (session || DEV_SKIP_AUTH) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
