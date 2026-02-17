import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore, useAuthStore } from "@/lib/store";
import { Project, ProjectStatus } from "@/lib/types";
import { Button, EmptyState } from "@/components";

const STATUS_MAP: Record<ProjectStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft: { label: "Draft", color: colors.textSecondary, icon: "document-outline" },
  analyzed: { label: "Analyzed", color: colors.accent, icon: "search-outline" },
  generated: { label: "Designs Ready", color: colors.primary, icon: "color-palette-outline" },
  connected: { label: "Contractors Matched", color: colors.secondary, icon: "people-outline" },
  completed: { label: "Completed", color: colors.secondary, icon: "checkmark-circle-outline" },
};

export default function DashboardScreen() {
  const router = useRouter();
  const { projects, fetchProjects } = useProjectStore();
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = useCallback(() => {
    fetchProjects();
  }, []);

  const openProject = (project: Project) => {
    useProjectStore.getState().setCurrentProject(project);
    if (project.status === "generated" || project.status === "connected") {
      router.push(`/result/${project.id}`);
    } else if (project.status === "analyzed") {
      router.push(`/editor/${project.id}`);
    }
  };

  // ─── Empty state ──────────────────────────────────────────

  if (projects.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={fonts.heading}>Projects</Text>
          <Pressable onPress={signOut} hitSlop={12}>
            <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <EmptyState
          icon="home-outline"
          title="No projects yet"
          subtitle="Take a photo of any room to start visualizing your renovation."
        >
          <Button
            label="Start Your First Project"
            icon="add-circle-outline"
            onPress={() => router.push("/(tabs)/camera")}
          />
        </EmptyState>
      </SafeAreaView>
    );
  }

  // ─── Project list ─────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={fonts.heading}>Projects</Text>
          {profile && (
            <Text style={styles.greeting}>
              Welcome back, {profile.display_name?.split(" ")[0] ?? "there"}
            </Text>
          )}
        </View>
        <Pressable onPress={signOut} hitSlop={12}>
          <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const status = STATUS_MAP[item.status];
          return (
            <Pressable style={styles.card} onPress={() => openProject(item)}>
              <Image
                source={{ uri: item.selected_generation_url ?? item.original_image_url }}
                style={styles.cardImage}
              />
              <View style={[styles.statusChip, { backgroundColor: status.color + "E6" }]}>
                <Ionicons name={status.icon} size={12} color="#fff" />
                <Text style={styles.statusText}>{status.label}</Text>
              </View>
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
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: { ...fonts.regular, marginTop: 2 },
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
  statusText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  cardBody: { padding: spacing.md, gap: 4 },
  cardTitle: { ...fonts.title, fontSize: 17 },
  cardSub: { ...fonts.regular, lineHeight: 20 },
});
