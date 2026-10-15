/**
 * App haptics: one call per user-caused moment, fired in the same handler that
 * starts the matching animation (same frame), and never the only feedback.
 *
 *   designLanded  light impact      a design's thumbnail snaps in on Generating
 *   saved         light impact      "Save to my project" succeeds
 *   xpEarned      light impact      the XP reward banner appears
 *   allDone       success           all 4 designs are ready
 *   deleteAccount warning           "Delete my account" is pressed
 *
 * Pure so it can be unit tested: the platform and the haptics module are injected.
 * On web it never calls the module (expo-haptics has no web support).
 */
export type HapticEvent = "designLanded" | "saved" | "xpEarned" | "allDone" | "deleteAccount";

export interface HapticsModule {
  impactAsync(style: unknown): Promise<void>;
  notificationAsync(type: unknown): Promise<void>;
  ImpactFeedbackStyle: { Light: unknown };
  NotificationFeedbackType: { Success: unknown; Warning: unknown };
}

export type HapticCall = { kind: "impact"; style: "light" } | { kind: "notification"; type: "success" | "warning" };

export const HAPTIC_MAP: Record<HapticEvent, HapticCall> = {
  designLanded: { kind: "impact", style: "light" },
  saved: { kind: "impact", style: "light" },
  xpEarned: { kind: "impact", style: "light" },
  allDone: { kind: "notification", type: "success" },
  deleteAccount: { kind: "notification", type: "warning" },
};

export function createHaptics(platformOS: string, mod: HapticsModule | null, record?: (e: HapticEvent) => void) {
  return function fire(event: HapticEvent): void {
    record?.(event);
    if (platformOS === "web" || !mod) return;
    const call = HAPTIC_MAP[event];
    try {
      const p =
        call.kind === "impact"
          ? mod.impactAsync(mod.ImpactFeedbackStyle.Light)
          : mod.notificationAsync(call.type === "success" ? mod.NotificationFeedbackType.Success : mod.NotificationFeedbackType.Warning);
      // Haptics off system-wide or unsupported hardware: nothing to do
      p?.catch?.(() => {});
    } catch {
      // never let feedback break the action
    }
  };
}
