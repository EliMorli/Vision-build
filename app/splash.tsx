import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/lib/theme";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Show splash for 1.5 seconds, then navigate to intro
    const timer = setTimeout(() => {
      router.replace("/intro");
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={["#0E1B3D", "#2F5BD8"]}
      style={styles.container}
    >
      <View style={styles.wordmark}>
        <Text style={styles.wordmarkVision}>Vision</Text>
        <Text style={styles.wordmarkBuild}>Build</Text>
      </View>
      <ActivityIndicator size="large" color="#fff" style={styles.loader} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordmarkVision: {
    fontSize: 48,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  wordmarkBuild: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: -1,
  },
  loader: {
    marginTop: 32,
  },
});
