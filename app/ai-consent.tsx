import { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "@/components";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useProjectStore } from "@/lib/store";
import { AI_CONSENT_VERSION } from "@/lib/config";

const AI_CONSENT_KEY = "@visionbuild:ai_consent";
const AI_CONSENT_VERSION_KEY = "@visionbuild:ai_consent_version";

export default function AIConsentScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const userId = useAuthStore((s) => s.session?.user?.id);
  const pendingConsent = useProjectStore((s) => s.pendingConsent);
  const clearPendingConsent = useProjectStore((s) => s.clearPendingConsent);
  
  // Read consent info from store
  const reason = pendingConsent?.reason;
  const isOutdated = reason === "outdated";
  const isNever = reason === "never";
  const isReconsent = isOutdated || isNever;
  
  console.log("[AIConsentScreen] pendingConsent:", pendingConsent, "reason:", reason, "isReconsent:", isReconsent, "isOutdated:", isOutdated);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem(AI_CONSENT_KEY, "true");
      await AsyncStorage.setItem(AI_CONSENT_VERSION_KEY, AI_CONSENT_VERSION);
      
      // In mock mode, also update the mock consent version
      const isMockMode = __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true";
      if (isMockMode) {
        await AsyncStorage.setItem("@visionbuild:mock_consent_version", AI_CONSENT_VERSION);
      }

      if (userId && !isMockMode) {
        await (supabase.from("consents") as any).insert([
          {
            user_id: userId,
            kind: "ai_processing",
            version: AI_CONSENT_VERSION,
            accepted_at: new Date().toISOString(),
          },
        ]);
      }

      // If we have resume data, retry the original operation
      if (pendingConsent?.resume) {
        const { type, projectId, stylePrompt, imageUri } = pendingConsent.resume;
        
        // Clear pending consent before resuming
        clearPendingConsent();
        
        if (type === "analyze" && imageUri) {
          // Resume upload and analyze
          const projectStore = useProjectStore.getState();
          // Directly call uploadAndAnalyze - it will navigate to editor on success
          const project = await projectStore.uploadAndAnalyze(imageUri);
          if (project) {
            router.replace(`/editor/${project.id}`);
          } else {
            // If it failed, go back to home
            router.replace("/(tabs)");
          }
        } else if (type === "generate" && projectId && stylePrompt) {
          // Resume generate designs
          const projectStore = useProjectStore.getState();
          // Navigate to generating screen first
          router.replace(`/generating/${projectId}`);
          // Call generateDesigns - the generating screen will handle the flow
          await projectStore.generateDesigns(projectId, stylePrompt);
        } else {
          // No valid resume data, just go back
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)");
          }
        }
      } else {
        // Normal flow - clear consent and go back or to home
        clearPendingConsent();
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)");
        }
      }
    } catch (error) {
      console.error("Failed to save AI consent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    // Clear pending consent
    clearPendingConsent();
    
    // If we have resume data with a project, return to that project
    if (pendingConsent?.resume?.projectId) {
      router.replace(`/project/${pendingConsent.resume.projectId}`);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
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

          {/* Re-consent message (if applicable) */}
          {isReconsent && isOutdated && (
            <View style={styles.updateNotice}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.updateText}>
                We've updated how your photos are handled. Please review before your next design.
              </Text>
            </View>
          )}

          {/* Description - exact copy as required */}
          <Text style={styles.description}>
            Your photos and chats are sent through OpenRouter only to AI providers that don't keep
            or train on your data, and only to create your designs.
          </Text>
          
          <Text style={styles.description}>
            Your designs stay in your projects until you delete them.
          </Text>

          {/* Additional info */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Ionicons name="lock-closed" size={20} color={colors.primary} />
              <Text style={styles.infoText}>Data encrypted in transit</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              <Text style={styles.infoText}>Privacy-first AI providers only</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="trash" size={20} color={colors.primary} />
              <Text style={styles.infoText}>No data retention or training</Text>
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
        {isReconsent && (
          <Button
            label="Decline"
            onPress={handleDecline}
            variant="ghost"
            style={{ marginTop: spacing.sm }}
          />
        )}
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
  updateNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "12",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  updateText: {
    ...fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
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
