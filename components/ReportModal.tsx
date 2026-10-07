import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "./Button";
import { useReportStore } from "@/lib/store";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  type: "design" | "message" | "contractor";
  itemId: string;
}

const REPORT_REASONS = {
  design: [
    { id: "inappropriate", label: "Inappropriate or offensive content" },
    { id: "copyright", label: "Copyright violation" },
    { id: "misleading", label: "Misleading or fake" },
    { id: "quality", label: "Poor quality or broken" },
    { id: "spam", label: "Spam or advertising" },
    { id: "other", label: "Something else" },
  ],
  message: [
    { id: "inappropriate", label: "Inappropriate or offensive" },
    { id: "harmful", label: "Harmful or dangerous advice" },
    { id: "inaccurate", label: "Inaccurate information" },
    { id: "spam", label: "Spam or unwanted" },
    { id: "other", label: "Something else" },
  ],
  contractor: [
    { id: "inappropriate", label: "Inappropriate behavior" },
    { id: "spam", label: "Spam or unwanted contact" },
    { id: "scam", label: "Suspected scam or fraud" },
    { id: "unprofessional", label: "Unprofessional conduct" },
    { id: "other", label: "Something else" },
  ],
};

export function ReportModal({ visible, onClose, type, itemId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitReport = useReportStore((s) => s.submitReport);
  const reduceMotion = useReducedMotion();

  const reasons = REPORT_REASONS[type];

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);

    try {
      await submitReport({
        targetType: type,
        targetId: itemId,
        reason: selectedReason,
      });

      setIsSubmitting(false);
      onClose();

      Alert.alert(
        "Thank You",
        "Your report has been submitted. Our team will review it and take appropriate action.",
        [{ text: "OK" }]
      );

      setSelectedReason(null);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert(
        "Error",
        "Failed to submit report. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>
            Report {type === "design" ? "Design" : type === "contractor" ? "Contractor" : "Message"}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="flag" size={40} color={colors.error} />
          </View>

          {/* Title */}
          <Text style={styles.title}>What's wrong?</Text>
          <Text style={styles.subtitle}>
            Help us understand what's happening so we can take the right action.
          </Text>

          {/* Reason list */}
          <View style={styles.reasonsList}>
            {reasons.map((reason) => (
              <Pressable
                key={reason.id}
                style={[
                  styles.reasonRow,
                  selectedReason === reason.id && styles.reasonRowSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedReason === reason.id }}
              >
                <View
                  style={[
                    styles.radio,
                    selectedReason === reason.id && styles.radioSelected,
                  ]}
                >
                  {selectedReason === reason.id && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <Text style={styles.reasonLabel}>{reason.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Submit Report"
            icon="send"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!selectedReason}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    </Modal>
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
  content: {
    padding: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error + "12",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...fonts.heading,
    fontSize: 24,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...fonts.body,
    textAlign: "center",
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  reasonsList: {
    gap: spacing.xs,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasonRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  reasonLabel: {
    ...fonts.body,
    flex: 1,
  },
  actions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
