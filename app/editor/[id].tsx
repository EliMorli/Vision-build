import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { STYLE_OPTIONS, StyleOption } from "@/lib/types";
import { useProjectStore } from "@/lib/store";
import { Button, Banner, IsoRoom } from "@/components";

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { 
    currentProject, 
    loading, 
    generateDesigns,
  } = useProjectStore();

  const analysis = currentProject?.room_analysis;

  const handleGenerate = async () => {
    if (!selectedStyle || !id || isGenerating) return;
    setIsGenerating(true);
    
    try {
      // Navigate to generating screen first, then start generation
      router.push(`/generating/${id}`);
      
      // Start generation (will update store which generating screen monitors)
      await generateDesigns(id, selectedStyle.promptModifier);
    } catch (_error) {
      console.error("Generate error:", _error);
    } finally {
      setIsGenerating(false);
    }
  };

  const capitalize = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

  return (
    <SafeAreaView style={styles.container}>
      {/* Room analysis banner */}
      {analysis && (
        <Banner
          icon="checkmark-circle"
          iconColor={colors.secondary}
          title="Room Analyzed"
          subtitle={`${capitalize(analysis.roomType)}, approx ${analysis.estimatedSqFt} sq ft, ${analysis.currentStyle}`}
          style={styles.banner}
        >
          {analysis.keyElements.length > 0 && (
            <View style={styles.chips}>
              {analysis.keyElements.map((el, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{el}</Text>
                </View>
              ))}
            </View>
          )}
        </Banner>
      )}

      <Text style={styles.sectionTitle} testID="style-picker-header">Pick a style</Text>

      {/* Style grid */}
      <FlatList
        data={STYLE_OPTIONS}
        numColumns={2}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => {
          const isSelected = selectedStyle?.id === item.id;
          return (
            <Pressable
              style={[styles.styleCard, isSelected && styles.styleCardSelected]}
              onPress={() => setSelectedStyle(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.name} style`}
            >
              <View style={styles.styleImage}>
                <IsoRoom 
                  palette={item.id}
                  size={118}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                />
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.styleName,
                  isSelected && { color: colors.primary },
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label={selectedStyle ? "Generate 4 designs" : "Pick a style"}
          icon="sparkles"
          onPress={handleGenerate}
          disabled={!selectedStyle || loading || isGenerating}
          loading={isGenerating}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  banner: { margin: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.primary + "1A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  chipText: { fontSize: 12, color: colors.primary, fontWeight: "500" },
  sectionTitle: {
    ...fonts.title,
    fontSize: 18,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  grid: { padding: spacing.md, gap: spacing.sm },
  styleCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    paddingBottom: 10,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#fff",
    gap: 4,
    minHeight: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 5,
  },
  styleCardSelected: {
    borderColor: colors.primary,
    borderWidth: 4,
    backgroundColor: colors.primary + "0A",
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  styleImage: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  styleName: { fontSize: 14, fontWeight: "900", color: colors.textPrimary, marginHorizontal: 6 },
  footer: { padding: spacing.md },
});
