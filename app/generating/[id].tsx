import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { tabHref } from "@/lib/navigation/tabs";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore } from "@/lib/store";
import { Button, IsoRoom, GeneratingProgressBar } from "@/components";
<<<<<<< HEAD
import Reanimated, { FadeIn, Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { PULSE, pulseAt } from "@/lib/generating/pulse";
=======
import Reanimated, { FadeIn } from "react-native-reanimated";
>>>>>>> origin/cursor/visionbuild-client-flow-740f
import { getGeneratingProgress } from "@/lib/generating/progress";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

const LONG_RUNNING_THRESHOLD_MS = 45000; // 45 seconds

export default function GeneratingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showLongRunning, setShowLongRunning] = useState(false);
  const reduceMotion = useReducedMotion();

  const { 
    currentProject, 
    loading, 
    progressMessage, 
    generatingStartTime,
  } = useProjectStore();

  const selectedStyle = currentProject?.selected_style || "modern";
  
  // Real progress only: designs that exist, never elapsed time
  const genProgress = getGeneratingProgress({ loading, projectId: id, project: currentProject });
  const readyCount = genProgress.readyCount;
<<<<<<< HEAD

  // A design landing (its segment snaps full, its thumbnail fades in) gets a
  // light tap in the same commit; all 4 ready gets the success notification.
  const prevReady = useRef(readyCount);
  useEffect(() => {
    if (readyCount > prevReady.current) haptic(readyCount >= 4 ? "allDone" : "designLanded");
    prevReady.current = readyCount;
  }, [readyCount]);
=======
>>>>>>> origin/cursor/visionbuild-client-flow-740f

  // Navigate to results when generation is complete
  useEffect(() => {
    if (!loading && currentProject?.status === "generated" && id) {
      // Close the create flow and show the designs inside the tab it started
      // from (Home for the + button), with the tab bar visible.
      router.dismissTo(tabHref(`/result/${id}`) as any);
    }
  }, [loading, currentProject?.status, id, router]);

  // Long-running detection (no time-left estimate: only real progress is shown)
  useEffect(() => {
    if (!loading || !generatingStartTime) {
      return; // Don't set state, let it naturally reset
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - generatingStartTime;

      if (elapsed > LONG_RUNNING_THRESHOLD_MS) {
        setShowLongRunning(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [loading, generatingStartTime]);

  // Room "breathing" pulse on the UI thread: opacity 0.85-1, scale 0.97-1 (never invisible).
  // Reduce Motion: no pulse, the room stays still at full opacity.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion || !loading) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = 1;
    pulse.value = withRepeat(withTiming(0, { duration: PULSE.halfPeriodMs, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [loading, reduceMotion, pulse]);
  const roomPulseStyle = useAnimatedStyle(() => {
    const v = pulseAt(pulse.value);
    return { opacity: v.opacity, transform: [{ scale: v.scale }] };
  });

  const handleGoHome = () => {
    router.dismissTo("/(tabs)/(home)" as any);
  };

  return (
    <LinearGradient
      colors={["#2F5BD8", "#0E1B3D"]}
      locations={[0, 0.75]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} testID="generating-screen">
        <View style={styles.content}>
        <Text style={styles.step}>STEP 3 OF 3</Text>
        <Text style={styles.title}>Building your{"\n"}{selectedStyle} room</Text>

        {/* Room being "built" */}
        <Reanimated.View style={[styles.roomWrapper, roomPulseStyle]} testID="generating-room">
          <IsoRoom
            palette={selectedStyle}
            size={250}
            spark={true}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
        </Reanimated.View>

        {/* Slot thumbnails */}
        <View style={styles.slots}>
          {Array.from({ length: 4 }, (_, i) => (
            <View key={i} style={[styles.slot, i >= readyCount && styles.slotWaiting]}>
              {i < readyCount ? (
                <Reanimated.View entering={reduceMotion ? undefined : FadeIn.duration(300)} testID={`generating-thumb-${i + 1}`}>
                  <IsoRoom
                    palette={selectedStyle}
                    size={64}
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                  />
                </Reanimated.View>
              ) : i === readyCount ? (
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
          <GeneratingProgressBar progress={genProgress} reduceMotion={reduceMotion} />
          <View style={styles.progressLabels}>
            <Text style={styles.progressText} testID="generating-progress-label">
              {progressMessage || genProgress.label}
            </Text>
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
        ) : readyCount > 0 ? (
          <Button
            label={`Peek at the ${readyCount} that ${readyCount === 1 ? "is" : "are"} ready`}
            onPress={() => router.dismissTo(tabHref(`/result/${id}`) as any)}
            variant="outline"
          />
        ) : null}
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
  slotWaiting: {
    borderWidth: 2,
    borderColor: "#fff",
    borderStyle: "dashed",
    backgroundColor: "transparent",
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
