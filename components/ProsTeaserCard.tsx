import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { IsoRoom } from "./IsoRoom";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function ProsTeaserCard() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkWaitlistStatus = useCallback(async () => {
    const userId = useAuthStore.getState().session?.user?.id;
    
    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      const stored = localStorage.getItem("@visionbuild:waitlist:general");
      setIsOnWaitlist(stored === "true");
      setChecking(false);
      return;
    }

    if (!userId) {
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await (supabase
        .from("pro_waitlist") as any)
        .select("id")
        .eq("user_id", userId)
        .is("project_id", null)
        .single();

      setIsOnWaitlist(!!data && !error);
    } catch (err) {
      console.error("Error checking waitlist status:", err);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkWaitlistStatus();
  }, [checkWaitlistStatus]);

  const handleJoinWaitlist = async () => {
    if (isOnWaitlist) return;

    setLoading(true);

    try {
      const userId = useAuthStore.getState().session?.user?.id;
      const email = profile?.email || "";

      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        localStorage.setItem("@visionbuild:waitlist:general", "true");
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
          project_id: null,
          email,
        });

      if (!error) {
        setIsOnWaitlist(true);
      } else {
        console.error("Error adding to waitlist:", error);
      }
    } catch (err) {
      console.error("Error in handleJoinWaitlist:", err);
    } finally {
      setLoading(false);
    }
  };

  // Slim mode when on waitlist
  if (isOnWaitlist) {
    return (
      <View style={styles.slimCard} testID="pros-teaser-joined">
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <Text style={styles.slimText}>✓ You're on the list.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="pros-teaser">
      <View style={styles.tag}>
        <Text style={styles.tagText}>Coming soon</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.textContent}>
          <Text style={styles.title}>We'll reach out to local pros for you</Text>
          <Text style={styles.subtitle}>
            No forms. Your number stays private until you pick a pro.
          </Text>
          
          <Pressable
            style={[styles.notifyButton, loading && styles.notifyButtonDisabled]}
            onPress={handleJoinWaitlist}
            disabled={loading || checking}
            testID="pros-teaser-join"
            accessibilityRole="button"
            accessibilityLabel="Join the waitlist"
          >
            <Text style={styles.notifyButtonText}>
              {checking ? "..." : loading ? "Joining..." : "Join the waitlist"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.artwork}>
          <IsoRoom palette="modern" size={100} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  slimCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slimText: {
    ...fonts.body,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  tagText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  textContent: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    ...fonts.body,
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 22,
    marginBottom: 4,
  },
  subtitle: {
    ...fonts.regular,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  notifyButton: {
    backgroundColor: "#fff",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notifyButtonDisabled: {
    opacity: 0.6,
  },
  notifyButtonText: {
    ...fonts.body,
    fontSize: 15,
    fontWeight: "700",
    color: colors.success,
  },
  artwork: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
});
