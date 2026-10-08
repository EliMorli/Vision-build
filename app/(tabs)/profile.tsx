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
import { useAuthStore, useProjectStore } from "@/lib/store";
import { Button } from "@/components";

// Define all available badges (greyed out if not earned)
const ALL_BADGES = [
  { id: "first-room", name: "First room", color: colors.primary, earned: true },
  { id: "style-hopper", name: "Style hopper", color: "#34A853", earned: true },
  { id: "got-quotes", name: "Got quotes", color: "#FBBC04", earned: true },
  { id: "trendsetter", name: "Trendsetter", color: "#8B7CF6", earned: false },
  { id: "exterior-pro", name: "Exterior pro", color: "#FF7A59", earned: false },
  { id: "builder", name: "Builder", color: "#2E86C1", earned: false },
];

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const projects = useProjectStore((s) => s.projects);

  // Calculate real counts
  const roomsCount = projects.length;
  const designsCount = projects.reduce((sum, p) => {
    const designUrls = p.generated_image_urls || [];
    return sum + designUrls.length + (p.selected_generation_url ? 1 : 0);
  }, 0);
  const quotesCount = 0; // Coming soon: contractor quotes

  // Calculate XP and level
  const xp = profile?.xp ?? 120;
  const level = profile?.level ?? Math.floor(xp / 200) + 1;
  const xpForNextLevel = level * 200;
  const xpProgress = (xp / xpForNextLevel) * 100;
  const earnedBadges = ALL_BADGES.filter((b) => b.earned);

  const menuItems = [
    { icon: "person-outline" as const, label: "Edit Profile", badge: null, route: "/edit-profile" },
    { icon: "settings-outline" as const, label: "Settings & Privacy", badge: null, route: "/profile-settings" },
    { icon: "home-outline" as const, label: "My Properties", badge: roomsCount > 0 ? String(roomsCount) : null, route: null },
    { icon: "heart-outline" as const, label: "Saved Designs", badge: null, route: null }, // Will wire in Pass B
    { icon: "help-circle-outline" as const, label: "Help & Contact", badge: null, route: "/help-contact" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.display_name?.[0]?.toUpperCase() ?? "U"}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.display_name ?? "User"}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Level {level} · Rookie Designer
            </Text>
          </View>
        </View>

        {/* XP Progress Card */}
        <View style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLabel}>Next: Level {level + 1}</Text>
            <Text style={styles.xpCount}>
              {xp}/{xpForNextLevel} XP
            </Text>
          </View>
          <View style={styles.xpBarContainer}>
            <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{roomsCount}</Text>
            <Text style={styles.statLabel}>Rooms</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{designsCount}</Text>
            <Text style={styles.statLabel}>Designs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{quotesCount}</Text>
            <Text style={styles.statLabel}>Quotes</Text>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.badgesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <Text style={styles.badgeCount}>
              {earnedBadges.length} of {ALL_BADGES.length}
            </Text>
          </View>
          <View style={styles.badgeGrid}>
            {ALL_BADGES.map((badge) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View
                  style={[
                    styles.badgeIcon,
                    {
                      backgroundColor: badge.earned ? badge.color : "#D7DCEB",
                      shadowColor: badge.earned ? badge.color : "#BCC3D8",
                      opacity: badge.earned ? 1 : 0.45,
                    },
                  ]}
                >
                  <View style={styles.badgeIconInner}>
                    <Ionicons name="star" size={26} color="#fff" />
                  </View>
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
              </View>
            ))}
          </View>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: "#FFD66B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ rotate: "-4deg" }],
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#1B2140",
  },
  name: {
    ...fonts.heading,
    fontSize: 21,
    marginBottom: spacing.sm,
  },
  levelBadge: {
    backgroundColor: "#E8F0FE",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  xpCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  xpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  xpCount: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.textSecondary,
  },
  xpBarContainer: {
    height: 12,
    borderRadius: radius.full,
    backgroundColor: "#E3E8F8",
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: "#FBBC04",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgesSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  badgeItem: {
    width: "30%",
    alignItems: "center",
    gap: 6,
  },
  badgeIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }],
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  badgeIconInner: {
    transform: [{ rotate: "-45deg" }],
  },
  badgeName: {
    fontSize: 11.5,
    fontWeight: "800",
    textAlign: "center",
    color: colors.textPrimary,
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
