import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore } from "@/lib/store";
import { Button, IsoRoom } from "@/components";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

const LONG_RUNNING_THRESHOLD_MS = 45000; // 45 seconds

export default function GeneratingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [countdown, setCountdown] = useState(20);
  const [showLongRunning, setShowLongRunning] = useState(false);
  const [layerOpacity] = useState(new Animated.Value(0));
  const reduceMotion = useReducedMotion();

  const { 
    currentProject, 
    loading, 
    progress, 
    progressMessage, 
    generatingStartTime,
  } = useProjectStore();

  const selectedStyle = currentProject?.selected_style || "modern";

  // Navigate to results when generation is complete
  useEffect(() => {
    if (!loading && currentProject?.status === "generated" && id) {
      router.replace(`/result/${id}`);
    }
  }, [loading, currentProject?.status, id, router]);

  // Countdown timer and long-running detection
  useEffect(() => {
    if (!loading || !generatingStartTime) {
      // Use setTimeout to avoid sync setState in effect body
      const timeout = setTimeout(() => {
        setCountdown(20);
        setShowLongRunning(false);
      }, 0);
      return () => clearTimeout(timeout);
    }

    // Update on interval only to avoid sync setState
    const interval = setInterval(() => {
      const elapsed = Date.now() - generatingStartTime;
      const remaining = Math.max(0, Math.ceil((20000 - elapsed) / 1000));
      setCountdown(remaining);

      if (elapsed > LONG_RUNNING_THRESHOLD_MS) {
        setShowLongRunning(true);
      }
    }, 100); // Start immediately with 100ms

    return () => clearInterval(interval);
  }, [loading, generatingStartTime]);

  // Animate room layers (respect reduce motion)
  useEffect(() => {
    if (reduceMotion || !loading) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(layerOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(layerOpacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [loading, reduceMotion, layerOpacity]);

  const handleGoHome = () => {
    router.push("/(tabs)/");
  };

  return (
    <LinearGradient
      colors={["#2F5BD8", "#0E1B3D"]}
      locations={[0, 0.75]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
        <Text style={styles.step}>STEP 3 OF 3</Text>
        <Text style={styles.title}>Building your{"\n"}{selectedStyle} room</Text>

        {/* Room being "built" */}
        <Animated.View style={[styles.roomWrapper, { opacity: reduceMotion ? 1 : layerOpacity }]}>
          <IsoRoom
            palette={selectedStyle}
            size={250}
            spark={true}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
        </Animated.View>

        {/* Slot thumbnails */}
        <View style={styles.slots}>
          {Array.from({ length: 4 }, (_, i) => (
            <View key={i} style={styles.slot}>
              {i < Math.floor(progress * 4) ? (
                <IsoRoom
                  palette={selectedStyle}
                  size={74}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                />
              ) : i === Math.floor(progress * 4) ? (
                <View style={styles.slotActive}>
                  <Text style={styles.slotText}>…</Text>
                </View>
              ) : (
                <Text style={styles.slotNumber}>{i + 1}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {progressMessage || `Design ${Math.floor(progress * 4) + 1} of 4`}
            </Text>
            {!showLongRunning && countdown > 0 && (
              <Text style={styles.progressText}>About {countdown} sec left</Text>
            )}
          </View>
        </View>

        {/* Fun fact */}
        <View style={styles.funFact}>
          <Text style={styles.funFactText}>
            💡 {selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} style keeps your layout and swaps in fresh finishes and furnishings.
          </Text>
        </View>

        {/* Long-running UI */}
        {showLongRunning ? (
          <View style={styles.longRunningSection}>
            <View style={styles.longRunningBox}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.longRunningText}>
                This is taking longer than usual. We'll notify you when your designs are ready.
              </Text>
            </View>
            <Button
              label="Go to Home"
              icon="home-outline"
              onPress={handleGoHome}
              variant="secondary"
            />
          </View>
        ) : (
          <Button
            label="Peek at the 2 that are ready"
            onPress={() => router.push(`/result/${id}`)}
            variant="outline"
            disabled={progress < 0.5}
          />
        )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  step: {
    fontSize: 12,
    fontWeight: "800",
    color: "#BFD0FF",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  title: {
    ...fonts.heading,
    fontSize: 24,
    color: "#fff",
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  roomWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 20,
    marginBottom: spacing.lg,
  },
  slots: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  slot: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  slotActive: {
    flex: 1,
    width: "100%",
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: "solid",
    backgroundColor: "rgba(251, 188, 4, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  slotText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.accent,
  },
  slotNumber: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(255, 255, 255, 0.5)",
  },
  progressSection: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: radius.full,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#BFD0FF",
  },
  funFact: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  funFactText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 18,
  },
  longRunningSection: {
    width: "100%",
    gap: spacing.sm,
  },
  longRunningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.md,
  },
  longRunningText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    lineHeight: 18,
  },
});
