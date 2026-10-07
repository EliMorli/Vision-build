import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts } from "@/lib/theme";

export function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <Text style={styles.bannerText}>You're offline. Some features may be unavailable.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.error,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  bannerText: {
    ...fonts.regular,
    fontSize: 13,
    color: "#fff",
  },
});
