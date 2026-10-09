import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ErrorState, IsoRoom, Button } from "@/components";
import { colors, spacing, radius } from "@/lib/theme";

// Helper to calculate hours until reset time
function calculateHoursUntilReset(resetTime?: string): number {
  if (resetTime) {
    const hours = Math.ceil((new Date(resetTime).getTime() - Date.now()) / (1000 * 60 * 60));
    return Math.max(0, hours);
  }
  
  // Default: hours until midnight UTC
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60));
}

export default function ResultErrorScreen() {
  const { type, resetTime } = useLocalSearchParams<{ type?: string; resetTime?: string }>();
  const router = useRouter();

  const handleRetry = () => {
    if (type === "rate-limit") {
      router.push("/(tabs)/");
    } else {
      router.back();
    }
  };

  // For rate limit, show custom UI with clay room
  if (type === "rate-limit") {
    const hoursUntil = calculateHoursUntilReset(resetTime);
    const resetText = hoursUntil > 0 ? `New designs in ${hoursUntil} h` : "New designs available now";

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.rateLimitContainer}>
          <View style={styles.roomWrapper}>
            <IsoRoom palette="modern" size={200} />
          </View>
          <Text style={styles.rateLimitTitle}>Daily limit reached</Text>
          <Text style={styles.rateLimitMessage}>
            You've used all your free designs for today. Come back soon for more!
          </Text>
          <View style={styles.resetChip}>
            <Ionicons name="time-outline" size={18} color={colors.accent} />
            <Text style={styles.resetText}>{resetText}</Text>
          </View>
          <View style={styles.rateLimitButton}>
            <Button
              label="Back to Home"
              icon="home-outline"
              onPress={handleRetry}
              variant="primary"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const getErrorContent = () => {
    switch (type) {
      case "upload":
        return {
          title: "Upload failed",
          message:
            "We couldn't upload your photo. Please check your connection and try again.",
          icon: "cloud-upload-outline" as const,
        };
      case "analysis":
        return {
          title: "Analysis failed",
          message:
            "We couldn't analyze your photo. This might be due to image quality or a temporary issue. Please try again.",
          icon: "analytics-outline" as const,
        };
      case "offline":
        return {
          title: "You're offline",
          message:
            "Looks like you lost your internet connection. Check your network and try again.",
          icon: "cloud-offline" as const,
        };
      default:
        return {
          title: "Something went wrong",
          message:
            "We encountered an unexpected error while generating your designs. Our team has been notified. Please try again.",
          icon: "alert-circle" as const,
        };
    }
  };

  const content = getErrorContent();

  return (
    <SafeAreaView style={styles.container}>
      <ErrorState
        title={content.title}
        message={content.message}
        icon={content.icon}
        onRetry={handleRetry}
        retryLabel={("retryLabel" in content ? content.retryLabel : undefined) as string | undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  rateLimitContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  roomWrapper: {
    marginBottom: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  rateLimitTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  rateLimitMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  resetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.accent + "15",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginBottom: spacing.xl,
  },
  resetText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.accent,
  },
  rateLimitButton: {
    width: "100%",
    maxWidth: 300,
  },
});
