import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import type { Session } from "@supabase/supabase-js";

/** True when the signed-in account was created with Sign in with Apple. */
export function isAppleSession(session: Session | null | undefined): boolean {
  const user = session?.user;
  if (!user) return false;
  if (user.app_metadata?.provider === "apple") return true;
  return (user.identities || []).some((i) => i.provider === "apple");
}

/**
 * On iOS, ask Apple for a fresh authorization code so the server can revoke
 * the user's Sign in with Apple tokens when the account is deleted
 * (App Review guideline 5.1.1(v)). Returns undefined on other platforms, for
 * non-Apple accounts, or if the user cancels; deletion still proceeds.
 */
export async function getAppleAuthCodeForDeletion(
  session: Session | null | undefined
): Promise<string | undefined> {
  if (Platform.OS !== "ios" || !isAppleSession(session)) return undefined;
  try {
    if (!(await AppleAuthentication.isAvailableAsync())) return undefined;
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
    return credential.authorizationCode || undefined;
  } catch {
    return undefined;
  }
}
