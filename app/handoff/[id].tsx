import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { BUDGET_RANGES } from "@/lib/types";
import { useProjectStore, useLeadStore, useAuthStore } from "@/lib/store";
import { Button, Banner, EmptyState, FullScreenLoader } from "@/components";

export default function HandoffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentProject } = useProjectStore();
  const {
    emailPreview,
    matchedContractors,
    loading,
    progressMessage,
    error,
    generateBriefAndMatch,
    dispatchLeads,
    clear,
  } = useLeadStore();
  const profile = useAuthStore((s) => s.profile);

  const [zip, setZip] = useState("");
  const [budget, setBudget] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0=input, 1=preview, 2=success

  const canProceed = budget !== null && zip.length === 5;

  const handleGenerateBrief = async () => {
    if (!currentProject || !id) return;
    setStep(1);

    await generateBriefAndMatch({
      projectId: id,
      originalImageUrl: currentProject.original_image_url,
      generatedImageUrl: currentProject.selected_generation_url ?? "",
      zipCode: zip,
      budgetRange: budget!,
      userName: profile?.display_name ?? "",
      roomType: currentProject.room_analysis?.roomType ?? "room",
    });
  };

  const handleDispatch = async () => {
    if (!id) return;
    const success = await dispatchLeads({
      projectId: id,
      zipCode: zip,
      budgetRange: budget!,
    });
    if (success) setStep(2);
  };

  // ─── Step 0: Budget & Zip input ──────────────────────────

  if (step === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={fonts.heading}>Almost there!</Text>
          <Text style={styles.intro}>
            We need a couple of details to match you with the best local contractors.
          </Text>

          <Text style={styles.label}>Budget Range</Text>
          <View style={styles.chips}>
            {BUDGET_RANGES.map((range) => (
              <Pressable
                key={range}
                style={[styles.chip, budget === range && styles.chipSelected]}
                onPress={() => setBudget(range)}
              >
                <Text
                  style={[styles.chipText, budget === range && styles.chipTextSelected]}
                >
                  {range}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Zip Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your zip code"
            placeholderTextColor={colors.textSecondary + "80"}
            keyboardType="number-pad"
            maxLength={5}
            value={zip}
            onChangeText={setZip}
          />

          <View style={styles.btnWrap}>
            <Button
              label="Generate Project Brief"
              icon="document-text-outline"
              onPress={handleGenerateBrief}
              disabled={!canProceed}
              variant="primary"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Step 1: Brief preview ───────────────────────────────

  if (step === 1) {
    if (loading) {
      return <FullScreenLoader message={progressMessage} />;
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Banner
            icon="checkmark-circle"
            iconColor={colors.secondary}
            title="Project Brief Generated"
          />

          {/* Email preview card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>
              Subject: {emailPreview?.subject}
            </Text>
            <View style={styles.divider} />

            <Text style={styles.cardHeading}>Scope of Work</Text>
            {emailPreview?.scopeOfWork.map((item, i) => (
              <Text key={i} style={styles.scopeItem}>
                {"\u2022  "}{item}
              </Text>
            ))}

            <Text style={[fonts.regular, { marginTop: spacing.md }]}>
              {emailPreview?.body}
            </Text>
          </View>

          {/* Matched contractors */}
          {matchedContractors.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                Matched {matchedContractors.length} Contractors
              </Text>
              {matchedContractors.map((c) => (
                <View key={c.id} style={styles.contractorRow}>
                  <View style={styles.contractorIcon}>
                    <Ionicons name="business-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contractorName}>{c.business_name}</Text>
                    <Text style={fonts.regular}>
                      {c.city} {"\u2022"} {c.specialties.join(", ")}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={colors.accent} />
                    <Text style={styles.ratingText}>{c.rating}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={styles.btnWrap}>
            <Button
              label="Connect with Contractors"
              icon="send"
              onPress={handleDispatch}
              variant="secondary"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Step 2: Success ─────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <EmptyState
        icon="checkmark-circle"
        title="Leads Sent!"
        subtitle="Your project brief has been sent to matched contractors. You'll receive responses within 24-48 hours."
      >
        <Button
          label="Back to Dashboard"
          onPress={() => {
            clear();
            router.replace("/(tabs)");
          }}
          variant="primary"
        />
      </EmptyState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  intro: {
    ...fonts.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  label: { ...fonts.title, fontSize: 16, marginBottom: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary + "1A",
    borderColor: colors.primary,
  },
  chipText: { fontSize: 14, color: colors.textPrimary },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  btnWrap: { marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 6,
  },
  cardHeading: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  scopeItem: { ...fonts.regular, lineHeight: 22 },
  contractorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "60",
  },
  contractorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  contractorName: { ...fonts.body, fontWeight: "600" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent + "1A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  ratingText: { fontSize: 13, fontWeight: "600", color: colors.accent },
  error: {
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.sm,
    fontSize: 13,
  },
});
