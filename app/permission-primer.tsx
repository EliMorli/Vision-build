import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "@/components";

type PermissionType = "camera" | "photos";

const PERMISSION_INFO: Record<PermissionType, {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction?: string;
}> = {
  camera: {
    icon: "camera",
    title: "Camera access",
    description: "We need camera access so you can take photos of your rooms. Your photos are only used to generate your personalized designs and are never shared without your permission.",
    primaryAction: "Allow Camera",
    secondaryAction: "Use Gallery Instead",
  },
  photos: {
    icon: "images",
    title: "Photo library access",
    description: "We need access to your photo library so you can select existing photos of your rooms. We only access the specific photos you choose.",
    primaryAction: "Allow Photos",
  },
};

export default function PermissionPrimerScreen() {
  const { type } = useLocalSearchParams<{ type: PermissionType }>();
  const router = useRouter();
  const info = PERMISSION_INFO[type || "camera"];

  const handlePrimaryAction = () => {
    // In production, this would trigger the system permission request
    // For now, just navigate back or to the appropriate screen
    if (type === "camera") {
      router.push("/camera");
    } else {
      router.back();
    }
  };

  const handleSecondaryAction = () => {
    if (type === "camera") {
      // Go to photo library picker
      router.push("/camera");
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name={info.icon} size={56} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{info.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{info.description}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={info.primaryAction}
          icon="checkmark-circle"
          onPress={handlePrimaryAction}
          variant="primary"
        />
        {info.secondaryAction && (
          <Button
            label={info.secondaryAction}
            onPress={handleSecondaryAction}
            variant="outline"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...fonts.heading,
    fontSize: 28,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  description: {
    ...fonts.body,
    textAlign: "center",
    lineHeight: 24,
    color: colors.textSecondary,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
