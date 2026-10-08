import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, fonts } from "@/lib/theme";
import { APPLE_DELETION_NOTE } from "@/lib/constants/deletion";

interface DeletedAccountViewProps {
  showNativeActions: boolean;
  isAppleUser: boolean;
  onDone: () => void;
}

export default function DeletedAccountView({
  showNativeActions,
  isAppleUser,
  onDone,
}: DeletedAccountViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Your account has been deleted</Text>
        <Text style={styles.body}>
          All your data has been permanently removed. Thank you for using VisionBuild.
        </Text>
        {showNativeActions && isAppleUser && (
          <Text style={styles.appleSettingsNote}>
            {APPLE_DELETION_NOTE}
          </Text>
        )}
        {showNativeActions && (
          <Pressable
            style={styles.buttonSecondary}
            onPress={onDone}
            testID="delete-done-button"
          >
            <Text style={styles.buttonSecondaryText}>Done</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    maxWidth: 480,
    width: "100%",
    shadowColor: "#1E2859",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    alignItems: "center",
  },
  title: {
    ...fonts.heading,
    fontSize: 28,
    fontFamily: "Nunito_900Black",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    ...fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  appleSettingsNote: {
    ...fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 12,
  },
  buttonSecondaryText: {
    ...fonts.label,
    fontFamily: "Nunito_800ExtraBold",
    color: colors.primary,
    fontSize: 15,
  },
});
