import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button } from "./Button";

interface MakePublicSheetProps {
  visible: boolean;
  onMakePublic: () => void;
  onKeepPrivate: () => void;
  userHandle?: string;
  userLevel?: number;
}

export function MakePublicSheet({
  visible,
  onMakePublic,
  onKeepPrivate,
  userHandle,
  userLevel,
}: MakePublicSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onKeepPrivate}
    >
      <Pressable style={styles.backdrop} onPress={onKeepPrivate}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Make this project public?</Text>
            <Pressable
              onPress={onKeepPrivate}
              hitSlop={12}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* People will see section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>People will see</Text>
            </View>
            <Text style={styles.sectionText}>
              The AI designs, with {userHandle ? `@${userHandle}` : "your handle"} and{" "}
              {userLevel ? `Level ${userLevel}` : "your level"} next to them.
            </Text>
          </View>

          {/* Stays private section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed" size={20} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>Stays private</Text>
            </View>
            <Text style={styles.sectionText}>
              Your original room photo (It shows the inside of your home), your chats,
              quotes and ZIP.
            </Text>
          </View>

          {/* Note */}
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.noteText}>
              You can switch back to Private anytime and the designs come down from Explore.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Button
              label="Make Public"
              onPress={onMakePublic}
              variant="primary"
            />
            <Pressable
              onPress={onKeepPrivate}
              style={styles.keepPrivateButton}
              accessibilityRole="button"
            >
              <Text style={styles.keepPrivateText}>Keep Private</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...fonts.title,
    fontSize: 22,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...fonts.body,
    fontWeight: "600",
    fontSize: 16,
  },
  sectionText: {
    ...fonts.body,
    lineHeight: 22,
    color: colors.textSecondary,
    marginLeft: 28, // Aligned with text after icon
  },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  noteText: {
    ...fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    flex: 1,
  },
  buttons: {
    gap: spacing.md,
  },
  keepPrivateButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  keepPrivateText: {
    ...fonts.body,
    color: colors.textSecondary,
    fontSize: 16,
  },
});
