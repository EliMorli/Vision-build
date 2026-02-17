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
import { Button, ProgressBar, Banner } from "@/components";

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const { currentProject, loading, progress, progressMessage, generateDesigns } =
    useProjectStore();

  const analysis = currentProject?.room_analysis;

  const handleGenerate = async () => {
    if (!selectedStyle || !id) return;
    const result = await generateDesigns(id, selectedStyle.promptModifier);
    if (result) {
      router.push(`/result/${id}`);
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

      <Text style={styles.sectionTitle}>Select a Design Style</Text>

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
            >
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
              <Ionicons
                name={item.icon as any}
                size={30}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.styleName,
                  isSelected && { color: colors.primary },
                ]}
              >
                {item.name}
              </Text>
              <Text style={styles.styleDesc} numberOfLines={2}>
                {item.description}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {loading ? (
          <ProgressBar progress={progress} message={progressMessage} />
        ) : (
          <Button
            label="Generate 4 Designs"
            icon="sparkles"
            onPress={handleGenerate}
            disabled={!selectedStyle}
            variant="primary"
          />
        )}
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
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#fff",
    gap: 6,
    minHeight: 130,
  },
  styleCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + "0A",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  styleName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  styleDesc: { ...fonts.regular, textAlign: "center", fontSize: 12 },
  footer: { padding: spacing.md },
});
