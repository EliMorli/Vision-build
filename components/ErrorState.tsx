import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "./Button";

interface ErrorStateProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title,
  message,
  icon = "alert-circle",
  onRetry,
  retryLabel = "Try Again",
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={48} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <View style={styles.buttonContainer}>
          <Button
            label={retryLabel}
            icon="refresh"
            onPress={onRetry}
            variant="primary"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.error + "12",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...fonts.heading,
    fontSize: 22,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    ...fonts.body,
    textAlign: "center",
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
  },
});
