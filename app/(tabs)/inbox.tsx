import {
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { EmptyState } from "@/components";

export default function InboxScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <EmptyState
        icon="chatbubbles-outline"
        title="Coming soon"
        subtitle="Pro quotes and messages will appear here when they're available in your area."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
