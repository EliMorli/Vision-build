import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "./Button";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

interface ConfirmationSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  testID?: string;
}

export function ConfirmationSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  testID = "confirmation-sheet",
}: ConfirmationSheetProps) {
  const reduceMotion = useReducedMotion();
  
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View style={styles.container} testID={testID}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.message}>{message}</Text>

            <View style={styles.actions}>
              <Button
                label={confirmLabel}
                variant={confirmVariant}
                onPress={handleConfirm}
                fullWidth
                testID={`${testID}-confirm`}
              />
              <Button
                label="Cancel"
                variant="outline"
                onPress={onClose}
                fullWidth
                testID={`${testID}-cancel`}
              />
            </View>
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...fonts.heading,
    fontSize: 18,
  },
  message: {
    ...fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "column",
    gap: spacing.sm,
  },
});
