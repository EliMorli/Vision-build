import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { IsoRoom, Button, ReportModal, ConfirmationSheet, MenuSheet } from "@/components";
import { useProjectStore, useReportStore } from "@/lib/store";

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { projects, fetchProjects } = useProjectStore();
  const blockUser = useReportStore((s) => s.blockUser);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingProjectId, setReportingProjectId] = useState<string>("");
  const [menuSheet, setMenuSheet] = useState<{
    visible: boolean;
    projectId: string;
    userId: string;
  }>({ visible: false, projectId: "", userId: "" });
  const [confirmSheet, setConfirmSheet] = useState<{
    visible: boolean;
    type: "report" | "block" | null;
    projectId: string;
    userId: string;
  }>({ visible: false, type: null, projectId: "", userId: "" });
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  
  // Initialize blocked users from localStorage (for mock mode)
  const getInitialBlockedUsers = (): Set<string> => {
    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      const blocks = JSON.parse(localStorage.getItem("@visionbuild:blocks") || "[]");
      return new Set<string>(blocks.map((b: any) => b.blocked_id));
    }
    return new Set<string>();
  };
  
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(getInitialBlockedUsers());
  
  // Get only public projects from non-blocked users
  const publicDesigns = projects.filter(p => p.is_public && !blockedUsers.has(p.user_id || ""));

  const handleReportMenu = (projectId: string, userId: string) => {
    setMenuSheet({ visible: true, projectId, userId });
  };

  const handleReportOption = () => {
    setConfirmSheet({
      visible: true,
      type: "report",
      projectId: menuSheet.projectId,
      userId: menuSheet.userId,
    });
  };

  const handleBlockOption = () => {
    setConfirmSheet({
      visible: true,
      type: "block",
      projectId: menuSheet.projectId,
      userId: menuSheet.userId,
    });
  };

  const handleConfirmReport = () => {
    const { projectId } = confirmSheet;
    setReportingProjectId(projectId);
    setReportModalVisible(true);
  };

  const handleConfirmBlock = async () => {
    const { userId } = confirmSheet;
    try {
      await blockUser(userId);
      // Add to local blocked list
      setBlockedUsers(prev => new Set([...prev, userId]));
      setSuccessMessage("User blocked. Their designs won't appear in Explore anymore.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setSuccessMessage("Failed to block user. Please try again.");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  // Empty state when no public designs
  if (publicDesigns.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search styles, rooms..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        
        <View style={styles.emptyState}>
          <View style={styles.emptyIllustration}>
            <IsoRoom palette="modern" size={180} spark />
          </View>
          <Text style={styles.emptyTitle}>No shared designs yet</Text>
          <Text style={styles.emptySubtitle}>
            Make a project public to show it here
          </Text>
          <Button
            label="Start a new room"
            icon="add-circle-outline"
            onPress={() => router.push("/(tabs)/camera")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setReportingProjectId("");
          setSuccessMessage("Thank you for reporting. We'll review this design.");
          setTimeout(() => setSuccessMessage(""), 3000);
        }}
        type="design"
        itemId={reportingProjectId}
      />

      <MenuSheet
        visible={menuSheet.visible}
        onClose={() => setMenuSheet({ visible: false, projectId: "", userId: "" })}
        title="Report or Block"
        options={[
          {
            label: "Report this design",
            icon: "flag-outline",
            onPress: handleReportOption,
            testID: "menu-report-option",
          },
          {
            label: "Block this user",
            icon: "ban-outline",
            variant: "destructive",
            onPress: handleBlockOption,
            testID: "menu-block-option",
          },
        ]}
        testID="report-block-menu"
      />

      <ConfirmationSheet
        visible={confirmSheet.visible && confirmSheet.type === "report"}
        onClose={() => setConfirmSheet({ visible: false, type: null, projectId: "", userId: "" })}
        title="Report Design"
        message="Report this design for inappropriate content?"
        confirmLabel="Report"
        confirmVariant="danger"
        onConfirm={handleConfirmReport}
        testID="report-confirm-sheet"
      />

      <ConfirmationSheet
        visible={confirmSheet.visible && confirmSheet.type === "block"}
        onClose={() => setConfirmSheet({ visible: false, type: null, projectId: "", userId: "" })}
        title="Block User"
        message="Block this user? You won't see their designs in Explore anymore."
        confirmLabel="Block User"
        confirmVariant="danger"
        onConfirm={handleConfirmBlock}
        testID="block-confirm-sheet"
      />

      {/* Success message */}
      {successMessage ? (
        <View style={styles.successBanner} testID="success-message">
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search styles, rooms..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Grid of designs */}
      <FlatList
        data={publicDesigns}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`${item.selected_style || 'Unknown'} design`}
            testID="explore-design-card"
          >
            <View style={styles.cardImageWrapper}>
              <IsoRoom
                palette={item.selected_style || "modern"}
                size={160}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
            <Pressable
              style={styles.moreButton}
              onPress={() => handleReportMenu(item.id, item.user_id || "")}
              accessibilityLabel="Report or block"
              accessibilityRole="button"
              hitSlop={12}
              testID="explore-report-button"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </Pressable>
            <View style={styles.cardOverlay}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardCreator}>{item.selected_style || 'Modern'}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...fonts.body,
    color: colors.textPrimary,
  },
  emptyState: {
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
  grid: { padding: spacing.sm },
  row: { gap: spacing.sm },
  card: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.sm,
    position: "relative",
  },
  cardImageWrapper: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  moreButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardCreator: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successText: {
    ...fonts.body,
    color: colors.textPrimary,
    flex: 1,
  },
});
