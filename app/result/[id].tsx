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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore } from "@/lib/store";

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

  const handleSelect = (url: string) => {
    setSelectedUrl(url);
  };

  const handleContinue = async () => {
    if (!selectedUrl || !id) return;
    await selectDesign(id, selectedUrl);
    router.push(`/handoff/${id}`);
  };

  return (
    <View style={styles.container}>
      <Text style={[fonts.regular, { textAlign: "center" }]}>
        Swipe to browse. Tap to select your favorite.
      </Text>

      {/* Hint */}
      <View style={styles.hint}>
        <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />
        <Text style={fonts.regular}>
          Long-press any image to compare with original
        </Text>
      </View>

      {/* Carousel */}
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
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
                  <Ionicons name="checkmark" size={20} color="#fff" />
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
            style={[
              styles.dot,
              currentIndex === i ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <Pressable
        style={[styles.ctaBtn, !selectedUrl && styles.ctaBtnDisabled]}
        onPress={handleContinue}
        disabled={!selectedUrl}
      >
        <Ionicons name="handshake-outline" size={20} color="#fff" />
        <Text style={styles.ctaText}>Get Estimates</Text>
      </Pressable>

      {/* Before/After Modal */}
      <Modal visible={showCompare} transparent animationType="fade">
        <Pressable style={styles.modal} onPress={() => setShowCompare(false)}>
          <View style={styles.modalContent}>
            <Text style={fonts.title}>Before & After</Text>
            <Image
              source={{ uri: currentProject?.original_image_url }}
              style={styles.compareImg}
            />
            <Ionicons name="arrow-down" size={24} color={colors.primary} />
            <Image source={{ uri: compareUrl }} style={styles.compareImg} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    backgroundColor: colors.accent + "1A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginVertical: spacing.md,
  },
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
    borderRadius: radius.md,
  },
  optionText: { color: "#fff", fontSize: 13 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.primary + "33" },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.lg,
    paddingVertical: 16,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    gap: 8,
  },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
    width: width * 0.9,
  },
  compareImg: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
  },
});
