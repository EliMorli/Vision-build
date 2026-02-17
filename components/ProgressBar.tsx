import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, fonts } from "@/lib/theme";

interface ProgressBarProps {
  progress: number; // 0 to 1
  message?: string;
}

export function ProgressBar({ progress, message }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(progress, 1) * 100}%` }]} />
      </View>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  track: {
    width: "100%",
    height: 6,
    backgroundColor: colors.primary + "1A",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  message: { ...fonts.regular, textAlign: "center" },
});
