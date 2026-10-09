import type React from "react";
import { Stack } from "expo-router";
import { colors } from "@/lib/theme";
import { TAB_ROOT_ROUTE, type SharedTabGroup } from "@/lib/navigation/tabs";

/**
 * The folder is named (vi,profile,home), not (home,vi,profile), on purpose: it
 * makes (vi)/vi.tsx and (profile)/profile.tsx sort before the shared files, so
 * the Vi and Profile tabs link to /vi and /profile (not to the first shared
 * screen). Cold links such as /project/123 still open in Home's stack.
 *
 * One stack per tab for Home, Vi and Profile. Every in-app detail screen
 * (project, results, Vi chat, settings and its subpages, help & contact, pros
 * coming soon) is a shared route that exists in each of these stacks, so it
 * opens INSIDE the tab you came from: the tab bar stays visible, that tab stays
 * highlighted, and back returns within the tab. Explore has its own stack
 * ((explore)/_layout) for the grid and a design's detail page.
 *
 * Immersive or blocking screens (create flow: camera, style picker,
 * generating; AI consent; onboarding and sign-in; account deleted) live on the
 * root stack above the tabs, so the tab bar is hidden there.
 */
// No unstable_settings: Vi and Profile already start at vi/profile (the route
// named like the group). Home's index is deliberately NOT marked initial: Expo
// Router would then rank it above app/index.tsx for "/" and skip the intro.
// Detail pages opened straight from a link use useTabNavigation().back, which
// falls back to the tab's first screen.

const headerTitleStyle = { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" as const };

// Each tab's own root screen(s); listed only in that tab's stack.
const TAB_ROOT_SCREENS: Record<SharedTabGroup, React.ReactNode> = {
  "(home)": <Stack.Screen name="index" options={{ headerShown: false, title: "Home" }} />,
  "(vi)": <Stack.Screen name="vi" options={{ headerShown: false, title: "Vi" }} />,
  "(profile)": <Stack.Screen name="profile" options={{ headerShown: true, title: "Profile" }} />,
};

export default function TabStackLayout({ segment }: { segment: string }) {
  const group = segment as SharedTabGroup;
  return (
    <Stack
      initialRouteName={TAB_ROOT_ROUTE[group] ?? "index"}
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: colors.textPrimary,
        headerTitleStyle,
        headerShadowVisible: false,
        headerShown: false,
      }}
    >
      {TAB_ROOT_SCREENS[group]}
      {/* Shared detail screens (in every tab's stack). Titles name the web tab
          and the "<title>, back" label of the next screen's back button. */}
      <Stack.Screen name="project/[id]" options={{ title: "Project" }} />
      <Stack.Screen name="result/[id]" options={{ headerShown: true, title: "Your designs" }} />
      <Stack.Screen name="assistant-chat" options={{ title: "Vi" }} />
      <Stack.Screen name="profile-settings" options={{ title: "Settings" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="edit-profile" options={{ title: "Edit profile" }} />
      <Stack.Screen name="help-contact" options={{ title: "Help & contact" }} />
      <Stack.Screen name="pros-coming-soon" options={{ title: "Pros are coming soon" }} />
    </Stack>
  );
}
