import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore, useAuthStore } from "@/lib/store";
import { Project, ProjectStatus } from "@/lib/types";
import { Button, EmptyState, IsoRoom, PrivateImage, ProsTeaserCard } from "@/components";

// Long-running threshold for showing "Rendering..." card in Home
const LONG_RUNNING_THRESHOLD_MS = 45000; // 45 seconds

const STATUS_MAP: Record<ProjectStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft: { label: "Draft", color: colors.textSecondary, icon: "document-outline" },
  analyzed: { label: "Ready for design", color: colors.accent, icon: "search-outline" },
  rendering: { label: "Rendering...", color: colors.accent, icon: "hourglass-outline" },
  generated: { label: "Designs ready", color: colors.primary, icon: "color-palette-outline" },
  connected: { label: "Designs ready", color: colors.primary, icon: "color-palette-outline" }, // Hidden at launch
  completed: { label: "Completed", color: colors.secondary, icon: "checkmark-circle-outline" },
};

const SHOW_DEV_BUTTON = 
  (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === 'true';

export default function DashboardScreen() {
  const router = useRouter();
  const { projects, fetchProjects, generatingStartTime } = useProjectStore();
  const profile = useAuthStore((s) => s.profile);
  const [showRenderingCard, setShowRenderingCard] = useState(false);
  const [prosCardKey, setProsCardKey] = useState(0);

  // NOTE: AI consent is now enforced server-side in analyze-room, generate-design, and assistant-chat
  // Removed client-side useAIConsentCheck() - consent errors trigger re-consent flow with resume capability

  const xp = profile?.xp || 0;
  const level = profile?.level || 1;
  const xpForNextLevel = level * 200;
  const xpProgress = (xp % 200) / xpForNextLevel;

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useFocusEffect(
    useCallback(() => {
      setProsCardKey(k => k + 1);
    }, [])
  );

  // Only show "Rendering..." card if generation has been running > 45 seconds
  useEffect(() => {
    if (!generatingStartTime) {
      return; // Don't set state in effect body
    }

    const checkLongRunning = () => {
      const elapsed = Date.now() - generatingStartTime;
      setShowRenderingCard(elapsed > LONG_RUNNING_THRESHOLD_MS);
    };

    // Check initially after a brief delay
    const initialTimeout = setTimeout(checkLongRunning, 100);
    const interval = setInterval(checkLongRunning, 5000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [generatingStartTime]);

  const onRefresh = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openProject = (project: Project) => {
    useProjectStore.getState().setCurrentProject(project);
    // Navigate to project detail page
    router.push(`/project/${project.id}`);
  };

  // ─── Empty state ──────────────────────────────────────────

  if (projects.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hey {profile?.display_name?.split(" ")[0] || "there"}</Text>
            <Text style={fonts.heading}>Ready to redesign?</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable 
              onPress={() => router.push("/profile-settings")} 
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`${xp} experience points, tap to view profile`}
            >
              <View style={styles.xpChip}>
                <Ionicons name="star" size={14} color={colors.accent} />
                <Text style={styles.xpText}>{xp} XP</Text>
              </View>
            </Pressable>
            {SHOW_DEV_BUTTON && (
              <Pressable 
                onPress={() => router.push("/profile-settings")} 
                hitSlop={12}
                style={styles.devButton} // SHOW_DEV_BUTTON && gated
                accessibilityLabel="Developer tools"
              >
                <Ionicons name="flash" size={18} color={colors.accent} />
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.emptyContent}>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <IsoRoom palette="modern" size={220} spark />
            </View>
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptySubtitle}>
              Take a photo of any room to start visualizing your renovation.
            </Text>
            <Button
              label="Start your first project"
              onPress={() => router.push("/(tabs)/camera")}
              icon="add-circle-outline"
            />
          </View>
          
          <ProsTeaserCard key={prosCardKey} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Project list ─────────────────────────────────────────

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Button
        label="Start a new room"
        icon="add-circle-outline"
        onPress={() => router.push("/(tabs)/camera")}
        fullWidth
      />
    </View>
  );
  
  const renderFooter = () => (
    <View style={styles.headerSection}>
      <ProsTeaserCard key={prosCardKey} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hey {profile?.display_name?.split(" ")[0] || "there"}</Text>
          <Text style={fonts.heading}>Ready to redesign?</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push("/profile-settings")} hitSlop={12}>
            <View style={styles.xpChip}>
              <Ionicons name="star" size={14} color={colors.accent} />
              <Text style={styles.xpText}>{xp} XP</Text>
            </View>
          </Pressable>
          {SHOW_DEV_BUTTON && (
            <Pressable 
              onPress={() => router.push("/profile-settings")} 
              hitSlop={12}
              style={styles.devButton} // SHOW_DEV_BUTTON && gated
              accessibilityLabel="Developer tools"
            >
              <Ionicons name="flash" size={18} color={colors.accent} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const shouldShowRendering = item.status === "rendering" && showRenderingCard;
          const displayStatus = (item.status === "rendering" && !shouldShowRendering) 
            ? "analyzed" 
            : item.status;
          
          const status = STATUS_MAP[displayStatus];
          const designCount = item.generated_image_urls?.length || 0;
          
          return (
            <Pressable 
              style={styles.card} 
              onPress={() => openProject(item)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title} project`}
              testID="home-project-card"
            >
              {item.selected_generation_url || item.original_image_url ? (
                <PrivateImage
                  bucket="room-photos"
                  path={item.selected_generation_url ?? item.original_image_url}
                  palette={item.selected_style || "modern"}
                  placeholderSize={170}
                  style={styles.cardImage}
                  containerStyle={styles.cardImage}
                  accessibilityLabel={`${item.title} thumbnail`}
                />
              ) : item.selected_style ? (
                <View style={styles.cardIsoWrapper}>
                  <IsoRoom 
                    palette={item.selected_style}
                    size={360}
                    accessibilityLabel={`${item.title} design`}
                  />
                </View>
              ) : null}
              <View style={[styles.statusChip, { backgroundColor: status.color + "E6" }]}>
                <Ionicons name={status.icon} size={12} color="#fff" />
                <Text style={styles.statusText}>{status.label}</Text>
              </View>
              {designCount > 0 && (
                <View style={styles.designCountBadge}>
                  <Ionicons name="images" size={12} color={colors.primary} />
                  <Text style={styles.designCountText}>{designCount}</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardSub} numberOfLines={2}>
                  {item.room_analysis?.rawAnalysis ?? "Processing..."}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  greeting: { 
    ...fonts.regular, 
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  xpChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 0,
    elevation: 3,
    borderBottomWidth: 3,
    borderBottomColor: "#DDE2F1",
  },
  xpText: {
    fontSize: 12,
    fontFamily: "Nunito_900Black",
    color: colors.textPrimary,
  },
  devButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  headerSection: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  list: { padding: spacing.md, paddingTop: 0 },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardImage: { width: "100%", height: 170, backgroundColor: colors.surface },
  cardIsoWrapper: {
    width: "100%",
    height: 170,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChip: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusText: { color: "#fff", fontSize: 11, fontFamily: "Nunito_700Bold" },
  designCountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  designCountText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: colors.primary,
  },
  cardBody: { padding: spacing.md, gap: 4 },
  cardTitle: { ...fonts.title, fontSize: 17 },
  cardSub: { ...fonts.regular, lineHeight: 20 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyIllustration: {
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyTitle: {
    ...fonts.heading,
    fontSize: 24,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  emptySubtitle: {
    ...fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  emptyContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
