import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";

interface BannerProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function Banner({ icon, iconColor = colors.secondary, title, subtitle, children, style }: BannerProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        {icon && <Ionicons name={icon} size={20} color={iconColor} />}
        <Text style={[styles.title, { color: iconColor }]}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.primary + "08",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600" },
  subtitle: { ...fonts.regular, marginTop: 6 },
});
