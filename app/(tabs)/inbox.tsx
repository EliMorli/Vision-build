import { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { EmptyState, OfflineBanner, LoadingSkeleton, ErrorState } from "@/components";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import { useInboxStore } from "@/lib/store";
import { Redirect } from "expo-router";
import { isOutreachEnabled } from "@/lib/config/features";

export default function InboxScreen() {
  // Hidden at launch: nothing can arrive here until pros are live.
  if (!isOutreachEnabled()) return <Redirect href="/(tabs)" />;
  return <InboxContent />;
}

function InboxContent() {
  const networkStatus = useNetworkStatus();
  const isOffline = !networkStatus.isConnected;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchUnreadCount = useInboxStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchUnreadCount();
      } catch {
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchUnreadCount]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {isOffline && <OfflineBanner testID="offline-banner" />}
        <LoadingSkeleton variant="list" count={3} testID="inbox-loading" />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {isOffline && <OfflineBanner testID="offline-banner" />}
        <ErrorState
          message="Failed to load messages"
          onRetry={async () => {
            try {
              setLoading(true);
              setError(null);
              await fetchUnreadCount();
            } catch {
              setError("Failed to load messages");
            } finally {
              setLoading(false);
            }
          }}
          testID="inbox-error"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="inbox-empty">
      {isOffline && <OfflineBanner testID="offline-banner" />}
      <EmptyState
        icon="chatbubbles-outline"
        title="No messages yet"
        subtitle="Messages from local pros will appear here when they're available in your area."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
