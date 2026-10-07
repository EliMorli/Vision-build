import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components";

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const menuItems = [
    { icon: "person-outline" as const, label: "Edit Profile", badge: null, route: null },
    { icon: "settings-outline" as const, label: "Settings & Privacy", badge: null, route: "/profile-settings" },
    { icon: "card-outline" as const, label: "Payment Methods", badge: null, route: null },
    { icon: "home-outline" as const, label: "My Properties", badge: "3", route: null },
    { icon: "heart-outline" as const, label: "Saved Designs", badge: "12", route: null },
    { icon: "help-circle-outline" as const, label: "Help & Contact", badge: null, route: "/help-contact" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={colors.primary} />
          </View>
          <Text style={styles.name}>{profile?.display_name ?? "User"}</Text>
          <Text style={styles.email}>{profile?.email ?? "user@example.com"}</Text>
        </View>

        {/* Menu items */}
        <View style={styles.section}>
          {menuItems.map((item, index) => (
              <Pressable
              key={item.label}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.lastMenuItem,
              ]}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color={colors.textPrimary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Sign out button */}
        <View style={styles.signOutSection}>
          <Button
            label="Sign Out"
            icon="log-out-outline"
            variant="outline"
            onPress={signOut}
          />
        </View>

        {/* App version */}
        <Text style={styles.version}>VisionBuild v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingBottom: spacing.xl },
  header: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  name: {
    ...fonts.heading,
    marginBottom: 4,
  },
  email: {
    ...fonts.body,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  menuLabel: {
    ...fonts.body,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  signOutSection: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  version: {
    ...fonts.regular,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
