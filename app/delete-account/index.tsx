import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { DELETED_DATA_SUMMARY } from "@/lib/constants/deletion";

export default function DeleteAccountRequest() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("request-account-deletion", {
        body: { email: email.trim(), note: note.trim() || null },
      });

      if (error) {
        throw error;
      }

      // Always show success message (prevents enumeration)
      setSubmitted(true);
    } catch (error: any) {
      console.error("Delete account request error:", error);
      // Still show success to prevent enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            If an account exists for that email, we sent a confirmation link. Check your inbox and follow the
            instructions to complete your deletion request.
          </Text>
          <Text style={[styles.body, styles.muted]}>
            The link expires in 24 hours. If you don't receive it, check your spam folder or try again.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Delete your account</Text>
        <Text style={styles.body}>
          Enter your email address to receive a confirmation link. We'll send you an email with instructions to
          permanently delete your account.
        </Text>

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          placeholderTextColor="#A3AAC6"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Text style={styles.label}>Reason (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={note}
          onChangeText={setNote}
          placeholder="Tell us why you're leaving..."
          placeholderTextColor="#A3AAC6"
          multiline
          numberOfLines={3}
          editable={!loading}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send confirmation email</Text>
          )}
        </Pressable>

        <Text style={styles.warning}>
          This will permanently delete {DELETED_DATA_SUMMARY}. This action cannot be
          undone.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FE",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    maxWidth: 480,
    width: "100%",
    shadowColor: "#1E2859",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1B2140",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4A5378",
    marginBottom: 20,
  },
  muted: {
    fontSize: 14,
    color: "#6B7396",
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B2140",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F4F6FE",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#1B2140",
    borderWidth: 2,
    borderColor: "#E1E5F2",
  },
  textarea: {
    height: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#EA4335",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#B3261E",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  warning: {
    fontSize: 13,
    lineHeight: 18,
    color: "#C5221F",
    marginTop: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});
