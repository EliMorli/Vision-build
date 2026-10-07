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
  primary: { 
    container: { 
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 0,
      elevation: 4,
    }, 
    textColor: "#fff" 
  },
  secondary: { 
    container: { 
      backgroundColor: colors.secondary,
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 0,
      elevation: 4,
    }, 
    textColor: "#fff" 
  },
  outline: { 
    container: { 
      backgroundColor: "#fff", 
      borderWidth: 3, 
      borderColor: colors.textPrimary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 0,
      elevation: 3,
    }, 
    textColor: colors.textPrimary 
  },
  ghost: { container: { backgroundColor: "transparent" }, textColor: colors.primary },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    gap: 8,
    minHeight: 56,
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.4 },
  pressed: { 
    opacity: 1, 
    transform: [{ scale: 0.98 }, { translateY: 2 }],
    shadowOffset: { width: 0, height: 2 },
  },
  label: { fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
});
