import { SafeAreaView, ScrollView, Text, StyleSheet } from "react-native";

const termsMarkdown = "# Terms of Service\n\n[YOUR_COMPANY_NAME] provides this service.\n\nContact us at [support@yourdomain.com] for help.";

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text>{termsMarkdown}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
});
