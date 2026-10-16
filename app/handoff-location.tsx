import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "@/components";

// Feature flag for contractor outreach
const CONTRACTOR_OUTREACH_ENABLED = false;

function HandoffLocationScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const validateZipCode = async () => {
    setError("");
    
    if (zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
      setError("Please enter a valid 5-digit ZIP code");
      return;
    }

    setIsValidating(true);
    
    // Mock validation delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setIsValidating(false);
    
    // Navigate to confirmation screen
    router.push(`/handoff-confirm?id=${id}&zip=${zipCode}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Your location</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="location" size={56} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Where's your project?</Text>

          {/* Description */}
          <Text style={styles.description}>
            We need your ZIP code to match you with local contractors in your area. 
            Your exact address stays private until you choose to share it with a specific pro.
          </Text>

          {/* ZIP Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ZIP code</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={zipCode}
              onChangeText={(text) => {
                setZipCode(text.replace(/[^0-9]/g, "").slice(0, 5));
                setError("");
              }}
              placeholder="90210"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
              accessibilityLabel="ZIP code input"
              accessibilityHint="Enter your 5-digit ZIP code"
            />
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              We only share your ZIP code with contractors. Your street address remains private.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Continue"
            icon="arrow-forward"
            onPress={validateZipCode}
            loading={isValidating}
            disabled={zipCode.length !== 5}
            variant="primary"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
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
  description: {
    ...fonts.body,
    textAlign: "center",
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...fonts.body,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  input: {
    ...fonts.body,
    fontSize: 20,
    textAlign: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.error,
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

export default function HandoffLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  if (!CONTRACTOR_OUTREACH_ENABLED) {
    return <Redirect href={`/pros-coming-soon?projectId=${id}`} />;
  }
  
  return <HandoffLocationScreenInner />;
}
