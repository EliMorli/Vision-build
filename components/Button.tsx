import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "neutral";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textColor?: string;
  iconColor?: string;
  testID?: string;
  accessibilityLabel?: string;
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
  textColor,
  iconColor,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const bg = VARIANT_STYLES[variant];
  const reduceMotion = useReducedMotion();
  const finalTextColor = isDisabled && !loading ? DISABLED_TEXT : textColor || bg.textColor;
  const finalIconColor = isDisabled && !loading ? DISABLED_TEXT : iconColor || textColor || bg.textColor;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        bg.container,
        fullWidth && styles.fullWidth,
        isDisabled && (variant === "ghost" ? styles.disabledGhost : styles.disabled),
        pressed && !isDisabled && !reduceMotion && HAS_3D_EDGE[variant] && { borderBottomWidth: 2, marginTop: 3 },
        pressed && !isDisabled && variant === "neutral" && styles.neutralPressed,
        style,
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={finalTextColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={finalIconColor} accessibilityElementsHidden />}
          <Text style={[styles.label, { color: finalTextColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// Disabled buttons use a flat clay-gray look (not a faded brand color) so it is
// obvious they cannot be tapped, e.g. "Needs internet" while offline.
const DISABLED_TEXT = "#5F6368";

const VARIANT_STYLES: Record<Variant, { container: ViewStyle; textColor: string; bottomColor: string }> = {
  primary: { 
    container: { 
      backgroundColor: colors.primary,
      borderBottomWidth: 5,
      borderBottomColor: "#0F4FB0",
    }, 
    textColor: "#fff",
    bottomColor: "#0F4FB0",
  },
  secondary: { 
    container: { 
      backgroundColor: colors.success,
      borderBottomWidth: 5,
      borderBottomColor: "#0D652D",
    }, 
    textColor: "#fff",
    bottomColor: "#0D652D",
  },
  danger: { 
    container: { 
      backgroundColor: colors.error,
      borderBottomWidth: 5,
      borderBottomColor: "#8C1D18",
    }, 
    textColor: "#fff",
    bottomColor: "#8C1D18",
  },
  outline: { 
    container: { 
      backgroundColor: "#fff", 
      borderWidth: 3, 
      borderColor: colors.textPrimary,
      borderBottomWidth: 5,
      borderBottomColor: colors.textPrimary,
    }, 
    textColor: colors.textPrimary,
    bottomColor: colors.textPrimary,
  },
  ghost: { 
    container: { backgroundColor: "transparent" }, 
    textColor: colors.primary,
    bottomColor: "transparent",
  },
  // Plain gray secondary action (e.g. Cancel in confirmation sheets): no
  // border, so it never competes with the main action. Dark text keeps it
  // clearly tappable (unlike the disabled look, which has gray text).
  neutral: {
    container: { backgroundColor: "#F1F3F4" },
    textColor: colors.textPrimary,
    bottomColor: "transparent",
  },
};

// Variants drawn with a thick bottom edge that "presses in" when tapped
const HAS_3D_EDGE: Record<Variant, boolean> = {
  primary: true,
  secondary: true,
  danger: true,
  outline: true,
  ghost: false,
  neutral: false,
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
  neutralPressed: { backgroundColor: "#E2E5E8" },
  disabled: {
    backgroundColor: "#E8EAED",
    borderColor: "#BDC1C6",
    borderBottomColor: "#BDC1C6",
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledGhost: { opacity: 0.6 },
  label: { fontSize: 17, fontFamily: "Nunito_900Black", letterSpacing: 0.3 },
});
