import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "@/lib/theme";
import type { GeneratingProgress } from "@/lib/generating/progress";

/**
 * Four-segment Generating bar driven only by real progress (see lib/generating/progress.ts).
 * Done segments are full. The active one gets a soft shimmer on the UI thread
 * that loops and says nothing about time, or a steady highlight with Reduce
 * Motion on. Waiting segments are empty.
 */
export function GeneratingProgressBar({ progress, reduceMotion }: { progress: GeneratingProgress; reduceMotion: boolean }) {
  return (
    <View
      style={styles.bar}
      testID="generating-progress-bar"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={progress.accessibilityLabel}
      accessibilityValue={progress.accessibilityValue}
      aria-label={progress.accessibilityLabel}
      aria-valuemin={progress.accessibilityValue.min}
      aria-valuemax={progress.accessibilityValue.max}
      aria-valuenow={progress.accessibilityValue.now}
      aria-valuetext={progress.accessibilityValue.text}
    >
      {progress.segments.map((state, i) => (
        <View
          key={i}
          style={[styles.segment, state === "done" && styles.segmentDone]}
          testID={`generating-segment-${i + 1}`}
          data-state={state}
          {...({ dataSet: { state } } as object)}
        >
          {state === "active" &&
            (reduceMotion ? (
              <View style={styles.steady} testID="generating-segment-steady" />
            ) : (
              <Shimmer />
            ))}
        </View>
      ))}
    </View>
  );
}

function Shimmer() {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(x);
  }, [x]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.35 * Math.sin(Math.PI * x.value),
    transform: [{ translateX: `${-60 + 120 * x.value}%` }],
  }));
  return <Animated.View style={[styles.shimmer, style]} testID="generating-segment-shimmer" />;
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: 6, height: 14, marginBottom: 4 },
  segment: {
    flex: 1,
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  segmentDone: { backgroundColor: colors.accent },
  steady: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255, 255, 255, 0.45)" },
  shimmer: { position: "absolute", top: 0, bottom: 0, left: 0, width: "100%", backgroundColor: "rgba(255, 255, 255, 0.55)", borderRadius: radius.full },
});
