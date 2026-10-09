import { useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

/**
 * iOS accessibility text sizes (AX1 and up) start at a font scale of about 1.64;
 * Android's largest setting is 2.0. At or above this we treat the text size as
 * "largest" and drop optional hints so the content keeps its room.
 */
export const LARGEST_TEXT_FONT_SCALE = 1.6;

const MOCK_FONT_SCALE_KEY = "@visionbuild:mock_font_scale";

/**
 * Dev-only (mock session on web): React Native Web always reports fontScale 1,
 * so the large-text e2e sets the scale it simulates in localStorage.
 * Never active in a production build.
 */
function readMockFontScale(): number | null {
  if (!(__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true")) return null;
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  const value = parseFloat(localStorage.getItem(MOCK_FONT_SCALE_KEY) ?? "");
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** The system text-size multiplier (Dynamic Type / Android font scale). */
export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  const [mockScale] = useState(readMockFontScale);
  return mockScale ?? fontScale;
}

/** True at the largest system text sizes. */
export function useIsLargestText(): boolean {
  return useFontScale() >= LARGEST_TEXT_FONT_SCALE;
}
