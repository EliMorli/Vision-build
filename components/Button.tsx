import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

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
  const finalTextColor = textColor || bg.textColor;
  const finalIconColor = iconColor || textColor || bg.textColor;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        bg.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && !reduceMotion && { borderBottomWidth: 2, marginTop: 3 },
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
      backgroundColor: colors.secondary,
      borderBottomWidth: 5,
      borderBottomColor: "#23803D",
    }, 
    textColor: "#fff",
    bottomColor: "#23803D",
  },
  danger: { 
    container: { 
      backgroundColor: colors.danger,
      borderBottomWidth: 5,
      borderBottomColor: "#B91C1C",
    }, 
    textColor: "#fff",
    bottomColor: "#B91C1C",
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
  label: { fontSize: 17, fontFamily: "Nunito_900Black", letterSpacing: 0.3 },
});
