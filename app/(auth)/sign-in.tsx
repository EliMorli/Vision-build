import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components";

const { width } = Dimensions.get("window");

const PAGES = [
  {
    icon: "camera-outline" as const,
    title: "Snap Your Space",
    subtitle: "Take a photo of any room in your home. Kitchen, bathroom, bedroom — we handle them all.",
  },
  {
    icon: "color-wand-outline" as const,
    title: "AI Redesigns It",
    subtitle: "Pick a style and our AI generates 4 photorealistic designs — keeping your walls, windows, and layout intact.",
  },
  {
    icon: "people-outline" as const,
    title: "Get Real Estimates",
    subtitle: "We create a professional project brief and connect you with vetted local contractors in 24 hours.",
  },
];

export default function SignInScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const { signInWithOAuth, loading, error, session } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/(tabs)");
  }, [session]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentPage(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <Ionicons name="construct" size={22} color={colors.primary} />
        <Text style={styles.logoText}>VisionBuild</Text>
      </View>

      {/* Onboarding carousel */}
      <FlatList
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={44} color={colors.primary} />
            </View>
            <Text style={styles.pageTitle}>{item.title}</Text>
            <Text style={styles.pageSubtitle}>{item.subtitle}</Text>
          </View>
        )}
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

      {/* Auth buttons */}
      <View style={styles.buttons}>
        <Button
          label="Continue with Google"
          icon="logo-google"
          onPress={() => signInWithOAuth("google")}
          loading={loading}
          variant="primary"
        />
        <Button
          label="Continue with Apple"
          icon="logo-apple"
          onPress={() => signInWithOAuth("apple")}
          loading={loading}
          variant="outline"
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
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
  logoText: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
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
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
