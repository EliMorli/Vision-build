import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  ViewToken,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useAuthStore } from "@/lib/store";

const { width } = Dimensions.get("window");

const PAGES = [
  {
    icon: "sparkles" as const,
    title: "Visualize Your Dream Home",
    subtitle:
      "Upload a photo of any room and see it transformed into your dream design with AI.",
  },
  {
    icon: "grid-outline" as const,
    title: "Structural Integrity",
    subtitle:
      "Our AI preserves your room layout — walls, windows, and doors stay in place. Only surfaces and finishes change.",
  },
  {
    icon: "handshake-outline" as const,
    title: "Connect with Contractors",
    subtitle:
      "Turn your vision into reality. We generate a professional project brief and match you with local contractors.",
  },
];

export default function SignInScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const { signInWithOAuth, loading, error, session } = useAuthStore();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (session) router.replace("/(tabs)");
  }, [session]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentPage(viewableItems[0].index);
      }
    }
  ).current;

  return (
    <View style={styles.container}>
      {/* Onboarding pages */}
      <FlatList
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={48} color={colors.primary} />
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
            style={[
              styles.dot,
              currentPage === i ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Sign-in buttons */}
      <View style={styles.buttons}>
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => signInWithOAuth("google")}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.btnPrimaryText}>Continue with Google</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.btnOutline]}
          onPress={() => signInWithOAuth("apple")}
          disabled={loading}
        >
          <Ionicons name="logo-apple" size={20} color={colors.textPrimary} />
          <Text style={styles.btnOutlineText}>Continue with Apple</Text>
        </Pressable>

        {loading && (
          <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
        )}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingBottom: spacing.xl },
  page: {
    width,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  pageTitle: { ...fonts.heading, textAlign: "center", marginBottom: spacing.md },
  pageSubtitle: {
    ...fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 40 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.primary + "33" },
  buttons: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnOutline: { borderWidth: 1, borderColor: colors.border },
  btnOutlineText: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  errorText: { color: colors.error, fontSize: 13, textAlign: "center" as const, marginTop: spacing.sm },
});
