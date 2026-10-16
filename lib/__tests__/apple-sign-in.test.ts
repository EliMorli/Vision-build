/**
 * Sign in with Apple guards (App Review 4.8 and 5.1.1(v)).
 * These read the source because the native Apple sheet can't run in jest;
 * the real round trip needs a TestFlight build (see the PR body).
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) return sourceFiles(rel);
    return /\.(tsx?|jsx?)$/.test(name) ? [rel] : [];
  });
}

describe("Sign in with Apple", () => {
  it("offers Apple on every screen that offers Google", () => {
    const withGoogle = [...sourceFiles("app"), ...sourceFiles("components")].filter((f) =>
      /handleOAuthPress\("google"\)|signInWithOAuth\("google"\)|logo-google/.test(read(f))
    );
    expect(withGoogle.length).toBeGreaterThan(0);
    for (const f of withGoogle) {
      const src = read(f);
      expect({ file: f, apple: /handleOAuthPress\("apple"\)|signInWithOAuth\("apple"\)/.test(src) }).toEqual({
        file: f,
        apple: true,
      });
    }
  });

  it("uses Apple's own button on iOS on the sign-in screen", () => {
    const src = read("app/(auth)/sign-in.tsx");
    expect(src).toMatch(/Platform\.OS === "ios"[\s\S]*AppleAuthenticationButton/);
  });

  it("sends the SHA-256 nonce to Apple and the raw nonce to Supabase", () => {
    const src = read("lib/auth/apple-native.ts");
    expect(src).toMatch(/digestStringAsync\(\s*Crypto\.CryptoDigestAlgorithm\.SHA256,\s*rawNonce/);
    expect(src).toMatch(/signInAsync\(\{[\s\S]*nonce:\s*hashedNonce/);
    expect(src).toMatch(/signInWithIdToken\(\{[\s\S]*provider:\s*"apple"[\s\S]*nonce:\s*rawNonce/);
  });

  it("routes iOS Apple sign-in through the native sheet", () => {
    expect(read("lib/store.ts")).toMatch(/provider === "apple" && shouldUseNativeAppleSignIn\(\)/);
  });

  it("asks for an Apple authorization code before in-app deletion", () => {
    const settings = read("app/(tabs)/(vi,profile,home)/profile-settings.tsx");
    expect(settings).toMatch(/getAppleAuthCodeForDeletion/);
    expect(settings).toMatch(/body:\s*\{\s*appleAuthCode\s*\}/);
  });

  it("revokes Apple tokens for linked Apple identities, not just Apple-first accounts", () => {
    const src = read("supabase/functions/_shared/delete-user-data.ts");
    expect(src).toMatch(/userIdentities\.some\(\(i: any\) => i\?\.provider === "apple"\)/);
    expect(src).toMatch(/appleid\.apple\.com\/auth\/revoke/);
  });
});
