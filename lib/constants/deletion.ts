/**
 * Account deletion constants
 * Compliance-approved text - do not modify without legal review
 */

/**
 * Compliance-approved Apple settings note
 * Shown to Apple sign-in users after account deletion in native apps
 */
export const APPLE_DELETION_NOTE = "We've also asked Apple to disconnect VisionBuild from your Apple ID. To check, open Settings, tap your name, then Sign-In & Security, then Sign in with Apple.";

/**
 * Determines whether the Apple settings note should be shown
 * @param platform - React Native Platform.OS value ('ios', 'android', 'web', etc.)
 * @param isAppleUser - Whether the user signed in with Apple
 * @returns true if the note should be shown, false otherwise
 */
export function shouldShowAppleNote(
  platform: string,
  isAppleUser: boolean
): boolean {
  return platform !== "web" && isAppleUser;
}
