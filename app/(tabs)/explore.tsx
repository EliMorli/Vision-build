import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { IsoRoom } from "@/components";

// Placeholder data - only public projects
const PLACEHOLDER_DESIGNS = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  title: `Design ${i + 1}`,
  style: ["modern", "coastal", "farmhouse", "industrial", "luxury", "scandinavian"][i % 6],
  likes: Math.floor(Math.random() * 500) + 50,
  isPublic: true,
}));

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState("");

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
        data={PLACEHOLDER_DESIGNS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <View style={styles.cardImageWrapper}>
              <IsoRoom
                palette={item.style}
                size={160}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
            <Pressable
              style={styles.moreButton}
              onPress={() => handleReport(item.id)}
              accessibilityLabel="Report or block"
              hitSlop={8}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </Pressable>
            <View style={styles.cardOverlay}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardStyle}>{item.style}</Text>
                <View style={styles.likes}>
                  <Ionicons name="heart-outline" size={14} color="#fff" />
                  <Text style={styles.likesText}>{item.likes}</Text>
                </View>
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
  cardStyle: {
    color: "#fff",
    fontSize: 12,
  },
  likes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likesText: {
    color: "#fff",
    fontSize: 12,
  },
});
