import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

/** Explore's own stack: the public grid and a design's detail page, both with the tab bar. */
export const unstable_settings = { initialRouteName: "explore" };

export default function ExploreStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="explore" options={{ title: "Explore" }} />
      <Stack.Screen name="explore/[id]" options={{ title: "Design" }} />
    </Stack>
  );
}
