import { test, expect, type Page } from "@playwright/test";

/**
 * Tab bar: Home · Explore · + · Vi · Profile while the outreach flag is off
 * (launch). With outreach on, Inbox takes Vi's slot and Vi is a button on Home.
 * Vi needs AI consent first (the server refuses chat without it).
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

async function seed(page: Page, opts: { consent?: boolean; outreach?: boolean } = {}) {
  const { consent = true, outreach = false } = opts;
  await page.addInitScript(({ consent, outreach }) => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:mock_session", "true");
    if (consent) {
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    }
    if (outreach) localStorage.setItem("@visionbuild:mock_outreach_enabled", "true");
  }, { consent, outreach });
}

/** Tab button boxes, left to right, and checks they mirror around the + button. */
async function expectSymmetricBar(page: Page, ids: string[]) {
  const boxes = [];
  for (const id of ids) {
    const el = page.getByTestId(id);
    await expect(el).toBeVisible();
    boxes.push((await el.boundingBox())!);
  }
  const centers = boxes.map((b) => b.x + b.width / 2);
  // Left to right in the given order
  for (let i = 1; i < centers.length; i++) expect(centers[i]).toBeGreaterThan(centers[i - 1]);
  // + is the middle of five, centered on the screen
  expect(ids).toHaveLength(5);
  const vw = page.viewportSize()!.width;
  expect(Math.abs(centers[2] - vw / 2)).toBeLessThanOrEqual(2);
  // Mirror pairs: Home/Profile and Explore/(Vi|Inbox)
  expect(Math.abs((centers[0] + centers[4]) / 2 - centers[2])).toBeLessThanOrEqual(2);
  expect(Math.abs((centers[1] + centers[3]) / 2 - centers[2])).toBeLessThanOrEqual(2);
  // Equal slots
  const widths = boxes.map((b) => b.width);
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(2);
}

test.describe("Tab bar and Vi", () => {
  test("outreach off: Home · Explore · + · Vi · Profile, symmetric around +", async ({ page }) => {
    await seed(page);
    await page.goto(BASE_URL);
    await expect(page.getByTestId("tab-home")).toBeVisible({ timeout: 15000 });
    await expectSymmetricBar(page, ["tab-home", "tab-explore", "tab-create", "tab-vi", "tab-profile"]);
    await expect(page.getByTestId("tab-inbox")).toHaveCount(0);
    await expect(page.getByTestId("home-vi-button")).toHaveCount(0);
    // Sentence-case label and a descriptive accessible name
    await expect(page.getByTestId("tab-vi")).toContainText("Vi");
    await expect(page.getByTestId("tab-vi")).toHaveAttribute("aria-label", "Vi, design assistant");
    await page.screenshot({ path: "e2e/screens/ui-tabs-vi.png", fullPage: false });
  });

  test("Vi tab opens the assistant chat without a back arrow", async ({ page }) => {
    await seed(page);
    await page.goto(BASE_URL);
    await page.getByTestId("tab-vi").click();
    const vi = page.getByTestId("vi-tab-screen");
    await expect(vi).toBeVisible({ timeout: 10000 });
    await expect(vi.getByText("Design assistant", { exact: true })).toBeVisible();
    await expect(page.getByTestId("vi-input")).toBeVisible();
    await expect(vi.getByRole("button", { name: "Go back" })).toHaveCount(0);
    await expect(page.getByTestId("tab-vi")).toHaveAttribute("aria-selected", "true");
    await page.screenshot({ path: "e2e/screens/ui-vi-tab.png", fullPage: false });
  });

  test("outreach on: Inbox takes the slot, Vi is a button on Home", async ({ page }) => {
    await seed(page, { outreach: true });
    await page.addInitScript(() => localStorage.setItem("@visionbuild:mock_seed_inbox", JSON.stringify([])));
    await page.goto(BASE_URL);
    await expect(page.getByTestId("tab-home")).toBeVisible({ timeout: 15000 });
    await expectSymmetricBar(page, ["tab-home", "tab-explore", "tab-create", "tab-inbox", "tab-profile"]);
    await expect(page.getByTestId("tab-vi")).toHaveCount(0);
    const viButton = page.getByTestId("home-vi-button");
    await expect(viButton).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-tabs-outreach-on.png", fullPage: false });
    await viButton.click();
    await expect(page.getByTestId("vi-screen")).toBeVisible({ timeout: 10000 });
  });

  test("Vi before AI consent: consent first, then lands in Vi", async ({ page }) => {
    await seed(page, { consent: false });
    await page.goto(BASE_URL);
    await page.getByTestId("tab-vi").click();
    // Consent screen comes first; no chat is reachable yet
    await expect(page.getByTestId("consent-provider-disclosure")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("vi-input")).toHaveCount(0);
    await page.screenshot({ path: "e2e/screens/ui-vi-consent-gate.png", fullPage: false });

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByTestId("vi-tab-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("vi-input")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("@visionbuild:ai_consent_version"))).toBe("2026-10-07b");
    await page.screenshot({ path: "e2e/screens/ui-vi-after-consent.png", fullPage: false });
  });

  test("Vi before AI consent: Not now shows Vi's gate card, which can reopen consent", async ({ page }) => {
    await seed(page, { consent: false });
    await page.goto(BASE_URL);
    await page.getByTestId("tab-vi").click();
    await expect(page.getByTestId("consent-provider-disclosure")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Not now", exact: true }).click();

    const gate = page.getByTestId("vi-consent-gate");
    await expect(gate).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("vi-input")).toHaveCount(0);
    // Not bounced straight back into the consent screen
    await page.waitForTimeout(1000);
    await expect(page.getByTestId("consent-provider-disclosure")).toHaveCount(0);
    await page.screenshot({ path: "e2e/screens/ui-vi-gate-declined.png", fullPage: false });

    await page.getByTestId("vi-consent-review").click();
    await expect(page.getByTestId("consent-provider-disclosure")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByTestId("vi-tab-screen")).toBeVisible({ timeout: 10000 });
  });
});
