import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";

interface MenuOption {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "default" | "destructive";
  testID?: string;
}

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: MenuOption[];
  testID?: string;
}

export function MenuSheet({
  visible,
  onClose,
  title,
  options,
  testID = "menu-sheet",
}: MenuSheetProps) {
  const handleOption = (onPress: () => void) => {
    onPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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

            <View style={styles.options}>
              {options.map((option, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.option,
                    index === options.length - 1 && styles.lastOption,
                  ]}
                  onPress={() => handleOption(option.onPress)}
                  accessibilityRole="button"
                  testID={option.testID}
                >
                  {option.icon && (
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={
                        option.variant === "destructive"
                          ? colors.danger
                          : colors.textPrimary
                      }
                    />
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      option.variant === "destructive" && styles.destructiveText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
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
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 600,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
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
  options: {
    gap: 0,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionText: {
    ...fonts.body,
    fontSize: 16,
  },
  destructiveText: {
    color: colors.danger,
  },
});
