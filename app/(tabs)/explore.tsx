import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { IsoRoom, Button } from "@/components";
import { useProjectStore } from "@/lib/store";

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { projects } = useProjectStore();
  
  // Get only public projects
  const publicDesigns = projects.filter(p => p.is_public);

  const handleReport = (id: string) => {
    Alert.alert(
      "Report Design",
      "Why are you reporting this design?",
      [
        { text: "Inappropriate content", onPress: () => {} },
        { text: "Spam or misleading", onPress: () => {} },
        { text: "Copyright violation", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ]
    );
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
              editable={false}
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
              onPress={() => handleReport(item.id)}
              accessibilityLabel="Report or block design"
              accessibilityRole="button"
              hitSlop={12}
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
});
