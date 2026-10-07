import { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "@/components";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { AI_CONSENT_VERSION } from "@/lib/config";

const AI_CONSENT_KEY = "@visionbuild:ai_consent";
const AI_CONSENT_VERSION_KEY = "@visionbuild:ai_consent_version";

export default function AIConsentScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const userId = useAuthStore((s) => s.session?.user?.id);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem(AI_CONSENT_KEY, "true");
      await AsyncStorage.setItem(AI_CONSENT_VERSION_KEY, AI_CONSENT_VERSION);

      if (userId && !(__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true")) {
        await supabase.from("consents").insert([
          {
            user_id: userId,
            kind: "ai_processing",
            version: AI_CONSENT_VERSION,
            accepted_at: new Date().toISOString(),
          },
        ]);
      }

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("Failed to save AI consent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={56} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>AI-Powered Designs</Text>

          {/* Description - exact copy as provided */}
          <Text style={styles.description}>
            Your photos and chats are sent to our AI partners, OpenAI and Replicate, only to
            create your designs. OpenAI doesn't train on them, and Replicate deletes them within
            an hour. We keep your designs in your projects until you delete them.
          </Text>

          {/* Additional info */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Ionicons name="lock-closed" size={20} color={colors.primary} />
              <Text style={styles.infoText}>Your data is encrypted in transit</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              <Text style={styles.infoText}>Used only for your designs</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={styles.infoText}>Deleted from AI partners quickly</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label="Continue"
          icon="arrow-forward"
          onPress={handleAccept}
          loading={isLoading}
          variant="primary"
        />
        <Text style={styles.footerText}>
          By continuing, you consent to this use of AI services.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...fonts.heading,
    fontSize: 28,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  description: {
    ...fonts.body,
    textAlign: "center",
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  infoBox: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    ...fonts.body,
    fontSize: 15,
    flex: 1,
  },
  actions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    ...fonts.regular,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
});
