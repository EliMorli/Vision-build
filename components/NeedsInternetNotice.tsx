import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";

interface NeedsInternetNoticeProps {
  testID?: string;
  style?: ViewStyle;
}

/** Gray "Needs internet" label shown next to actions that are disabled while offline. */
export function NeedsInternetNotice({ testID = "needs-internet", style }: NeedsInternetNoticeProps) {
  return (
    <View style={[styles.notice, style]} testID={testID}>
      <Ionicons name="cloud-offline-outline" size={14} color={colors.textSecondary} accessibilityElementsHidden />
      <Text style={styles.text}>Needs internet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  text: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
