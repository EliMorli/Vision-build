import { View, StyleSheet, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { colors, spacing, radius } from "@/lib/theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

interface LoadingSkeletonProps {
  variant?: "card" | "list" | "grid";
  count?: number;
  testID?: string;
}

export function LoadingSkeleton({ variant = "card", count = 3, testID }: LoadingSkeletonProps) {
  const reduceMotion = useReducedMotion();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmerAnim, reduceMotion]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const renderSkeleton = () => {
    switch (variant) {
      case "card":
        return Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.card}>
            <Animated.View
              style={[
                styles.cardImage,
                reduceMotion ? {} : { opacity: shimmerOpacity },
              ]}
            />
            <View style={styles.cardBody}>
              <Animated.View
                style={[
                  styles.skeletonTitle,
                  reduceMotion ? {} : { opacity: shimmerOpacity },
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonText,
                  { width: "80%" },
                  reduceMotion ? {} : { opacity: shimmerOpacity },
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonText,
                  { width: "60%" },
                  reduceMotion ? {} : { opacity: shimmerOpacity },
                ]}
              />
            </View>
          </View>
        ));

      case "list":
        return Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.listItem}>
            <Animated.View
              style={[
                styles.listAvatar,
                reduceMotion ? {} : { opacity: shimmerOpacity },
              ]}
            />
            <View style={styles.listContent}>
              <Animated.View
                style={[
                  styles.skeletonText,
                  { width: "70%" },
                  reduceMotion ? {} : { opacity: shimmerOpacity },
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonText,
                  { width: "50%", marginTop: 6 },
                  reduceMotion ? {} : { opacity: shimmerOpacity },
                ]}
              />
            </View>
          </View>
        ));

      case "grid":
        return Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.gridItem}>
            <Animated.View
              style={[
                styles.gridImage,
                reduceMotion ? {} : { opacity: shimmerOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonText,
                { marginTop: spacing.xs },
                reduceMotion ? {} : { opacity: shimmerOpacity },
              ]}
            />
          </View>
        ));
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      {renderSkeleton()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
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
    backgroundColor: colors.surface,
  },
  cardBody: {
    padding: spacing.md,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  skeletonText: {
    height: 14,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  listContent: {
    flex: 1,
  },
  gridItem: {
    width: "48%",
    marginBottom: spacing.md,
  },
  gridImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
});
