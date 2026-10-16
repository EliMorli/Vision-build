import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

/**
 * Native Sign in with Apple (iOS only).
 *
 * Uses the system Apple sheet, then exchanges Apple's identity token with
 * Supabase via signInWithIdToken. Requires:
 *  - app.json: ios.usesAppleSignIn = true and the expo-apple-authentication plugin
 *  - Supabase Auth > Apple provider: the iOS bundle id (com.visionbuild.app)
 *    listed under "Client IDs" (alongside the web Services ID).
 *
 * Returns null when the user cancels the Apple sheet.
 */
export function shouldUseNativeAppleSignIn(): boolean {
  return Platform.OS === "ios";
}

export async function signInWithAppleNative(): Promise<Session | null> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: any) {
    if (e?.code === "ERR_REQUEST_CANCELED") return null;
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error("Apple sign-in did not return an identity token.");
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple only shares the user's name on the very first sign-in, and it is not
  // inside the identity token, so save it now if we got it.
  const given = credential.fullName?.givenName ?? "";
  const family = credential.fullName?.familyName ?? "";
  const fullName = `${given} ${family}`.trim();
  if (fullName && data.user) {
    try {
      await supabase.auth.updateUser({ data: { full_name: fullName } });
      await supabase
        .from("profiles")
        .update({ display_name: fullName } as never)
        .eq("id", data.user.id)
        .eq("display_name", "");
    } catch {
      // Non-fatal: the user can set their name in Edit Profile.
    }
  }

  return data.session;
}
