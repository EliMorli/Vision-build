import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useAuthStore, useProjectStore } from "@/lib/store";
import { Button, PrivateImage } from "@/components";
import { IsoRoom } from "@/components/IsoRoom";
import { supabase } from "@/lib/supabase";

export default function ProsComingSoonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId;

  const profile = useAuthStore((s) => s.profile);
  const projects = useProjectStore((s) => s.projects);
  
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const project = projects.find((p) => p.id === projectId);
  const designUrl = project?.selected_generation_url || project?.generated_image_urls?.[0];

  const checkWaitlistStatus = useCallback(async () => {
    const userId = useAuthStore.getState().session?.user?.id;
    
    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      const key = projectId ? `@visionbuild:waitlist:${projectId}` : "@visionbuild:waitlist:general";
      const stored = localStorage.getItem(key);
      setIsOnWaitlist(stored === "true");
      setChecking(false);
      return;
    }

    if (!userId) {
      setChecking(false);
      return;
    }

    try {
      const query = (supabase
        .from("pro_waitlist") as any)
        .select("id")
        .eq("user_id", userId);
      
      if (projectId) {
        query.eq("project_id", projectId);
      } else {
        query.is("project_id", null);
      }
      
      const { data, error } = await query.single();

      setIsOnWaitlist(!!data && !error);
    } catch (_err) {
      console.error("Error checking waitlist status:", _err);
    } finally {
      setChecking(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkWaitlistStatus();
  }, [checkWaitlistStatus]);

  const handleNotifyMe = async () => {
    if (isOnWaitlist) return;

    setLoading(true);

    try {
      const userId = useAuthStore.getState().session?.user?.id;
      const email = profile?.email || "";

      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const key = projectId ? `@visionbuild:waitlist:${projectId}` : "@visionbuild:waitlist:general";
        localStorage.setItem(key, "true");
        setIsOnWaitlist(true);
        setLoading(false);
        return;
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      const { error } = await (supabase
        .from("pro_waitlist") as any)
        .insert({
          user_id: userId,
          project_id: projectId || null,
          email,
        });

      if (!error) {
        setIsOnWaitlist(true);
      } else {
        console.error("Error adding to waitlist:", error);
      }
    } catch (_err) {
      console.error("Error in handleNotifyMe:", _err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProject = () => {
    if (projectId) {
      router.push(`/project/${projectId}` as any);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        {/* Design Preview */}
        <View style={styles.designPreview}>
          {designUrl ? (
            <PrivateImage
              bucket="room-photos"
              path={designUrl}
              style={styles.designImage}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <IsoRoom palette="modern" size={180} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.comingSoonTag}>
            <Text style={styles.comingSoonTagText}>Coming soon</Text>
          </View>

          <Text style={styles.title}>Local pros are coming soon</Text>
          <Text style={styles.description}>
            Soon we'll send your design to pros near you and bring any quotes they send to your Inbox.
          </Text>

          {/* Steps Card */}
          <View style={styles.stepsCard}>
            <View style={styles.step} testID="pros-coming-soon-step-1">
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>We write a brief from your design</Text>
            </View>
            <View style={styles.step} testID="pros-coming-soon-step-2">
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>We reach out to local pros for you</Text>
            </View>
            <View style={styles.step} testID="pros-coming-soon-step-3">
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Quotes land in your Inbox when pros reply</Text>
            </View>
          </View>

          {/* Join Waitlist Button or On List State */}
          {checking ? (
            <View style={styles.buttonContainer}>
              <Button
                label="Loading..."
                variant="primary"
                disabled
                onPress={() => {}}
              />
            </View>
          ) : isOnWaitlist ? (
            <View style={styles.onListContainer}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={32} color="#fff" />
              </View>
              <Text style={styles.onListText}>You're on the list</Text>
              <Text style={styles.onListSubtext}>
                We'll email you when pros near you can quote this project.
              </Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <Button
                label="Join the waitlist"
                icon="notifications-outline"
                onPress={handleNotifyMe}
                loading={loading}
                variant="primary"
                testID="pros-coming-soon-join"
              />
            </View>
          )}

          {/* Back Link */}
          <Pressable onPress={handleBackToProject} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back to my project</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  designPreview: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  designImage: {
    width: 280,
    height: 210,
    borderRadius: radius.lg,
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    alignItems: "center",
  },
  comingSoonTag: {
    backgroundColor: "#FFFBEA",
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  comingSoonTagText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    ...fonts.heading,
    fontSize: 26,
    textAlign: "center",
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  description: {
    ...fonts.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  stepsCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  stepText: {
    flex: 1,
    ...fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    paddingTop: 4,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  onListContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  checkIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  onListText: {
    ...fonts.heading,
    fontSize: 20,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  onListSubtext: {
    ...fonts.regular,
    fontSize: 14,
    textAlign: "center",
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
  },
  backLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backLinkText: {
    ...fonts.body,
    fontSize: 16,
    color: colors.primary,
    textAlign: "center",
  },
});
