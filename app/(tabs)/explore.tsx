import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  Pressable,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";

// Placeholder data
const PLACEHOLDER_DESIGNS = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: `Design ${i + 1}`,
  style: ["Modern", "Coastal", "Farmhouse", "Industrial"][i % 4],
  imageUrl: `https://placehold.co/300x300/${["1A73E8", "34A853", "FBBC04", "EA4335"][i % 4]}/FFFFFF?text=Design+${i + 1}`,
  likes: Math.floor(Math.random() * 500) + 50,
}));

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState("");

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
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
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
  },
  cardImage: {
    width: "100%",
    height: "100%",
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
