import { useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "@/components";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useProjectStore } from "@/lib/store";
import { AI_CONSENT_VERSION, CONSENT_CHANGE_NOTE } from "@/lib/config";
import { getProviderDisclosureText } from "@/lib/ai-models";

const AI_CONSENT_KEY = "@visionbuild:ai_consent";
const AI_CONSENT_VERSION_KEY = "@visionbuild:ai_consent_version";

export default function AIConsentScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showFade, setShowFade] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const userId = useAuthStore((s) => s.session?.user?.id);
  const pendingConsent = useProjectStore((s) => s.pendingConsent);
  const clearPendingConsent = useProjectStore((s) => s.clearPendingConsent);
  
  // Read consent info from store
  const reason = pendingConsent?.reason;
  const isOutdated = reason === "outdated";
  const isNever = reason === "never";
  const isReconsent = isOutdated || isNever;
  
  console.log("[AIConsentScreen] pendingConsent:", pendingConsent, "reason:", reason, "isReconsent:", isReconsent, "isOutdated:", isOutdated);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isScrollable = contentSize.height > layoutMeasurement.height;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 10;
    setShowFade(isScrollable && !isAtBottom);
  }, []);

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
        const { type, projectId, stylePrompt, imageUri, roomAnalysis } = pendingConsent.resume;
        
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
          // Resume generate designs - replace consent screen with generating screen
          const projectStore = useProjectStore.getState();
          // Use replace to swap consent screen with generating screen
          router.replace(`/generating/${projectId}`);
          // Start generation after navigation
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
    
    // If we have resume data, return to appropriate screen
    if (pendingConsent?.resume) {
      const { type, projectId } = pendingConsent.resume;
      if (type === "generate" && projectId) {
        // For generate flow, dismiss back to project detail (not editor/style picker)
        // Use dismissTo to remove consent screen from stack
        router.dismissTo(`/project/${projectId}`);
      } else if (projectId) {
        // For other flows with project, go to project detail
        router.dismissTo(`/project/${projectId}`);
      } else {
        // No project, go to camera/home
        router.dismissTo("/(tabs)/camera");
      }
    } else {
      // No resume data, go to camera
      router.dismissTo("/(tabs)/camera");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scrollContainer}>
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.content}>
            {/* Icon - smaller in outdated state */}
            <View style={[styles.iconCircle, isOutdated && styles.iconCircleSmall]}>
              <Ionicons name="sparkles" size={isOutdated ? 40 : 56} color={colors.primary} />
            </View>

            {/* Title */}
            <Text style={styles.title}>AI-Powered Designs</Text>

            {/* Re-consent message (if applicable) */}
            {isReconsent && isOutdated && (
              <View style={styles.updateNotice}>
                <Ionicons name="information-circle" size={20} color={colors.primary} />
                <View style={styles.updateTextContainer}>
                  <Text style={styles.updateText}>
                    We've updated how your photos are handled.
                  </Text>
                  <Text style={styles.updateText}>
                    {CONSENT_CHANGE_NOTE}
                  </Text>
                </View>
              </View>
            )}

            {/* Provider disclosure - moved up, above description */}
            <View style={styles.infoBox} testID="consent-provider-disclosure">
              <View style={styles.infoRow}>
                <Ionicons name="lock-closed" size={20} color={colors.primary} />
                <Text style={styles.infoText}>{getProviderDisclosureText()}</Text>
              </View>
            </View>

            {/* Description - tightened spacing */}
            <Text style={styles.description}>
              Your photos and chats are sent through OpenRouter only to AI providers that don't keep
              or train on your data, and only to create your designs.
            </Text>
            
            <Text style={styles.description}>
              Your designs stay in your projects until you delete them.
            </Text>
          </View>
        </ScrollView>
        
        {/* Gradient fade - only shown when content overflows */}
        {showFade && (
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)"]}
            style={styles.fadeGradient}
            pointerEvents="none"
          />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label="Continue"
          icon="arrow-forward"
          onPress={handleAccept}
          loading={isLoading}
          variant="primary"
        />
        <Button
          label="Not now"
          onPress={handleDecline}
          variant="ghost"
          style={{ marginTop: spacing.sm }}
        />
        <Text style={styles.footerText}>
          By continuing, you agree to this use of AI.{" "}
          <Pressable onPress={() => router.push("/privacy")} accessibilityRole="link">
            <Text style={styles.privacyLink}>Privacy Policy</Text>
          </Pressable>
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
  scrollContainer: {
    flex: 1,
    position: "relative",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconCircleSmall: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.md,
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
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  updateNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "12",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  updateTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  updateText: {
    ...fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  infoBox: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  infoText: {
    ...fonts.body,
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  fadeGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  actions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#fff",
  },
  footerText: {
    ...fonts.regular,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  privacyLink: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
