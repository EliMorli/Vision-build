import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { SUPPORT_EMAIL } from "@/lib/config";

const FAQ_ITEMS = [
  {
    question: "How does VisionBuild work?",
    answer:
      "Upload a photo of your room, choose a style, and our AI generates design visualizations. Save your favorites and plan your renovation. Local pro connections coming soon.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes! Your photos and chats are sent through OpenRouter only to AI providers that don't keep or train on your data. We never share your personal information without your explicit permission.",
  },
  {
    question: "When will pros be available?",
    answer:
      "We're building connections with local pros now. Join the waitlist from the Home screen to be notified when they're ready in your area.",
  },
];

export default function HelpContactScreen() {
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const sendEmail = () => {
    if (SUPPORT_EMAIL) {
      Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=VisionBuild Support Request`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Help & Contact</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Contact Support */}
        {SUPPORT_EMAIL && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get Help</Text>
            <Pressable style={styles.contactCard} onPress={sendEmail}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail" size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email Support</Text>
                <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ_ITEMS.map((item, index) => (
            <View
              key={index}
              style={[
                styles.faqCard,
                index === FAQ_ITEMS.length - 1 && styles.lastFaqCard,
              ]}
            >
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* Legal Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.legalCard}>
            <Pressable
              style={styles.legalRow}
              onPress={() => openLink("https://visionbuild.app/terms")}
            >
              <Text style={styles.legalLabel}>Terms of Service</Text>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </Pressable>

            <View style={styles.separator} />

            <Pressable
              style={styles.legalRow}
              onPress={() => openLink("https://visionbuild.app/privacy")}
            >
              <Text style={styles.legalLabel}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </Pressable>

            <View style={styles.separator} />

            <Pressable
              style={styles.legalRow}
              onPress={() => router.push("/licenses")}
            >
              <Text style={styles.legalLabel}>Open Source Licenses</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>VisionBuild v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2026 VisionBuild. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    ...fonts.title,
    fontSize: 18,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...fonts.title,
    fontSize: 13,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    ...fonts.body,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactValue: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.primary,
  },
  faqCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  lastFaqCard: {
    marginBottom: 0,
  },
  faqQuestion: {
    ...fonts.body,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    ...fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  legalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    minHeight: 56,
  },
  legalLabel: {
    ...fonts.body,
    fontSize: 15,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  appInfo: {
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  appVersion: {
    ...fonts.regular,
    fontSize: 13,
    marginBottom: 4,
  },
  appCopyright: {
    ...fonts.regular,
    fontSize: 11,
  },
});
