import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  FlatList,
  Modal,
  ViewToken,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore } from "@/lib/store";
import { Button } from "@/components";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.82;

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentProject, selectDesign } = useProjectStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareUrl, setCompareUrl] = useState("");

  const images = currentProject?.generated_image_urls ?? [];

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleSelect = (url: string) => {
    setSelectedUrl(url);
  };

  const handleContinue = async () => {
    if (!selectedUrl || !id) return;
    await selectDesign(id, selectedUrl);
    router.push(`/handoff/${id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.subtitle}>
        Swipe to browse. Tap to select your favorite.
      </Text>

      {/* Hint pill */}
      <View style={styles.hint}>
        <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
        <Text style={styles.hintText}>Long-press any image to compare with original</Text>
      </View>

      {/* Carousel */}
      <FlatList
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: url, index }) => {
          const isSelected = selectedUrl === url;
          return (
            <Pressable
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => handleSelect(url)}
              onLongPress={() => {
                setCompareUrl(url);
                setShowCompare(true);
              }}
            >
              <Image source={{ uri: url }} style={styles.cardImage} />
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </View>
              )}
              <View style={styles.optionLabel}>
                <Text style={styles.optionText}>Option {index + 1}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {images.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, currentIndex === i ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        <Button
          label="Get Estimates"
          icon="briefcase-outline"
          onPress={handleContinue}
          disabled={!selectedUrl}
          variant="secondary"
        />
      </View>

      {/* Before/After Modal */}
      <Modal visible={showCompare} transparent animationType="fade">
        <Pressable style={styles.modal} onPress={() => setShowCompare(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Before & After</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Image
                  source={{ uri: currentProject?.original_image_url }}
                  style={styles.compareImg}
                />
                <Text style={styles.compareLabel}>Original</Text>
              </View>
              <View style={styles.compareCol}>
                <Image source={{ uri: compareUrl }} style={styles.compareImg} />
                <Text style={styles.compareLabel}>Redesign</Text>
              </View>
            </View>
            <Text style={styles.tapHint}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: spacing.sm,
  },
  subtitle: {
    ...fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: colors.accent + "1A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginVertical: spacing.sm,
  },
  hintText: { fontSize: 12, color: colors.textSecondary },
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
    borderRadius: radius.xl,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    backgroundColor: "#fff",
  },
  cardSelected: { borderWidth: 3, borderColor: colors.primary },
  cardImage: { width: "100%", height: "100%" },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  optionLabel: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  optionText: { color: "#fff", fontSize: 12, fontWeight: "500" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.primary + "33" },
  cta: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    width: width * 0.92,
  },
  modalTitle: { ...fonts.title, marginBottom: spacing.md },
  compareRow: { flexDirection: "row", gap: spacing.sm, width: "100%" },
  compareCol: { flex: 1, alignItems: "center", gap: 6 },
  compareImg: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  compareLabel: { ...fonts.regular, fontSize: 12 },
  tapHint: { ...fonts.regular, fontSize: 12, marginTop: spacing.md },
});
