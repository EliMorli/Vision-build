import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { project, rubberband, shouldDismiss, SHEET_SPRING } from "@/lib/sheetPhysics";

interface DraggableSheetProps {
  visible: boolean;
  /** Called after the sheet has animated out (drag, backdrop, back button) */
  onDismiss: () => void;
  children: ReactNode;
  /** Drag only from the grabber + `header` (use when the body scrolls) */
  header?: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  backdropLabel?: string;
  backdropTestID?: string;
  testID?: string;
}

/**
 * Bottom sheet you can drag to dismiss. The sheet follows the finger 1:1 on the
 * UI thread (gesture-handler + Reanimated) and resists upward drags (rubber band).
 * On release, distance or flick velocity decides: projected past 40% of its height
 * closes it; otherwise it springs home carrying the finger's velocity.
 * Reduce Motion: no slide or spring. The sheet appears and disappears in place;
 * a drag still follows the finger, and on release it closes or snaps home at once.
 */
export function DraggableSheet({
  visible,
  onDismiss,
  children,
  header,
  sheetStyle,
  backdropLabel = "Dismiss",
  backdropTestID,
  testID,
}: DraggableSheetProps) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const height = useSharedValue(800);
  const y = useSharedValue(800);
  const fade = useSharedValue(0);
  const start = useSharedValue(0);
  // Mount as soon as it's asked to show (during render, not in an effect)
  if (visible && !mounted) setMounted(true);

  // Open / close driven by `visible`
  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        // Reduce Motion: appears in place at full opacity, no slide
        y.value = 0;
        fade.value = 1;
      } else {
        fade.value = 1;
        y.value = height.value;
        y.value = withSpring(0, SHEET_SPRING);
      }
    } else if (mounted) {
      const done = (finished?: boolean) => {
        "worklet";
        if (finished) runOnJS(setMounted)(false);
      };
      if (reduceMotion) {
        fade.value = 0;
        runOnJS(setMounted)(false);
      } else y.value = withSpring(height.value, { ...SHEET_SPRING, overshootClamping: true }, done);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .onStart(() => {
          start.value = y.value; // continue from where the eye last saw it
        })
        .onUpdate((e) => {
          const next = start.value + e.translationY;
          y.value = next >= 0 ? next : rubberband(next, height.value);
        })
        .onEnd((e) => {
          if (shouldDismiss(y.value, e.velocityY, height.value)) {
            if (reduceMotion) {
              fade.value = 0;
              runOnJS(onDismiss)();
            } else {
              y.value = withSpring(height.value, { ...SHEET_SPRING, velocity: e.velocityY, overshootClamping: true }, (f) => {
                if (f) runOnJS(onDismiss)();
              });
            }
          } else if (reduceMotion) {
            y.value = 0;
          } else {
            y.value = withSpring(0, { ...SHEET_SPRING, velocity: e.velocityY });
          }
        }),
    [onDismiss, reduceMotion, y, start, height, fade]
  );

  const sheetAnim = useAnimatedStyle(() => ({
    opacity: reduceMotion ? fade.value : 1,
    transform: [{ translateY: Math.max(y.value, -height.value) }],
  }));
  const backdropAnim = useAnimatedStyle(() => ({
    opacity: fade.value * interpolate(y.value, [0, height.value], [1, 0], Extrapolation.CLAMP),
  }));

  if (!mounted) return null;

  const grabber = (
    <View style={styles.grabberRow} testID={testID ? `${testID}-grabber` : undefined}>
      <View style={styles.grabber} />
    </View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={backdropLabel}
            testID={backdropTestID}
          />
        </Animated.View>
        {header !== undefined ? (
          <Animated.View
            style={[styles.sheet, sheetStyle, sheetAnim]}
            onLayout={(e) => { height.value = e.nativeEvent.layout.height; }}
            testID={testID}
          >
            <GestureDetector gesture={pan}>
              <View>
                {grabber}
                {header}
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        ) : (
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[styles.sheet, sheetStyle, sheetAnim]}
              onLayout={(e) => { height.value = e.nativeEvent.layout.height; }}
              testID={testID}
            >
              {grabber}
              {children}
            </Animated.View>
          </GestureDetector>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  grabberRow: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#D0D4D9" },
});
