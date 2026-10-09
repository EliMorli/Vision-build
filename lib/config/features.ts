/**
 * Launch feature flags.
 *
 * CONTRACTOR_OUTREACH_ENABLED (pros / outreach) is OFF at launch. While it is
 * off, the Inbox tab is hidden (nothing can arrive in it before pros are live)
 * and the inbox route redirects Home. Turn it on with
 * EXPO_PUBLIC_CONTRACTOR_OUTREACH_ENABLED=true when pros launch.
 *
 * In dev mock mode (e2e), `@visionbuild:mock_outreach_enabled` = "true" in
 * localStorage turns it on so both states can be tested.
 */
function mockOverride(): boolean {
  if (!(__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true")) return false;
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("@visionbuild:mock_outreach_enabled") === "true";
  } catch {
    return false;
  }
}

export function isOutreachEnabled(): boolean {
  return process.env.EXPO_PUBLIC_CONTRACTOR_OUTREACH_ENABLED === "true" || mockOverride();
}
