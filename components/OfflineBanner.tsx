import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts } from "@/lib/theme";

interface OfflineBannerProps {
  testID?: string;
}

export function OfflineBanner({ testID }: OfflineBannerProps) {
  return (
    <View style={styles.banner} testID={testID}>
      <Ionicons name="cloud-offline" size={16} color={colors.textSecondary} />
      <Text style={styles.bannerText}>
        You're offline. Showing what's saved on this phone.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "#E8EAED",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bannerText: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
