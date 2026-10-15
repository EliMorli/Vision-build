/**
 * Sheet physics shared by DraggableSheet (worklet-safe, unit tested).
 */
export const SHEET_SPRING = { duration: 300, dampingRatio: 0.8 } as const;
/** Fraction of the sheet's height a projected release must pass to close */
export const DISMISS_FRACTION = 0.4;

/** Where momentum would carry a release (px), iOS-style deceleration 0.998 */
export function project(velocity: number, deceleration = 0.998): number {
  "worklet";
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

/** Resistance past an edge: moves less the further it goes, never past `dimension` */
export function rubberband(offset: number, dimension: number, constant = 0.55): number {
  "worklet";
  const sign = offset < 0 ? -1 : 1;
  const d = Math.abs(offset);
  return sign * (1 - 1 / ((d * constant) / Math.max(dimension, 1) + 1)) * dimension;
}

/** Velocity or distance: a quick flick closes even a few px down */
export function shouldDismiss(y: number, velocityY: number, height: number): boolean {
  "worklet";
  return y + project(velocityY) > height * DISMISS_FRACTION;
}
