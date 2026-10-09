import { StyleSheet, Text, View, type ViewStyle } from "react-native";

interface AiGeneratedBadgeProps {
  /** Override position (defaults to the top-left corner of the parent). */
  style?: ViewStyle;
  /** Smaller pill for thumbnails. */
  compact?: boolean;
  testID?: string;
}

/**
 * "✦ AI-generated" label shown on every AI design image (Results, project
 * Designs grid, Explore cards, the before/after detail view).
 *
 * Sits in the top-left corner so it never collides with the "Option N" pill
 * (bottom-left), the selected check / favorite heart (top-right) or the
 * Explore ⋯ menu (top-right). Non-interactive: touches pass through, but the
 * label is announced by screen readers.
 */
export function AiGeneratedBadge({ style, compact = false, testID = "ai-generated-badge" }: AiGeneratedBadgeProps) {
  return (
    <View
      style={[styles.badge, compact && styles.compact, style]}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel="AI-generated image"
      testID={testID}
    >
      <Text style={[styles.text, compact && styles.compactText]} importantForAccessibility="no" allowFontScaling={false}>
        ✦ AI-generated
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 2,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  compact: {
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
  compactText: {
    fontSize: 10,
    lineHeight: 13,
  },
});
