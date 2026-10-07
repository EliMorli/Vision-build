import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { EmptyState } from "@/components";

// Placeholder outreach tracker data
const OUTREACH_TRACKER = {
  projectName: "Kitchen Renovation",
  steps: [
    { label: "Brief written", completed: true, date: "2 days ago" },
    { label: "Pros matched", completed: true, date: "1 day ago", count: 5 },
    { label: "Pros contacted", completed: true, date: "1 day ago", count: 5 },
    { label: "Quotes received", completed: true, date: "4h ago", count: 3 },
    { label: "Still following up", completed: false, contractors: ["Quality Contractors", "Premium Builders"] },
  ],
};

// Placeholder data
const PLACEHOLDER_THREADS = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  contractorName: `${["ABC", "Elite", "Premium", "Quality"][i % 4]} Contractors`,
  lastMessage: i % 3 === 0 
    ? "We'd love to discuss your project. When are you available?"
    : i % 3 === 1
    ? "Your quote is ready. Budget range: $12,000-$18,000"
    : "Thanks for reaching out! We specialize in kitchen renovations.",
  timestamp: `${Math.floor(Math.random() * 24)}h ago`,
  unread: i % 4 === 0,
  hasQuote: i % 3 === 1,
}));

export default function InboxScreen() {
  const hasMessages = PLACEHOLDER_THREADS.length > 0;

  if (!hasMessages) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="chatbubbles-outline"
          title="No messages yet"
          subtitle="When contractors respond to your project, their quotes and messages will appear here."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={PLACEHOLDER_THREADS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={styles.trackerCard}>
            <View style={styles.trackerHeader}>
              <Ionicons name="briefcase" size={20} color={colors.primary} />
              <Text style={styles.trackerTitle}>{OUTREACH_TRACKER.projectName}</Text>
            </View>
            <View style={styles.trackerSteps}>
              {OUTREACH_TRACKER.steps.map((step, index) => (
                <View key={index} style={styles.trackerStep}>
                  <View
                    style={[
                      styles.stepIndicator,
                      step.completed && styles.stepIndicatorComplete,
                    ]}
                  >
                    {step.completed ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <View style={styles.stepDot} />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <View style={styles.stepRow}>
                      <Text
                        style={[
                          styles.stepLabel,
                          step.completed && styles.stepLabelComplete,
                        ]}
                      >
                        {step.label}
                      </Text>
                      {step.count && (
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>{step.count}</Text>
                        </View>
                      )}
                    </View>
                    {step.date && (
                      <Text style={styles.stepDate}>{step.date}</Text>
                    )}
                    {step.contractors && (
                      <View style={styles.contractorsList}>
                        {step.contractors.map((name, i) => (
                          <Text key={i} style={styles.contractorName}>
                            • {name}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.thread}>
            <View style={styles.iconCircle}>
              <Ionicons name="business-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.threadBody}>
              <View style={styles.threadHeader}>
                <Text style={[styles.threadName, item.unread && styles.unreadText]}>
                  {item.contractorName}
                </Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
              <View style={styles.messageRow}>
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {item.lastMessage}
                </Text>
                {item.unread && <View style={styles.unreadBadge} />}
              </View>
              {item.hasQuote && (
                <View style={styles.quoteBadge}>
                  <Ionicons name="document-text" size={12} color={colors.secondary} />
                  <Text style={styles.quoteText}>Quote attached</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { paddingVertical: spacing.sm },
  trackerCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  trackerTitle: {
    ...fonts.title,
    fontSize: 17,
  },
  trackerSteps: {
    gap: spacing.md,
  },
  trackerStep: {
    flexDirection: "row",
    gap: spacing.md,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  stepIndicatorComplete: {
    backgroundColor: colors.secondary,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary + "40",
  },
  stepContent: {
    flex: 1,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepLabel: {
    ...fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
  },
  stepLabelComplete: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  stepBadge: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  stepDate: {
    ...fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  contractorsList: {
    marginTop: 4,
    gap: 2,
  },
  contractorName: {
    ...fonts.regular,
    fontSize: 13,
  },
  thread: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  threadBody: {
    flex: 1,
    gap: 4,
  },
  threadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  threadName: {
    ...fonts.body,
    fontWeight: "600",
  },
  unreadText: {
    fontWeight: "700",
  },
  timestamp: {
    ...fonts.regular,
    fontSize: 13,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  lastMessage: {
    flex: 1,
    ...fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  quoteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.secondary + "12",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
  quoteText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 80,
  },
});
