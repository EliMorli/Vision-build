// Route: /terms
// Renders terms of service from markdown

import { ScrollView, Text, StyleSheet } from "react-native";
import { colors, spacing, fonts } from "@/lib/theme";
import { TERMS_OF_SERVICE } from "@/content/legal";

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.text}>{TERMS_OF_SERVICE}</Text>
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
