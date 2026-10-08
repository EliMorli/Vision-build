// Route: /privacy
// Renders privacy policy from markdown

import { ScrollView, Text, StyleSheet } from "react-native";
import { colors, spacing, fonts } from "@/lib/theme";
import { PRIVACY_POLICY } from "@/content/legal";

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.text}>{PRIVACY_POLICY}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  text: {
    ...fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
});
