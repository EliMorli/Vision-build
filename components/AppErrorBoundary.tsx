import { SafeAreaView, StyleSheet } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { ErrorState } from "./ErrorState";

/**
 * Root error boundary (exported from app/_layout.tsx as `ErrorBoundary`).
 * A render crash anywhere shows a friendly screen with Try again and Contact
 * support instead of a blank/red screen. No error details are shown or logged
 * in production.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) {
    console.error("Unhandled render error:", error);
  }
  return (
    <SafeAreaView style={styles.container} testID="app-error-boundary">
      <ErrorState
        title="Something went wrong"
        message="VisionBuild hit an unexpected problem. Your projects are safe."
        onRetry={retry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center" },
});
