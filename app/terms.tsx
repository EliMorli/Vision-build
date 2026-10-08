import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { colors, fonts, spacing } from "@/lib/theme";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { businessConfig, getFormattedAddress } from "@/lib/config/business";

// Raw markdown - will be replaced with actual content
const termsMarkdown = `# VisionBuild Terms of Service

**Effective date:** [EFFECTIVE_DATE]

Welcome to VisionBuild. These Terms of Service ("Terms") are an agreement between you and [COMPANY_LEGAL_NAME], a [ENTITY_TYPE] based in California.

**By using VisionBuild, you agree to these Terms.**

Contact us: [SUPPORT_EMAIL]
Mailing address: [MAILING_ADDRESS]
Website: https://[WEBSITE_DOMAIN]

## Who can use VisionBuild

- You must be at least 13 years old
- If under 18, you need parent/guardian permission
- You're responsible for your account security

## What VisionBuild does

VisionBuild helps you imagine changes to your space using AI. You can photograph a room, pick a style, and get AI-generated design visualizations.

## Your Content

You own your content. By using VisionBuild, you give us permission to:
- Host, store, and process your content
- Send it to our AI providers to generate designs
- Display public projects in Explore (only if you choose to make them public)

## Privacy

We take your privacy seriously. See our Privacy Policy for details on how we handle your information.

## Prohibited Conduct

Don't:
- Violate laws or others' rights
- Upload harmful, offensive, or inappropriate content
- Impersonate others or mislead users
- Abuse, harass, or harm others
- Scrape or reverse-engineer the Service

## AI-Generated Content

AI visualizations are for inspiration only. They are not:
- Professional design advice
- Construction plans
- Guarantees of what your space will look like

## Disclaimers

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES. WE DON'T GUARANTEE UNINTERRUPTED OR ERROR-FREE SERVICE.

## Limitation of Liability

VISIONBUILD'S TOTAL LIABILITY IS LIMITED TO $100 OR THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.

## Changes

We may update these Terms. Continued use means you accept the changes.

## Contact

Questions? Email [SUPPORT_EMAIL]

---

[COMPANY_LEGAL_NAME]
[MAILING_ADDRESS]
https://[WEBSITE_DOMAIN]
`;

export default function TermsScreen() {
  // Replace placeholders
  const processedMarkdown = termsMarkdown
    .replace(/\[EFFECTIVE_DATE\]/g, "January 1, 2027") // Fixed date for launch
    .replace(/\[COMPANY_LEGAL_NAME\]/g, businessConfig.legalName || "TBD")
    .replace(/\[ENTITY_TYPE\]/g, businessConfig.entityType || "TBD")
    .replace(/\[SUPPORT_EMAIL\]/g, businessConfig.supportEmail || "TBD")
    .replace(/\[MAILING_ADDRESS\]/g, getFormattedAddress() || "TBD")
    .replace(/\[WEBSITE_DOMAIN\]/g, businessConfig.websiteDomain || "TBD");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.markdown}>{processedMarkdown}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...fonts.heading,
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  markdown: {
    ...fonts.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
});
