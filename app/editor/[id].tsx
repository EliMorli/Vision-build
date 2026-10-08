import { useState, useEffect } from "react";
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
import { Button, ProgressBar, Banner, IsoRoom } from "@/components";

// Threshold for showing "long-running" UI: Go to Home option and Home Rendering card
const LONG_RUNNING_THRESHOLD_MS = 45000; // 45 seconds

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const [countdown, setCountdown] = useState(20); // Estimated time in seconds
  const [showLongRunning, setShowLongRunning] = useState(false);
  
  const { 
    currentProject, 
    loading, 
    progress, 
    progressMessage, 
    generateDesigns,
    generatingStartTime,
  } = useProjectStore();

  const analysis = currentProject?.room_analysis;

  // Countdown timer and long-running detection
  useEffect(() => {
    if (!loading || !generatingStartTime) {
      setCountdown(20);
      setShowLongRunning(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - generatingStartTime;
      const remaining = Math.max(0, Math.ceil((20000 - elapsed) / 1000));
      setCountdown(remaining);

      // Check if we've crossed the long-running threshold
      if (elapsed > LONG_RUNNING_THRESHOLD_MS) {
        setShowLongRunning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, generatingStartTime]);

  const handleGenerate = async () => {
    if (!selectedStyle || !id) return;
    // Start generation and immediately navigate to the generating screen
    generateDesigns(id, selectedStyle.promptModifier);
    router.push(`/generating/${id}`);
  };

  const handleGoHome = () => {
    router.push("/(tabs)/");
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
              <View style={styles.styleImage}>
                <IsoRoom 
                  palette={item.id}
                  size={118}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                />
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
          label="Generate 4 Designs"
          icon="sparkles"
          onPress={handleGenerate}
          disabled={!selectedStyle || loading}
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
    borderWidth: 3,
    backgroundColor: colors.primary + "0A",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    transform: [{ translateY: -3 }],
  },
  checkBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
