import { View, StyleSheet, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ErrorState } from "@/components";

export default function ResultErrorScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();

  const handleRetry = () => {
    router.back();
  };

  const getErrorContent = () => {
    switch (type) {
      case "rate-limit":
        return {
          title: "Daily Render Limit Reached",
          message:
            "You've used all your free renders for today. Your limit resets at midnight. Want unlimited renders? Upgrade to Pro!",
          icon: "hourglass" as const,
          retryLabel: "View Pricing",
        };
      case "upload":
        return {
          title: "Upload Failed",
          message:
            "We couldn't upload your photo. Please check your connection and try again.",
          icon: "cloud-upload-outline" as const,
        };
      case "analysis":
        return {
          title: "Analysis Failed",
          message:
            "We couldn't analyze your photo. This might be due to image quality or a temporary issue. Please try again.",
          icon: "analytics-outline" as const,
        };
      case "offline":
        return {
          title: "You're Offline",
          message:
            "Looks like you lost your internet connection. Check your network and try again.",
          icon: "cloud-offline" as const,
        };
      default:
        return {
          title: "Something Went Wrong",
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
        retryLabel={content.retryLabel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
