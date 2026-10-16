import { SafeAreaView, ScrollView, Text, StyleSheet } from "react-native";

const termsMarkdown = "# Terms of Service\n\nAcme Inc provides this service.\n\nContact us at support@acme.com for help.";

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
