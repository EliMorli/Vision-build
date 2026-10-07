import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

// This screen is never shown - the create tab redirects to /space-type
export default function CreateScreen() {
  return (
    <View style={styles.container}>
      <Text>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
