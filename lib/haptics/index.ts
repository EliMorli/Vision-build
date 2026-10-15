import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { createHaptics, type HapticEvent } from "./core";

export type { HapticEvent } from "./core";

// Dev mock mode (e2e) records each event so tests can check the moment it fired.
// Haptics themselves are a no-op on web.
const record =
  __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true" && typeof window !== "undefined"
    ? (e: HapticEvent) => {
        const w = window as unknown as { __hapticsLog?: HapticEvent[] };
        (w.__hapticsLog ??= []).push(e);
      }
    : undefined;

export const haptic = createHaptics(Platform.OS, Haptics as never, record);
