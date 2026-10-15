/**
 * Store-capture mode (App Store screenshots and preview video only).
 *
 * Build-time flag: EXPO_PUBLIC_STORE_CAPTURE=1. Off by default, set only by the
 * "store-capture" EAS profile, and never in "production" (scripts/check-store-capture.js
 * fails CI if it is). When on, it hides everything that isn't live at launch:
 * the "Join the waitlist" cards (Home, Results, project page), the pros waitlist
 * setting and the Inbox. Nothing else changes.
 */
export function isStoreCapture(): boolean {
  return process.env.EXPO_PUBLIC_STORE_CAPTURE === "1";
}
