import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  SafeAreaView,
  Linking,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts } from "@/lib/theme";
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
    title: "Build Your Vision",
    subtitle: "Save your favorite designs and track your renovation journey. Local pro connections coming soon.",
  },
];

export default function SignInScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showAgeError, setShowAgeError] = useState(false);
  const { signInWithOAuth, loading, error, session } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/(tabs)");
  }, [session, router]);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleOAuthPress = (provider: "google" | "apple") => {
    if (!ageConfirmed) {
      setShowAgeError(true);
      return;
    }
    setShowAgeError(false);
    signInWithOAuth(provider);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) {
      setCurrentPage(viewableItems[0].index);
    }
  });

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  
  // Extract stable references for FlatList props
  const onViewableItemsChangedRef = onViewableItemsChanged.current;
  const viewabilityConfigValue = viewabilityConfig.current;

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <Ionicons name="construct" size={22} color={colors.primary} />
        <Text style={styles.logoText}>VisionBuild</Text>
      </View>

      {/* Onboarding carousel */}
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
        <FlatList
          data={PAGES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChangedRef}
          viewabilityConfig={viewabilityConfigValue}
          keyExtractor={(_, i) => String(i)}
          style={{ height: 320 }}
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
      </View>

      {/* Page dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, currentPage === i ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* Age confirmation */}
      <View style={styles.ageSection}>
        <Pressable
          style={styles.ageConfirmRow}
          onPress={() => {
            setAgeConfirmed(!ageConfirmed);
            setShowAgeError(false);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ageConfirmed }}
          accessibilityLabel="I confirm I am 13 years or older"
        >
          <View style={[styles.checkbox, ageConfirmed && styles.checkboxChecked]}>
            {ageConfirmed && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.ageText}>I confirm I am 13 years or older</Text>
        </Pressable>
        {showAgeError && (
          <Text style={styles.ageError}>Please confirm you're 13 or older</Text>
        )}
      </View>

      {/* Auth buttons */}
      <View style={styles.buttons}>
        <Button
          label="Continue with Google"
          icon="logo-google"
          onPress={() => handleOAuthPress("google")}
          loading={loading}
          variant="primary"
          style={styles.googleButton}
          textColor={colors.textPrimary}
          iconColor={colors.textPrimary}
        />
        <Button
          label="Continue with Apple"
          icon="logo-apple"
          onPress={() => handleOAuthPress("apple")}
          loading={loading}
          variant="primary"
          style={styles.appleButton}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Terms and Privacy */}
      <Text style={styles.legalText}>
        By continuing, you agree to our{" "}
        <Text
          style={styles.legalLink}
          onPress={() => openLink("https://visionbuild.app/terms")}
          accessibilityRole="link"
        >
          Terms of Service
        </Text>{" "}
        and{" "}
        <Text
          style={styles.legalLink}
          onPress={() => openLink("https://visionbuild.app/privacy")}
          accessibilityRole="link"
        >
          Privacy Policy
        </Text>
        .
      </Text>
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
    marginBottom: spacing.xl,
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
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: spacing.lg },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.primary + "30" },
  ageSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  ageConfirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ageText: {
    ...fonts.body,
    fontSize: 15,
    flex: 1,
  },
  ageError: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.xs,
    marginLeft: 32,
  },
  buttons: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADCE0",
  },
  appleButton: {
    backgroundColor: "#000000",
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  legalText: {
    ...fonts.regular,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    lineHeight: 18,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: "600",
  },
});
