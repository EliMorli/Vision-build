import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "@/components";

// Feature flag for contractor outreach
const CONTRACTOR_OUTREACH_ENABLED = false;

interface PrivacyToggle {
  id: string;
  label: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

function HandoffConfirmScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [toggles, setToggles] = useState<PrivacyToggle[]>([
    {
      id: "brief",
      label: "Project brief",
      description: "Room type, style preferences, and scope of work",
      required: true,
      enabled: true,
    },
    {
      id: "photos",
      label: "Photos",
      description: "Original and generated design images",
      required: true,
      enabled: true,
    },
    {
      id: "name",
      label: "Your name",
      description: "So contractors know who to address",
      required: false,
      enabled: true,
    },
    {
      id: "contact",
      label: "Contact method",
      description: "Email or phone number for initial contact",
      required: false,
      enabled: true,
    },
  ]);

  const toggleItem = (id: string) => {
    setToggles(prev =>
      prev.map(t => (t.id === id && !t.required ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleConfirm = () => {
    // In production, this would send the data with privacy settings
    router.push(`/handoff/${id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={56} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>What contractors will see</Text>
          <Text style={styles.subtitle}>
            Choose what information to share. Your phone and email stay hidden until you pick a pro.
          </Text>

          {/* Privacy Toggles */}
          <View style={styles.togglesList}>
            {toggles.map((toggle) => (
              <Pressable
                key={toggle.id}
                style={styles.toggleRow}
                onPress={() => toggleItem(toggle.id)}
                disabled={toggle.required}
                accessibilityRole="switch"
                accessibilityState={{ checked: toggle.enabled, disabled: toggle.required }}
                accessibilityLabel={`${toggle.label}. ${toggle.description}. ${toggle.required ? 'Required' : toggle.enabled ? 'Enabled' : 'Disabled'}`}
              >
                <View style={styles.toggleInfo}>
                  <View style={styles.toggleHeader}>
                    <Text style={styles.toggleLabel}>{toggle.label}</Text>
                    {toggle.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.toggleDescription}>{toggle.description}</Text>
                </View>
                <View style={[
                  styles.switch,
                  toggle.enabled && styles.switchOn,
                  toggle.required && styles.switchDisabled,
                ]}>
                  <View style={[
                    styles.switchThumb,
                    toggle.enabled && styles.switchThumbOn,
                  ]} />
                </View>
              </Pressable>
            ))}
          </View>

          {/* Info note */}
          <View style={styles.infoBox}>
            <Ionicons name="lock-closed" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Your full contact details remain private until you choose a specific contractor to work with.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label="Confirm & continue"
          icon="arrow-forward"
          onPress={handleConfirm}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...fonts.heading,
    fontSize: 26,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...fonts.body,
    textAlign: "center",
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  togglesList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
  },
  toggleLabel: {
    ...fonts.body,
    fontWeight: "600",
  },
  requiredBadge: {
    backgroundColor: colors.accent + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    textTransform: "uppercase",
  },
  toggleDescription: {
    ...fonts.regular,
    fontSize: 13,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: "center",
  },
  switchOn: {
    backgroundColor: colors.primary,
  },
  switchDisabled: {
    opacity: 0.6,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.primary + "08",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  infoText: {
    ...fonts.body,
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default function HandoffConfirmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  if (!CONTRACTOR_OUTREACH_ENABLED) {
    return <Redirect href={`/pros-coming-soon?projectId=${id}`} />;
  }
  
  return <HandoffConfirmScreenInner />;
}
