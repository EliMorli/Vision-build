import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "@/lib/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const bg = VARIANT_STYLES[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        bg.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={bg.textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={bg.textColor} />}
          <Text style={[styles.label, { color: bg.textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const VARIANT_STYLES: Record<Variant, { container: ViewStyle; textColor: string }> = {
  primary: { container: { backgroundColor: colors.primary }, textColor: "#fff" },
  secondary: { container: { backgroundColor: colors.secondary }, textColor: "#fff" },
  outline: { container: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border }, textColor: colors.textPrimary },
  ghost: { container: { backgroundColor: "transparent" }, textColor: colors.primary },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    gap: 8,
    minHeight: 52,
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  label: { fontSize: 16, fontWeight: "600" },
});
