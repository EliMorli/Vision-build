/**
 * Generating room "breathing" pulse: subtle, never fades the room out.
 * opacity 0.85 to 1, scale 0.97 to 1, 1500 ms each way, ease-in-out.
 */
export const PULSE = { opacityMin: 0.85, opacityMax: 1, scaleMin: 0.97, scaleMax: 1, halfPeriodMs: 1500 } as const;

/** t: 0 to 1 (low to high point of the pulse) */
export function pulseAt(t: number): { opacity: number; scale: number } {
  "worklet";
  const k = Math.min(1, Math.max(0, t));
  return {
    opacity: PULSE.opacityMin + (PULSE.opacityMax - PULSE.opacityMin) * k,
    scale: PULSE.scaleMin + (PULSE.scaleMax - PULSE.scaleMin) * k,
  };
}
