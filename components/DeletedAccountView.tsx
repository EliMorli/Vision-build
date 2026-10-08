import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, spacing } from "@/lib/theme";
import { APPLE_DELETION_NOTE } from "@/lib/constants/deletion";
import { Button } from "./Button";

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
          <View style={styles.buttonContainer}>
            <Button
              label="Done"
              onPress={onDone}
              variant="primary"
              fullWidth
              testID="delete-done-button"
            />
          </View>
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
  buttonContainer: {
    width: "100%",
    marginTop: spacing.md,
  },
});
