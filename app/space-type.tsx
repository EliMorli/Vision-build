import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "@/components";

type SpaceType = "interior" | "exterior" | "backyard";

interface SpaceOption {
  id: SpaceType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const SPACE_OPTIONS: SpaceOption[] = [
  {
    id: "interior",
    label: "Interior",
    icon: "home",
    description: "Kitchen, bedroom, bathroom, living room",
  },
  {
    id: "exterior",
    label: "Exterior",
    icon: "business",
    description: "Front of house, siding, windows, doors",
  },
  {
    id: "backyard",
    label: "Backyard",
    icon: "leaf",
    description: "Patio, deck, landscaping, pool area",
  },
];

export default function SpaceTypeScreen() {
  const [selectedType, setSelectedType] = useState<SpaceType | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    // Navigate to the camera screen to capture the space
    router.push("/camera");
  };

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
          <Text style={styles.title}>What space are you renovating?</Text>
          <Text style={styles.subtitle}>Choose the type of project to get started</Text>
        </View>

        {/* Space options */}
        <View style={styles.options}>
          {SPACE_OPTIONS.map((option) => {
            const isSelected = selectedType === option.id;
            return (
              <Pressable accessibilityRole="button"
                key={option.id}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setSelectedType(option.id)}
              >
                <View
                  style={[
                    styles.optionIcon,
                    isSelected && styles.optionIconSelected,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={40}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer button */}
      <View style={styles.footer}>
        <Button
          label="Continue"
          icon="arrow-forward"
          onPress={handleContinue}
          disabled={!selectedType}
          variant="primary"
        />
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
    paddingBottom: spacing.lg,
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
  options: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  optionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  optionIconSelected: {
    backgroundColor: colors.primary + "15",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...fonts.title,
    fontSize: 18,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionDescription: {
    ...fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  checkmark: {
    marginLeft: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
