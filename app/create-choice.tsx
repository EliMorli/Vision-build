import { View, Text, StyleSheet, Pressable, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { viHref } from "@/lib/navigation/tabs";

export default function CreateChoiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Title section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Start your project</Text>
          <Text style={styles.subtitle}>Choose how you'd like to begin</Text>
        </View>

        {/* Choice cards */}
        <View style={styles.choices}>
          {/* Brainstorm with Vi */}
          <Pressable accessibilityRole="button"
            style={styles.choiceCard}
            // Close this sheet and open Vi inside the tabs (the Vi tab, or Vi in
            // the current tab when Inbox has the slot); Vi asks for AI consent first
            onPress={() => router.dismissTo(viHref() as any)}
            testID="create-choice-vi"
          >
            <View style={[styles.choiceIcon, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="chatbubble-ellipses" size={48} color={colors.primary} />
            </View>
            <View style={styles.choiceContent}>
              <Text style={styles.choiceTitle}>Brainstorm with Vi</Text>
              <Text style={styles.choiceDescription}>
                Chat with our AI design assistant. Share ideas, upload photos, and
                iterate on designs together.
              </Text>
              <View style={styles.choiceBadge}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={styles.badgeText}>AI-Powered</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </Pressable>

          {/* Snap a photo */}
          <Pressable accessibilityRole="button"
            style={styles.choiceCard}
            onPress={() => router.push("/space-type")}
          >
            <View style={[styles.choiceIcon, { backgroundColor: colors.secondary + "15" }]}>
              <Ionicons name="camera" size={48} color={colors.secondary} />
            </View>
            <View style={styles.choiceContent}>
              <Text style={styles.choiceTitle}>Snap a photo</Text>
              <Text style={styles.choiceDescription}>
                Upload a photo of your space, pick a style, and get 4 AI-generated
                designs instantly.
              </Text>
              <View style={[styles.choiceBadge, { backgroundColor: colors.secondary + "12" }]}>
                <Ionicons name="flash" size={14} color={colors.success} />
                <Text style={[styles.badgeText, { color: colors.success }]}>Quick start</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  titleSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  title: {
    ...fonts.heading,
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...fonts.body,
    color: colors.textSecondary,
  },
  choices: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "#fff",
    gap: spacing.md,
  },
  choiceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  choiceContent: {
    flex: 1,
    gap: 6,
  },
  choiceTitle: {
    ...fonts.title,
    fontSize: 18,
  },
  choiceDescription: {
    ...fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  choiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary + "12",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
});
