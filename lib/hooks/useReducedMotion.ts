import { useState, useEffect } from "react";
import { AccessibilityInfo } from "react-native";
import { usePrivacyStore } from "@/lib/store";

export function useReducedMotion(): boolean {
  const reduceMotionSetting = usePrivacyStore((s) => s.reduceMotion);
  const [osReduceMotion, setOsReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setOsReduceMotion(enabled ?? false);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setOsReduceMotion
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotionSetting || osReduceMotion;
}
