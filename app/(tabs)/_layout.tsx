import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { setLastTabGroup, tabGroupFromSegments } from "@/lib/navigation/tabs";
import { colors } from "@/lib/theme";
import { useInboxStore } from "@/lib/store";
import { isOutreachEnabled } from "@/lib/config/features";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";

// Home is the first tab: cold links to shared screens (e.g. /project/123) open
// in Home's stack, and Home is the initial tab under them.
export const unstable_settings = { initialRouteName: "(home)" };

export default function TabsLayout() {
  const router = useRouter();
  const unreadCount = useInboxStore((s) => s.unreadCount);
  // Inbox is for pros messages; hidden until the outreach flag is on (off at launch).
  // The slot right of + is never empty: Vi while outreach is off, Inbox once it's on
  // (Vi then moves to a button on Home). Bar: Home · Explore · + · Vi/Inbox · Profile.
  const showInbox = isOutreachEnabled();
  const isOffline = !useNetworkStatus().isConnected;
  // Remember the tab the user is in: root-stack flows (camera → style →
  // generating) hand their result back to this tab's stack.
  const segments = useSegments();
  const activeGroup = tabGroupFromSegments(segments);
  useEffect(() => {
    if (activeGroup) setLastTabGroup(activeGroup);
  }, [activeGroup]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: false,
        headerTitleStyle: { 
          fontFamily: "Nunito_800ExtraBold",
          fontWeight: "800",
        },
        tabBarStyle: { height: 65, paddingBottom: 8 },
        // Like a native UITabBar, tab labels stay a fixed size at large text
        // settings (iOS shows them in the Large Content Viewer on long-press).
        // All screen content keeps scaling with the system font size.
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          headerShown: false,
          tabBarLabel: "Home",
          tabBarButtonTestID: "tab-home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(explore)"
        options={{
          headerShown: false,
          title: "Explore",
          tabBarLabel: "Explore",
          tabBarButtonTestID: "tab-explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          // Offline: the raised + turns clay-gray and says "Needs internet",
          // matching the disabled Generate button on the style picker.
          tabBarLabel: isOffline ? "Needs internet" : " ",
          tabBarLabelStyle: isOffline ? styles.createLabelOffline : undefined,
          tabBarAccessibilityLabel: isOffline ? "Create a new design, needs internet" : "Create a new design",
          tabBarButtonTestID: "tab-create",
          tabBarIcon: () => (
            <View style={styles.createButtonContainer}>
              <View
                style={[styles.createButton, isOffline && styles.createButtonDisabled]}
                testID={isOffline ? "tab-create-disabled" : "tab-create-icon"}
              >
                <Ionicons
                  name="add"
                  size={32}
                  color={isOffline ? colors.textSecondary : "#fff"}
                  style={{ transform: [{ rotate: '6deg' }] }}
                />
              </View>
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            if (isOffline) return;
            router.push("/create-choice");
          },
        }}
      />
      <Tabs.Screen
        name="(vi)"
        options={{
          href: showInbox ? null : undefined,
          headerShown: false,
          title: "Vi",
          tabBarLabel: "Vi",
          tabBarAccessibilityLabel: "Vi, design assistant",
          tabBarButtonTestID: "tab-vi",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          href: showInbox ? undefined : null,
          title: "Inbox",
          tabBarLabel: "Inbox",
          tabBarButtonTestID: "tab-inbox",
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount.toString()) : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => {
            if (!showInbox) return;
            // Refresh unread count when tab is focused
            useInboxStore.getState().fetchUnreadCount().catch(() => {
              // Errors are already logged in fetchUnreadCount
            });
          },
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          headerShown: false,
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarButtonTestID: "tab-profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButtonContainer: {
    marginTop: -20,
  },
  createButton: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.primary,
    borderBottomWidth: 5,
    borderBottomColor: "#0F4FB0",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: '-6deg' }],
  },
  createButtonDisabled: {
    backgroundColor: "#E8EAED",
    borderBottomColor: "#BDC1C6",
  },
  createLabelOffline: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
});
