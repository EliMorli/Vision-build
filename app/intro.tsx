import { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  SafeAreaView,
  Animated,
  PanResponder,
  Pressable,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button, IsoRoom } from "@/components";
import { useAuthStore } from "@/lib/store";

const INTRO_SEEN_KEY = "@visionbuild:intro_seen";

const { width } = Dimensions.get("window");

const PAGES = [
  {
    id: "slider",
    type: "slider" as const,
  },
  {
    id: "snap",
    icon: "camera-outline" as const,
    title: "Snap any room",
    subtitle: "Take a photo of a kitchen, bathroom or backyard.",
  },
  {
    id: "redesign",
    icon: "color-wand-outline" as const,
    title: "See it redesigned",
    subtitle: "Pick a style and get four AI designs in seconds.",
  },
  {
    id: "save",
    icon: "bookmark-outline" as const,
    title: "Keep every idea",
    subtitle: "Save favorites to your projects, with local pros coming soon.",
  },
];

// Before/After Slider Component
function BeforeAfterSlider() {
  const sliderPosition = useRef(new Animated.Value(0.5)).current;
  const [dividerX, setDividerX] = useState(width * 0.8 * 0.5); // center of the image width
  const imageWidth = width * 0.8;
  
  // Hide labels when divider is too close (within 60px of edges to account for label width)
  const showBeforeLabel = dividerX > 60;
  const showAfterLabel = dividerX < imageWidth - 60;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          const offset = (width - imageWidth) / 2;
          const relativeX = gesture.moveX - offset;
          const clampedX = Math.max(0, Math.min(imageWidth, relativeX));
          const newPosition = clampedX / imageWidth;
          sliderPosition.setValue(newPosition);
          setDividerX(clampedX);
        },
      }),
    [imageWidth, sliderPosition]
  );
  
  const panHandlers = panResponder.panHandlers;

  const handleButtonSlide = (direction: "left" | "right") => {
    const newX = direction === "left"
      ? Math.max(0, dividerX - imageWidth * 0.1)
      : Math.min(imageWidth, dividerX + imageWidth * 0.1);
    const newPosition = newX / imageWidth;
    sliderPosition.setValue(newPosition);
    setDividerX(newX);
  };

  return (
    <View style={sliderStyles.container}>
      {/* No icon circle here: the app icon + "VisionBuild" row above already brands the page */}
      <Text style={sliderStyles.title}>See the transformation</Text>
      <Text style={sliderStyles.subtitle}>Drag the slider to reveal the power of AI redesign</Text>

      <View style={sliderStyles.sliderContainer} testID="intro-slider" {...panHandlers}>
        <View style={sliderStyles.beforeImage}>
          <IsoRoom palette="modern" size={imageWidth * 0.9} />
          {showBeforeLabel && <Text style={sliderStyles.beforeLabel} testID="intro-label-before">Before</Text>}
        </View>

        {/* After image - clipped based on slider, modern styled room */}
        <View style={[sliderStyles.afterContainer, { width: dividerX }]}>
          <View style={sliderStyles.afterImage}>
            <IsoRoom palette="modern" size={imageWidth * 0.9} spark />
            {showAfterLabel && <Text style={sliderStyles.afterLabel} testID="intro-label-after">After</Text>}
          </View>
        </View>

        {/* Divider line */}
        <View style={[sliderStyles.divider, { left: dividerX }]}>
          <View style={sliderStyles.dividerHandle}>
            <Ionicons name="chevron-back" size={12} color="#fff" />
            <Ionicons name="chevron-forward" size={12} color="#fff" />
          </View>
        </View>
      </View>

      {/* Button controls for accessibility */}
      <View style={sliderStyles.buttonControls}>
        <Pressable
          style={sliderStyles.controlButton}
          onPress={() => handleButtonSlide("left")}
          accessibilityLabel="Show more of before image"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={sliderStyles.controlText}>Before</Text>
        </Pressable>
        <Pressable
          style={sliderStyles.controlButton}
          onPress={() => handleButtonSlide("right")}
          accessibilityLabel="Show more of after image"
          accessibilityRole="button"
        >
          <Text style={sliderStyles.controlText}>After</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function IntroScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();
  const session = useAuthStore((s) => s.session);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentPage(viewableItems[0].index);
      }
    }
  );

  const viewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 50 }), []);
  
  const handleGetStarted = async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, "true");
    if (session) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/sign-in");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo */}
      <View style={styles.logoRow}>
        {/* The real app icon (icon B, same asset as the store icon in app.json) */}
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logoIcon}
          accessibilityIgnoresInvertColors
          testID="intro-app-icon"
        />
        <Text style={styles.logoText} accessibilityRole="header">VisionBuild</Text>
      </View>

      {/* Carousel */}
      <FlatList
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === "slider") {
            return <BeforeAfterSlider />;
          }
          return (
            <View style={styles.page}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon!} size={44} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>{item.title}</Text>
              <Text style={styles.pageSubtitle}>{item.subtitle}</Text>
            </View>
          );
        }}
      />

      {/* Page dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, currentPage === i ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* CTA button */}
      <View style={styles.buttons}>
        <Button
          label="Get started"
          icon="arrow-forward"
          onPress={handleGetStarted}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: spacing.lg,
  },
  logoIcon: { width: 32, height: 32, borderRadius: 8 },
  logoText: { fontSize: 20, fontFamily: "Nunito_700Bold", color: colors.textPrimary },
  page: {
    width,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  pageTitle: {
    ...fonts.heading,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  pageSubtitle: {
    ...fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 32 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.primary + "30" },
  buttons: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xl },
});

const sliderStyles = StyleSheet.create({
  // Top-aligned under the brand row so the slider sits high on the screen
  container: {
    width,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...fonts.heading,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.md,
    marginBottom: 24,
  },
  sliderContainer: {
    width: width * 0.8,
    height: 260,
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  beforeImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  afterImage: {
    width: width * 0.8,
    height: 260,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
  },
  beforeLabel: {
    position: "absolute",
    bottom: 16,
    left: 16,
    fontSize: 16,
    fontFamily: "Nunito_900Black",
    color: colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 1,
  },
  afterLabel: {
    position: "absolute",
    bottom: 16,
    right: 16,
    fontSize: 16,
    fontFamily: "Nunito_900Black",
    color: colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 1,
  },
  afterContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    overflow: "hidden",
  },
  divider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  dividerHandle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: -4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    gap: spacing.md,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  controlText: {
    ...fonts.body,
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: colors.primary,
  },
});
