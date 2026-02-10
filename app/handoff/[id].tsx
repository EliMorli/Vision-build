import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { BUDGET_RANGES } from "@/lib/types";
import { useProjectStore, useLeadStore, useAuthStore } from "@/lib/store";

export default function HandoffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentProject } = useProjectStore();
  const { emailPreview, matchedContractors, loading, progressMessage, error, generateBriefAndMatch, dispatchLeads, clear } = useLeadStore();
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
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <Text style={fonts.heading}>Almost there!</Text>
        <Text style={[fonts.body, { color: colors.textSecondary, marginTop: 8 }]}>
          We need a couple of details to match you with the best local contractors.
        </Text>

        <Text style={[fonts.title, { marginTop: spacing.xl, fontSize: 16 }]}>
          Budget Range
        </Text>
        <View style={styles.chips}>
          {BUDGET_RANGES.map((range) => (
            <Pressable
              key={range}
              style={[styles.chip, budget === range && styles.chipSelected]}
              onPress={() => setBudget(range)}
            >
              <Text
                style={[
                  styles.chipText,
                  budget === range && styles.chipTextSelected,
                ]}
              >
                {range}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[fonts.title, { marginTop: spacing.lg, fontSize: 16 }]}>
          Zip Code
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your zip code"
          keyboardType="number-pad"
          maxLength={5}
          value={zip}
          onChangeText={setZip}
        />

        <Pressable
          style={[styles.btn, !canProceed && styles.btnDisabled]}
          onPress={handleGenerateBrief}
          disabled={!canProceed}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>Generate Project Brief</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ─── Step 1: Brief preview ───────────────────────────────

  if (step === 1) {
    if (loading) {
      return (
        <View style={styles.center}>
          <Ionicons name="hourglass-outline" size={36} color={colors.primary} />
          <Text style={[fonts.regular, { marginTop: 16 }]}>{progressMessage}</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={24} color={colors.secondary} />
          <Text style={fonts.title}>Project Brief Generated</Text>
        </View>

        {/* Email preview */}
        <View style={styles.card}>
          <Text style={[fonts.title, { fontSize: 15 }]}>
            Subject: {emailPreview?.subject}
          </Text>
          <View style={styles.divider} />

          <Text style={[fonts.title, { fontSize: 14 }]}>Scope of Work:</Text>
          {emailPreview?.scopeOfWork.map((item, i) => (
            <Text key={i} style={fonts.regular}>
              {"  \u2022  "}
              {item}
            </Text>
          ))}

          <Text style={[fonts.regular, { marginTop: spacing.md }]}>
            {emailPreview?.body}
          </Text>
        </View>

        {/* Matched contractors */}
        {matchedContractors.length > 0 && (
          <>
            <Text style={[fonts.title, { marginTop: spacing.md }]}>
              Matched {matchedContractors.length} Contractors
            </Text>
            {matchedContractors.map((c) => (
              <View key={c.id} style={styles.contractorRow}>
                <View style={styles.contractorIcon}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fonts.body}>{c.business_name}</Text>
                  <Text style={fonts.regular}>
                    {c.city} {"\u2022"} {c.specialties.join(", ")}
                  </Text>
                </View>
                <Text style={fonts.regular}>{c.rating}/5</Text>
              </View>
            ))}
          </>
        )}

        <Pressable
          style={[styles.btn, { backgroundColor: colors.secondary, marginTop: spacing.lg }]}
          onPress={handleDispatch}
        >
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={styles.btnText}>Connect with Contractors</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    );
  }

  // ─── Step 2: Success ─────────────────────────────────────

  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: colors.secondary + "1A" }]}>
        <Ionicons name="checkmark-circle" size={56} color={colors.secondary} />
      </View>
      <Text style={fonts.heading}>Leads Sent!</Text>
      <Text
        style={[
          fonts.body,
          { color: colors.textSecondary, textAlign: "center", marginTop: 12, paddingHorizontal: spacing.xl },
        ]}
      >
        Your project brief has been sent to matched contractors. You'll receive
        responses within 24-48 hours.
      </Text>
      <Pressable
        style={[styles.btn, { marginTop: spacing.xxl }]}
        onPress={() => {
          clear();
          router.replace("/(tabs)");
        }}
      >
        <Text style={styles.btnText}>Back to Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: spacing.lg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary + "1A",
    borderColor: colors.primary,
  },
  chipText: { fontSize: 14, color: colors.textPrimary },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginTop: spacing.sm,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    gap: 8,
    marginTop: spacing.xl,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 6,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  successRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contractorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  contractorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  error: { color: colors.error, textAlign: "center", marginTop: spacing.sm, fontSize: 13 },
});
