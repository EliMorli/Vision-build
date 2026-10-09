import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  Modal,
  ViewToken,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore, useAuthStore } from "@/lib/store";
import { Button, IsoRoom, PrivateImage, LoadingSkeleton, ErrorState, OfflineBanner } from "@/components";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import { useProjectById } from "@/lib/hooks/useProjectById";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.82;

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectDesign, loading } = useProjectStore();
  const { project: currentProject, resolving, retry } = useProjectById(id);
  const profile = useAuthStore((s) => s.profile);
  const [error, setError] = useState<string | null>(null);
  const networkStatus = useNetworkStatus();
  const isOffline = !networkStatus.isConnected;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const reduceMotion = useReducedMotion();
  const [showCompare, setShowCompare] = useState(false);
  const [compareUrl, setCompareUrl] = useState("");
  const [showXPBanner, setShowXPBanner] = useState(true);
  const [xpBannerScale] = useState(new Animated.Value(reduceMotion ? 1 : 0.9));
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const images = currentProject?.generated_image_urls ?? [];
  const totalSlots = 4;
  const allSlots = Array.from({ length: totalSlots }, (_, i) => images[i] || null);

  // Check waitlist status on mount
  useEffect(() => {
    if (!id) return;
    
    const checkWaitlistStatus = async () => {
      const userId = useAuthStore.getState().session?.user?.id;
      
      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
        const stored = await AsyncStorage.getItem(`@visionbuild:waitlist:${id}`);
        setIsOnWaitlist(stored === "true");
        return;
      }

      if (!userId) return;

      try {
        const { data } = await (supabase
          .from("pro_waitlist") as any)
          .select("id")
          .eq("user_id", userId)
          .eq("project_id", id)
          .single();

        setIsOnWaitlist(!!data);
      } catch {
        // Not on waitlist
      }
    };

    checkWaitlistStatus();
  }, [id]);

  // XP banner animation
  useEffect(() => {
    if (showXPBanner) {
      if (reduceMotion) {
        // Skip animation, set to final state immediately
        xpBannerScale.setValue(1);
      } else {
        Animated.spring(xpBannerScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [showXPBanner, reduceMotion, xpBannerScale]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleSelect = (url: string) => {
    setSelectedUrl(url);
  };

  const handleContinue = async () => {
    if (!selectedUrl || !id || isSaving || isOffline) return;
    
    setIsSaving(true);
    try {
      await selectDesign(id, selectedUrl);
      router.push(`/project/${id}`);
    } catch (_error) {
      console.error("design_save_failed");
      setError("Failed to save selection");
    } finally {
      setIsSaving(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!id || isOnWaitlist || waitlistLoading || isOffline) return;

    setWaitlistLoading(true);

    try {
      const userId = useAuthStore.getState().session?.user?.id;
      const email = profile?.email || "";

    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await AsyncStorage.setItem(`@visionbuild:waitlist:${id}`, "true");
      setIsOnWaitlist(true);
      return;
    }

      if (!userId) return;

      const { error } = await (supabase
        .from("pro_waitlist") as any)
        .insert({
          user_id: userId,
          project_id: id,
          email,
        });

      if (!error) {
        setIsOnWaitlist(true);
      }
    } catch (_err) {
      console.error("pros_waitlist_join_failed");
    } finally {
      setWaitlistLoading(false);
    }
  };

  // Loading state
  if ((loading || resolving) && images.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {isOffline && <OfflineBanner testID="offline-banner" />}
        <LoadingSkeleton variant="card" count={1} testID="results-loading" />
      </SafeAreaView>
    );
  }

  // Error state
  if (error || images.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {isOffline && <OfflineBanner testID="offline-banner" />}
        <ErrorState
          message={error || "No designs available"}
          onRetry={() => {
            setError(null);
            retry();
          }}
          testID="results-error"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isOffline && <OfflineBanner testID="offline-banner" />}
      {/* XP reward banner */}
      {showXPBanner && (
        <Animated.View style={[styles.xpBanner, { transform: [{ scale: xpBannerScale }] }]}>
          <View style={styles.xpIconCircle}>
            <Ionicons name="star" size={18} color="#fff" />
          </View>
          <View style={styles.xpTextWrapper}>
            <Text style={styles.xpTitle}>Room redesigned!</Text>
            <Text style={styles.xpSubtitle}>Quest complete</Text>
          </View>
          <Text style={styles.xpAmount}>+50 XP</Text>
          <Pressable 
            onPress={() => setShowXPBanner(false)}
            hitSlop={8}
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={18} color="#8A6A00" />
          </Pressable>
        </Animated.View>
      )}

      {showXPBanner && <View style={styles.xpSpacer} />}

      <Text style={styles.subtitle}>
        Swipe to browse. Tap to select your favorite.
      </Text>

      {/* AI disclaimer */}
      <View style={styles.aiDisclaimer}>
        <Ionicons name="information-circle" size={14} color={colors.textSecondary} />
        <Text style={styles.aiDisclaimerText}>
          AI visualization, not a plan or quote
        </Text>
      </View>

      {/* Hint pill */}
      <View style={styles.hint}>
        <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
        <Text style={styles.hintText}>Long-press any image to compare with original</Text>
      </View>

      {/* Carousel */}
      <FlatList
        data={allSlots}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 }}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: url, index }) => {
          const isSelected = selectedUrl === url;
          const isGenerating = !url && index < images.length + 1 && loading;
          const isPlaceholder = !url && !isGenerating;
          const style = currentProject?.selected_style || "modern";
          
          return (
            <Pressable
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => url && handleSelect(url)}
              onLongPress={() => {
                if (url) {
                  setCompareUrl(url);
                  setShowCompare(true);
                }
              }}
              disabled={!url}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Design option ${index + 1}${isSelected ? ", selected" : ""}`}
              testID={url ? "result-design-card" : undefined}
            >
              {url ? (
                <>
                  <PrivateImage
                    bucket="room-photos"
                    path={url}
                    palette={style}
                    placeholderSize={CARD_WIDTH}
                    style={styles.cardImage}
                    containerStyle={styles.cardImage}
                    accessibilityLabel={`Design option ${index + 1}`}
                  />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={22} color="#fff" />
                    </View>
                  )}
                  <View style={styles.optionLabel}>
                    <Text style={styles.optionText}>Option {index + 1}</Text>
                  </View>
                </>
              ) : isGenerating ? (
                <View style={styles.generatingCard}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.generatingText}>Generating...</Text>
                </View>
              ) : (
                <View style={styles.placeholderCard}>
                  <IsoRoom palette={style as any} size={CARD_WIDTH} />
                  <View style={styles.optionLabel}>
                    <Text style={styles.optionText}>Option {index + 1}</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {allSlots.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, currentIndex === i ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* Waitlist Card */}
      {!isOnWaitlist && (
        <View style={styles.waitlistCard} testID="results-waitlist-card">
          <Text style={styles.waitlistTitle}>Want this built?</Text>
          <Pressable
            style={[styles.waitlistButton, waitlistLoading && styles.waitlistButtonDisabled]}
            onPress={handleJoinWaitlist}
            disabled={waitlistLoading}
            testID="results-waitlist-join"
            accessibilityRole="button"
            accessibilityLabel="Join the waitlist"
          >
            <Text style={styles.waitlistButtonText}>
              {waitlistLoading ? "Joining..." : "Join the waitlist"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* CTA */}
      <View style={styles.cta}>
        {!selectedUrl && (
          <Text style={styles.ctaHint}>Pick a favorite to save</Text>
        )}
        <Button
          label="Save to my project"
          icon="checkmark-circle"
          onPress={handleContinue}
          disabled={!selectedUrl || isSaving}
          loading={isSaving}
          variant="secondary"
          testID="results-save"
        />
      </View>

      {/* Before/After Modal */}
      <Modal visible={showCompare} transparent animationType={reduceMotion ? "none" : "fade"}>
        <Pressable style={styles.modal} onPress={() => setShowCompare(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Before & After</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <PrivateImage
                  bucket="room-photos"
                  path={currentProject?.original_image_url}
                  palette={currentProject?.selected_style || "modern"}
                  placeholderSize={180}
                  style={styles.compareImg}
                  containerStyle={styles.compareImg}
                  accessibilityLabel="Original room photo"
                />
                <Text style={styles.compareLabel}>Original</Text>
              </View>
              <View style={styles.compareCol}>
                <PrivateImage
                  bucket="room-photos"
                  path={compareUrl}
                  palette={currentProject?.selected_style || "modern"}
                  placeholderSize={180}
                  style={styles.compareImg}
                  containerStyle={styles.compareImg}
                  accessibilityLabel="Redesigned room"
                />
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
  xpBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: "linear-gradient(90deg, #FFF4D1, #FFE7A3)",
    shadowColor: "#F0C850",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  xpIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.accent,
    shadowColor: "#D99A00",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  xpTextWrapper: {
    flex: 1,
  },
  xpTitle: {
    fontSize: 14,
    fontFamily: "Nunito_900Black",
    color: colors.textPrimary,
  },
  xpSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#8A6A00",
  },
  xpAmount: {
    fontSize: 18,
    fontFamily: "Nunito_900Black",
    color: "#B37A00",
  },
  xpSpacer: {
    height: 12,
  },
  subtitle: {
    ...fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  aiDisclaimer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.xs,
  },
  aiDisclaimerText: {
    fontSize: 11,
    color: colors.textSecondary,
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
  cardSelected: { 
    borderWidth: 4, 
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  cardImage: { width: "100%", height: "100%" },
  checkBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
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
  optionText: { color: "#fff", fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.primary + "33" },
  waitlistCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waitlistTitle: {
    ...fonts.body,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  waitlistButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  waitlistButtonDisabled: {
    opacity: 0.6,
  },
  waitlistButtonText: {
    ...fonts.body,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  cta: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  ctaHint: {
    ...fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
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
  generatingCard: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  generatingText: {
    ...fonts.body,
    color: colors.textSecondary,
  },
  placeholderCard: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
});
