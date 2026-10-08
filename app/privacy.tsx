import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { colors, fonts, spacing } from "@/lib/theme";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { businessConfig, getFormattedAddress } from "@/lib/config/business";

// Raw markdown - simplified for in-app display
const privacyMarkdown = `# VisionBuild Privacy Policy

**Effective date:** [EFFECTIVE_DATE]

This Privacy Policy explains what information VisionBuild collects, how we use it, and your rights.

Operated by: [COMPANY_LEGAL_NAME], a [ENTITY_TYPE]
Contact: [SUPPORT_EMAIL]
Address: [MAILING_ADDRESS]
Website: https://[WEBSITE_DOMAIN]

## The Short Version

- You sign in with Google or Apple (we don't see your password)
- Your photos and chats go only to AI providers that don't keep or train on your data
- Location data (EXIF/GPS) is removed from photos on your device before upload
- Projects are Private by default; only designs you choose to make Public appear in Explore
- We don't sell your personal information and we don't show ads
- You can delete your account anytime from Settings

## Information We Collect

### You Give Us
- Account info (name, email from Google/Apple)
- Photos you upload
- Chats with Vi (our AI assistant)
- Project details you create

### Automatic
- Device info (model, OS version)
- Usage data (which features you use)
- No location tracking - EXIF data is stripped before upload

## How We Use Your Information

- To generate your AI designs
- To operate and improve the Service
- To respond to your requests
- To send service updates (if you opt in)

## Who We Share With

- **AI Providers:** Only to generate your designs (they don't keep or train on your data)
- **Storage:** Supabase hosts our database and your uploaded photos
- **Law Enforcement:** Only if legally required

We do NOT:
- Sell your personal information
- Share for advertising
- Show ads

## Your Rights

- View your data
- Export your data
- Delete your account (Settings → Delete Account)
- Opt out of marketing emails
- Opt out of AI processing

## Children

VisionBuild is for users 13+. Under 18 requires parent/guardian permission.

## Security

We use industry-standard security measures, but no system is 100% secure.

## Changes

We may update this policy. Continued use means you accept changes.

## Contact Us

Questions? Email [SUPPORT_EMAIL]

---

[COMPANY_LEGAL_NAME]
[MAILING_ADDRESS]
https://[WEBSITE_DOMAIN]
`;

export default function PrivacyScreen() {
  // Replace placeholders
  const processedMarkdown = privacyMarkdown
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
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
