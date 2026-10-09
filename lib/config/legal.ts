/**
 * Hosted legal pages (Terms, Privacy, Open-source licenses, Delete account).
 *
 * The pages are built from this repo by `npm run legal:build` (web-legal/) and
 * hosted at EXPO_PUBLIC_LEGAL_BASE_URL. The app opens them in an in-app browser
 * sheet; no legal or license text is rendered inside the app.
 *
 * FILL-IN (Elimar): set EXPO_PUBLIC_LEGAL_BASE_URL to where web-legal/dist is
 * deployed, e.g. https://visionbuild.app/legal. The release check
 * (scripts/check-legal-release.js) fails while the placeholder is still in use.
 */

/** Placeholder only. Release builds refuse to ship with this value. */
export const LEGAL_BASE_URL_PLACEHOLDER = "https://visionbuild.app/legal";

export const LEGAL_BASE_URL = (
  process.env.EXPO_PUBLIC_LEGAL_BASE_URL || LEGAL_BASE_URL_PLACEHOLDER
).replace(/\/+$/, "");

/**
 * Current Privacy Policy version. The consent screen records this version, and
 * the hosted /privacy page carries it in <meta name="policy-version">. The
 * release check fails if the live page shows a different version.
 * Bump together with web-legal/versions.json when the policy changes.
 */
export const PRIVACY_POLICY_VERSION = "2";

/** Current Terms of Service version (shown on the hosted /terms page). */
export const TERMS_VERSION = "2";

export type LegalPage = "terms" | "privacy" | "licenses" | "deleteAccount";

const PATHS: Record<LegalPage, string> = {
  terms: "/terms",
  privacy: "/privacy",
  licenses: "/licenses",
  deleteAccount: "/delete-account",
};

export function legalUrl(page: LegalPage): string {
  return `${LEGAL_BASE_URL}${PATHS[page]}`;
}

export const LEGAL_URLS: Record<LegalPage, string> = {
  terms: legalUrl("terms"),
  privacy: legalUrl("privacy"),
  licenses: legalUrl("licenses"),
  deleteAccount: legalUrl("deleteAccount"),
};
