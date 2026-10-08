import {
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { EmptyState, OfflineBanner } from "@/components";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";

export default function InboxScreen() {
  const networkStatus = useNetworkStatus();
  const isOffline = !networkStatus.isConnected;

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
