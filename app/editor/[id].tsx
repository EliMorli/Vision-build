import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { STYLE_OPTIONS, StyleOption } from "@/lib/types";
import { useProjectStore } from "@/lib/store";

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
    <View style={styles.container}>
      {/* Room analysis banner */}
      {analysis && (
        <View style={styles.analysisBanner}>
          <View style={styles.analysisHeader}>
            <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
            <Text style={[fonts.title, { color: colors.secondary, fontSize: 16 }]}>
              Room Analyzed
            </Text>
          </View>
          <Text style={fonts.regular}>
            {capitalize(analysis.roomType)}, approx {analysis.estimatedSqFt} sq ft,{" "}
            {analysis.currentStyle}
          </Text>
          {analysis.keyElements.length > 0 && (
            <View style={styles.chips}>
              {analysis.keyElements.map((el, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{el}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={[fonts.title, { marginHorizontal: spacing.md, marginTop: spacing.md }]}>
        Select a Design Style
      </Text>

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
              style={[
                styles.styleCard,
                isSelected && styles.styleCardSelected,
              ]}
              onPress={() => setSelectedStyle(item)}
            >
              <Ionicons
                name={item.icon as any}
                size={32}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  fonts.title,
                  { fontSize: 14, color: isSelected ? colors.primary : colors.textPrimary },
                ]}
              >
                {item.name}
              </Text>
              <Text style={[fonts.regular, { textAlign: "center", fontSize: 12 }]} numberOfLines={2}>
                {item.description}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Generate button */}
      <View style={styles.footer}>
        {loading ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={fonts.regular}>{progressMessage}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.btn, !selectedStyle && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={!selectedStyle}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.btnText}>Generate 4 Designs</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  analysisBanner: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary + "0D",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + "33",
  },
  analysisHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: colors.primary + "1A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  chipText: { fontSize: 12, color: colors.primary },
  grid: { padding: spacing.md, gap: spacing.sm },
  styleCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    gap: 8,
    minHeight: 130,
  },
  styleCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + "0D",
  },
  footer: { padding: spacing.md },
  progressContainer: { alignItems: "center", gap: spacing.sm },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: colors.primary + "1A",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    gap: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
