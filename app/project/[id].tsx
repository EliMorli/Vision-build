import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore, useAuthStore } from "@/lib/store";
import { IsoRoom, MakePublicSheet, PrivateImage } from "@/components";

// Helper to format text to sentence case
function toSentenceCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Placeholder timeline data
const TIMELINE_EVENTS = [
  { id: "1", type: "photo", label: "Original photo uploaded", date: "3 days ago" },
  { id: "2", type: "analysis", label: "Room analyzed", date: "3 days ago" },
  { id: "3", type: "chat", label: "Started Vi brainstorm", date: "2 days ago" },
  { id: "4", type: "design", label: "4 designs generated", date: "2 days ago" },
  { id: "5", type: "favorite", label: "Saved 2 favorites", date: "1 day ago" },
];

// Placeholder designs - using IsoRoom for placeholders
const DESIGNS = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  style: ["modern", "farmhouse", "coastal", "industrial", "luxury", "scandinavian"][i],
  source: i < 4 ? "photo" : "chat",
  isFavorite: i === 1 || i === 4,
}));

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"designs" | "timeline">("designs");
  
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const toggleProjectPrivacy = useProjectStore((s) => s.toggleProjectPrivacy);
  const profile = useAuthStore((s) => s.profile);
  const project = projects.find((p) => p.id === id);
  const [isPublic, setIsPublic] = useState(project?.is_public ?? false);
  const [showMakePublicSheet, setShowMakePublicSheet] = useState(false);
  
  // Fetch projects if not found (for E2E tests that seed localStorage)
  useEffect(() => {
    if (!project && id) {
      fetchProjects();
    }
  }, [id, project, fetchProjects]);

  // Use actual project data instead of hardcoded values
  const roomType = project?.room_analysis?.roomType || "room";
  const sqFt = project?.room_analysis?.estimatedSqFt || 0;
  const currentStyle = project?.room_analysis?.currentStyle || "";
  const keyElements = project?.room_analysis?.keyElements || [];
  const selectedStyle = project?.selected_style || "modern";
  const generatedDesigns = project?.generated_image_urls || [];
  
  // Build title from room type
  const projectTitle = project?.title || `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Renovation`;

  const handleTogglePrivacy = () => {
    if (!project) return;

    if (!isPublic) {
      // Show confirmation sheet before making public
      setShowMakePublicSheet(true);
    } else {
      // Switch back to private (no confirmation needed)
      setIsPublic(false);
      toggleProjectPrivacy(project.id, false);
    }
  };

  const handleMakePublic = async () => {
    if (!project) return;
    setShowMakePublicSheet(false);
    setIsPublic(true);
    await toggleProjectPrivacy(project.id, true);
  };

  const handleKeepPrivate = () => {
    setShowMakePublicSheet(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Make Public Confirmation Sheet */}
      <MakePublicSheet
        visible={showMakePublicSheet}
        onMakePublic={handleMakePublic}
        onKeepPrivate={handleKeepPrivate}
        userHandle={profile?.display_name}
        userLevel={profile?.level}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{toSentenceCase(projectTitle)}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        {/* Privacy Control */}
        <View style={styles.privacySection}>
          <View style={styles.privacyInfo}>
            <View style={styles.privacyIconCircle}>
              <Ionicons
                name={isPublic ? "globe-outline" : "lock-closed"}
                size={18}
                color={isPublic ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.privacyText}>
              <Text style={styles.privacyLabel}>
                {isPublic ? "Public" : "Private"}
              </Text>
              <Text style={styles.privacyDescription}>
                {isPublic
                  ? "Visible in Explore"
                  : "Only visible to you"}
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.privacySwitch, isPublic && styles.privacySwitchOn]}
            onPress={handleTogglePrivacy}
            accessibilityRole="switch"
            accessibilityState={{ checked: isPublic }}
            accessibilityLabel={`Make project ${isPublic ? "private" : "public"}`}
          >
            <View style={[styles.privacySwitchThumb, isPublic && styles.privacySwitchThumbOn]} />
          </Pressable>
        </View>

        {/* Original photo */}
        <View style={styles.originalSection}>
          <Text style={styles.sectionTitle}>Original Photo</Text>
          <PrivateImage
            bucket="room-photos"
            path={project?.original_image_url}
            palette={selectedStyle}
            placeholderSize={200}
            style={styles.originalImage}
            containerStyle={styles.originalImage}
            accessibilityLabel={`Original ${roomType} photo before renovation`}
          />
          <View style={styles.analysisChips}>
            {sqFt > 0 && (
              <View style={styles.chip}>
                <Ionicons name="resize-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.chipText}>{sqFt} sq ft</Text>
              </View>
            )}
            {currentStyle && (
              <View style={styles.chip}>
                <Ionicons name="home-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.chipText}>{toSentenceCase(currentStyle)}</Text>
              </View>
            )}
            {keyElements.slice(0, 1).map((element, i) => (
              <View key={i} style={styles.chip}>
                <Ionicons name="list-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.chipText}>{toSentenceCase(element)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "designs" && styles.tabActive]}
            onPress={() => setActiveTab("designs")}
          >
            <Text style={[styles.tabText, activeTab === "designs" && styles.tabTextActive]}>
              Designs ({generatedDesigns.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "timeline" && styles.tabActive]}
            onPress={() => setActiveTab("timeline")}
          >
            <Text style={[styles.tabText, activeTab === "timeline" && styles.tabTextActive]}>
              Timeline
            </Text>
          </Pressable>
        </View>

        {/* Tab content */}
        {activeTab === "designs" && (
          <View style={styles.designsGrid}>
            {generatedDesigns.length > 0 ? (
              generatedDesigns.map((designUrl, index) => (
                <Pressable
                  key={index}
                  style={styles.designCard}
                  onPress={() => router.push(`/result/${id}`)}
                  testID="design-card"
                >
                  <PrivateImage
                    bucket="room-photos"
                    path={designUrl}
                    palette={selectedStyle}
                    placeholderSize={180}
                    style={styles.designImage}
                    containerStyle={styles.designImage}
                    accessibilityLabel={`Design option ${index + 1}`}
                  />
                  {designUrl === project?.selected_generation_url && (
                    <View style={styles.favoritebadge}>
                      <Ionicons name="heart" size={16} color={colors.error} />
                    </View>
                  )}
                  <View style={styles.sourceTag}>
                    <Ionicons name="camera" size={10} color="#fff" />
                    <Text style={styles.sourceText}>Photo</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No designs yet</Text>
                <Pressable
                  style={styles.createButton}
                  onPress={() => router.push(`/editor/${id}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Create designs"
                >
                  <Text style={styles.createButtonText}>Create designs</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {activeTab === "timeline" && (
          <View style={styles.timelineContainer}>
            {TIMELINE_EVENTS.map((event, index) => (
              <View key={event.id} style={styles.timelineEvent}>
                <View style={styles.timelineLine}>
                  <View style={styles.timelineDot} />
                  {index < TIMELINE_EVENTS.length - 1 && (
                    <View style={styles.timelineConnector} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>{event.label}</Text>
                  <Text style={styles.timelineDate}>{event.date}</Text>
                </View>
              </View>
            ))}
          </View>
        )}


        {/* Chat summary */}
        <View style={styles.chatSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Brainstorm with Vi</Text>
            <Pressable onPress={() => router.push("/assistant-chat")}>
              <Text style={styles.viewAllLink}>View chat</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.chatPreview}
            onPress={() => router.push("/assistant-chat")}
          >
            <View style={styles.viAvatar}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
            <View style={styles.chatPreviewText}>
              <Text style={styles.chatMessage} numberOfLines={2}>
                "Those warm tones will really brighten up the space. Want to see what it
                could look like?"
              </Text>
              <Text style={styles.chatTimestamp}>2 days ago</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Project brief */}
        {project?.lead_info?.projectBrief && (
          <View style={styles.briefSection} testID="project-brief">
            <Text style={styles.sectionTitle}>Project brief</Text>
            <View style={styles.briefCard}>
              <Text style={styles.briefText}>
                {project.lead_info.projectBrief}
              </Text>
              <Pressable
                style={styles.briefButton}
                onPress={() => router.push(`/pros-coming-soon?projectId=${id}`)}
                testID="project-brief-waitlist"
              >
                <Text style={styles.briefButtonText}>Join the pros waitlist</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...fonts.title, fontSize: 18 },
  privacySection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  privacyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  privacyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  privacyText: {
    flex: 1,
  },
  privacyLabel: {
    ...fonts.body,
    fontFamily: "Nunito_700Bold",
    marginBottom: 2,
  },
  privacyDescription: {
    ...fonts.regular,
    fontSize: 13,
  },
  privacySwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: "center",
  },
  privacySwitchOn: {
    backgroundColor: colors.primary,
  },
  privacySwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  privacySwitchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  originalSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...fonts.title,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  originalImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  analysisChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
  },
  designsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.sm,
  },
  designCard: {
    width: "50%",
    padding: spacing.sm,
  },
  designImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  favoritebadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceTag: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  sourceText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Nunito_700Bold",
  },
  timelineContainer: {
    padding: spacing.lg,
  },
  timelineEvent: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  timelineLine: {
    width: 32,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  timelineLabel: {
    ...fonts.body,
    fontFamily: "Nunito_700Bold",
  },
  timelineDate: {
    ...fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  quoteCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  quoteInfo: {
    flex: 1,
  },
  quoteName: {
    ...fonts.body,
    fontFamily: "Nunito_700Bold",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  quoteDetails: {
    gap: spacing.sm,
  },
  quoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  quoteValue: {
    ...fonts.body,
    fontSize: 15,
  },
  chatSection: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  viewAllLink: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
  },
  chatPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  viAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  chatPreviewText: {
    flex: 1,
  },
  chatMessage: {
    ...fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  chatTimestamp: {
    ...fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  briefSection: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  briefCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  briefText: {
    ...fonts.body,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  briefButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  briefButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...fonts.title,
    fontSize: 16,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderBottomWidth: 4,
    borderBottomColor: "#0F4FB0",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  emptySubtext: {
    ...fonts.body,
    fontSize: 14,
    marginTop: spacing.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
