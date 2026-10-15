/**
 * Press feedback values (transform and opacity only, never layout).
 *
 * Motion allowed: scale to 0.97 in 120 ms. 3D-edge buttons also translate 2px
 * down into their edge, replacing the old borderBottomWidth/marginTop swap that
 * shifted the layout.
 * Reduce Motion: no movement. The press still shows as a slight dim (opacity 0.85).
 */
export const PRESS_DURATION_MS = 120;
export const PRESS_SCALE = 0.97;
export const PRESS_EDGE_TRANSLATE = 2;
export const PRESS_DIM_OPACITY = 0.85;

export interface PressVisual {
  scale: number;
  translateY: number;
  opacity: number;
}

/** progress: 0 = released, 1 = fully pressed (animated in between) */
export function pressVisual(progress: number, reduceMotion: boolean, hasEdge: boolean): PressVisual {
  "worklet";
  if (reduceMotion) return { scale: 1, translateY: 0, opacity: 1 - (1 - PRESS_DIM_OPACITY) * progress };
  return {
    scale: 1 - (1 - PRESS_SCALE) * progress,
    translateY: hasEdge ? PRESS_EDGE_TRANSLATE * progress : 0,
    opacity: 1,
  };
}
