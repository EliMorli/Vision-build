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
import { Button, OfflineBanner, LoadingSkeleton, ErrorState } from "@/components";
import { getDisplayName, getDisplayInitial } from "@/lib/helpers/user";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import { useState, useEffect } from "react";

interface Badge {
  id: string;
  name: string;
  color: string;
  earnedDescription: string;
  lockedHint: string;
  earned: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const projects = useProjectStore((s) => s.projects);
  const authLoading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const networkStatus = useNetworkStatus();
  const isOffline = !networkStatus.isConnected;

  const displayName = getDisplayName(profile, session?.user);
  const displayInitial = getDisplayInitial(displayName);

  // Calculate real counts
  const roomsCount = projects.length;
  const designsCount = projects.reduce((sum, p) => {
    const designUrls = p.generated_image_urls || [];
    return sum + designUrls.length;
  }, 0);

  // Calculate XP and level
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const xpForNextLevel = level * 200;
  const xpProgress = (xp / xpForNextLevel) * 100;
  
  // Derive earned badges from real data
  const uniqueStyles = new Set(projects.map(p => p.selected_style).filter(Boolean)).size;
  
  const ALL_BADGES: Badge[] = [
    { 
      id: "first-room", 
      name: "First room", 
      color: colors.primary, 
      earnedDescription: "Redesigned first room",
      lockedHint: "Redesign your first room.",
      earned: roomsCount > 0 
    },
    { 
      id: "style-hopper", 
      name: "Style hopper", 
      color: "#34A853", 
      earnedDescription: "Tried multiple styles",
      lockedHint: "Try 3 different styles.",
      earned: uniqueStyles >= 3 
    },
    { 
      id: "trendsetter", 
      name: "Trendsetter", 
      color: "#8B7CF6", 
      earnedDescription: "Design shared publicly",
      lockedHint: "Share a design publicly.",
      earned: projects.some(p => p.is_public) 
    },
    { 
      id: "exterior-pro", 
      name: "Exterior pro", 
      color: "#FF7A59", 
      earnedDescription: "Exterior design created",
      lockedHint: "Redesign an outdoor space.",
      earned: projects.some(p => {
        const roomType = p.room_analysis?.roomType?.toLowerCase() || "";
        return roomType.includes("backyard") || roomType.includes("patio") || 
               roomType.includes("deck") || roomType.includes("outdoor") || 
               roomType.includes("exterior") || roomType.includes("yard") ||
               roomType.includes("garden");
      })
    },
    { 
      id: "builder", 
      name: "Builder", 
      color: "#2E86C1", 
      earnedDescription: "Five rooms redesigned",
      lockedHint: "Redesign 5 rooms.",
      earned: roomsCount >= 5 
    },
  ];
  
  const earnedBadges = ALL_BADGES.filter((b) => b.earned);

  const menuItems = [
    { icon: "person-outline" as const, label: "Edit Profile", badge: null, route: "/edit-profile" },
    { icon: "settings-outline" as const, label: "Settings & privacy", badge: null, route: "/profile-settings" },
    { icon: "help-circle-outline" as const, label: "Help & contact", badge: null, route: "/help-contact" },
  ];

  if (authLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        {isOffline && <OfflineBanner testID="offline-banner" />}
        <LoadingSkeleton variant="list" count={5} testID="profile-loading" />
      </SafeAreaView>
    );
  }

  if (authError && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        {isOffline && <OfflineBanner testID="offline-banner" />}
        <ErrorState
          message="Failed to load profile"
          onRetry={() => fetchProfile()}
          testID="profile-error"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isOffline && <OfflineBanner testID="offline-banner" />}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} testID="profile-avatar-initial">
              {displayInitial}
            </Text>
          </View>
          <Text style={styles.name} testID="profile-display-name">{displayName}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Level {level} · Rookie designer
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
            <Text style={styles.statLabel} testID="profile-stat-rooms">Rooms</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{designsCount}</Text>
            <Text style={styles.statLabel} testID="profile-stat-designs">Designs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{earnedBadges.length}</Text>
            <Text style={styles.statLabel} testID="profile-stat-badges">Badges</Text>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.badgesSection} testID="profile-badges-section">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <Text style={styles.badgeCount}>
              {earnedBadges.length} of {ALL_BADGES.length}
            </Text>
          </View>
          <View style={styles.badgeGrid}>
            {ALL_BADGES.map((badge) => (
              <View key={badge.id} style={styles.badgeItem} testID={`badge-${badge.id}`}>
                <View
                  style={[
                    styles.badgeIcon,
                    {
                      backgroundColor: badge.earned ? badge.color : "#D7DCEB",
                      shadowColor: badge.earned ? badge.color : "#BCC3D8",
                      opacity: badge.earned ? 1 : 0.45,
                    },
                  ]}
                  testID={badge.earned ? undefined : `badge-${badge.id}-locked`}
                >
                  <View style={styles.badgeIconInner}>
                    {badge.earned ? (
                      <Ionicons name="star" size={26} color="#fff" />
                    ) : (
                      <Ionicons name="lock-closed" size={20} color="#fff" />
                    )}
                  </View>
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
                {!badge.earned && (
                  <Text style={styles.badgeHint} testID={`badge-${badge.id}-hint`}>{badge.lockedHint}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.section}>
          {menuItems.map((item, index) => (
            <Pressable accessibilityRole="button"
              key={item.label}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.lastMenuItem,
              ]}
              onPress={() => item.route && router.push(item.route as any)}
              testID={item.route === "/profile-settings" ? "profile-settings-button" : undefined}
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
            label="Sign out"
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
  badgeHint: {
    fontSize: 10,
    textAlign: "center",
    color: colors.textSecondary,
    lineHeight: 13,
    marginTop: 2,
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
