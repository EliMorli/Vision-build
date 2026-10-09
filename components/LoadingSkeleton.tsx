import { View, StyleSheet, Animated, Easing, ViewStyle, DimensionValue } from "react-native";
import { useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius } from "@/lib/theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

interface LoadingSkeletonProps {
  variant?: "card" | "list" | "grid";
  count?: number;
  testID?: string;
}

/** Clay-gray placeholder tone: clearly visible on white cards and backgrounds. */
export const SKELETON_COLOR = "#EEF1F6";
/** Soft white highlight that sweeps across each placeholder while loading. */
const SHIMMER_COLORS = ["rgba(255,255,255,0)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0)"] as const;
const SHIMMER_DURATION_MS = 1300;

interface BoneProps {
  style: ViewStyle | ViewStyle[];
  shimmer: Animated.Value;
  animate: boolean;
}

/**
 * One placeholder block. When motion is allowed a white band sweeps from left
 * to right; under Reduce Motion the block is a static clay-gray shape.
 */
function Bone({ style, shimmer, animate }: BoneProps) {
  const left = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ["-60%", "110%"] as unknown as number[],
  });
  return (
    <View
      style={[styles.bone, style]}
      testID="skeleton-bone"
    >
      {animate && (
        <Animated.View
          pointerEvents="none"
          testID="skeleton-shimmer"
          style={[styles.shimmerBand, { left: left as unknown as DimensionValue }]}
        >
          <LinearGradient
            colors={SHIMMER_COLORS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function LoadingSkeleton({ variant = "card", count = 3, testID }: LoadingSkeletonProps) {
  const reduceMotion = useReducedMotion();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const animate = !reduceMotion;

  useEffect(() => {
    if (!animate) {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: SHIMMER_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
        // Animates `left`, which the native driver does not support
        useNativeDriver: false,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmerAnim, animate]);

  const bone = (style: ViewStyle | ViewStyle[]) => (
    <Bone style={style} shimmer={shimmerAnim} animate={animate} />
  );

  const renderSkeleton = () => {
    switch (variant) {
      case "card":
        return Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.card}>
            {bone(styles.cardImage)}
            <View style={styles.cardBody}>
              {bone(styles.skeletonTitle)}
              {bone([styles.skeletonText, { width: "80%" }])}
              {bone([styles.skeletonText, { width: "60%" }])}
            </View>
          </View>
        ));

      case "list":
        return Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.listItem}>
            {bone(styles.listAvatar)}
            <View style={styles.listContent}>
              {bone([styles.skeletonText, { width: "70%" }])}
              {bone([styles.skeletonText, { width: "50%", marginTop: 6 }])}
            </View>
          </View>
        ));

      case "grid":
        return (
          <View style={styles.gridContainer}>
            {Array.from({ length: count }).map((_, i) => (
              <View key={i} style={styles.gridItem}>
                {bone(styles.gridImage)}
                {/* Title + style lines, like the Explore card caption strip */}
                {bone([styles.skeletonText, { marginTop: spacing.sm, width: "75%" }])}
                {bone([styles.skeletonText, { width: "45%", height: 12 }])}
              </View>
            ))}
          </View>
        );
    }
  };

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      {renderSkeleton()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  bone: {
    backgroundColor: SKELETON_COLOR,
    overflow: "hidden",
  },
  shimmerBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "55%",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardImage: {
    width: "100%",
    height: 170,
  },
  cardBody: {
    padding: spacing.md,
  },
  skeletonTitle: {
    height: 20,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  skeletonText: {
    height: 14,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  listContent: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    marginBottom: spacing.md,
  },
  gridImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
  },
});
