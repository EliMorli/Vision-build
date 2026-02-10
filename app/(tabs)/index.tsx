import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore, useAuthStore } from "@/lib/store";
import { Project, ProjectStatus } from "@/lib/types";

const STATUS_LABELS: Record<ProjectStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: colors.textSecondary },
  analyzed: { label: "Analyzed", color: colors.accent },
  generated: { label: "Designs Ready", color: colors.primary },
  connected: { label: "Contractors Matched", color: colors.secondary },
  completed: { label: "Completed", color: colors.secondary },
};

export default function DashboardScreen() {
  const router = useRouter();
  const { projects, fetchProjects } = useProjectStore();
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
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

  if (projects.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="home-outline" size={48} color={colors.primary + "80"} />
        </View>
        <Text style={fonts.heading}>No projects yet</Text>
        <Text style={[fonts.body, { color: colors.textSecondary, textAlign: "center", marginTop: 12 }]}>
          Take a photo of any room to start visualizing your renovation.
        </Text>
        <Pressable
          style={[styles.btn, { marginTop: spacing.xl }]}
          onPress={() => router.push("/(tabs)/camera")}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Start Your First Project</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={projects}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const status = STATUS_LABELS[item.status];
        return (
          <Pressable style={styles.card} onPress={() => openProject(item)}>
            <Image
              source={{ uri: item.selected_generation_url ?? item.original_image_url }}
              style={styles.cardImage}
            />
            <View style={[styles.statusChip, { backgroundColor: status.color + "E6" }]}>
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={fonts.title} numberOfLines={1}>{item.title}</Text>
              <Text style={fonts.regular} numberOfLines={2}>
                {item.room_analysis?.rawAnalysis ?? "Processing..."}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardImage: { width: "100%", height: 160 },
  statusChip: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  cardBody: { padding: spacing.md, gap: 4 },
});
