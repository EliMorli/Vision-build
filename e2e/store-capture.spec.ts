import { test, expect, type Page } from "@playwright/test";

/**
 * Store-capture mode (EXPO_PUBLIC_STORE_CAPTURE=1, build-time).
 * BASE_URL serves the normal build (flag off); CAPTURE_BASE_URL serves the same
 * code built with the flag on (playwright.config.ts starts both in CI).
 * Off: shipping behavior, every waitlist / pros entry point is there.
 * On: none of them render, and nothing else about the screens changes.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:19006";
const CAPTURE_BASE_URL = process.env.CAPTURE_BASE_URL || "http://localhost:19007";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });

async function seed(page: Page, projects: boolean) {
  await page.addInitScript((projects) => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:mock_session", "true");
    localStorage.setItem("@visionbuild:ai_consent", "true");
    localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
    if (!projects) return;
    const now = new Date().toISOString();
    localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([{
      id: "mock-project-id", user_id: "mock-user", title: "Modern living room", status: "generated",
      selected_style: "modern", is_public: false, room_analysis: { roomType: "living_room" },
      original_image_url: "mock/original.jpg", generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg"],
      selected_generation_url: "mock/gen1.jpg",
      lead_info: { projectBrief: "Open up the living room with warm wood and soft light." },
      created_at: now, updated_at: now,
    }]));
  }, projects);
}

async function generateToResults(page: Page, base: string) {
  await page.goto(base);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /start your first project/i }).first().click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /gallery/i }).click(),
  ]);
  await chooser.setFiles("e2e/fixtures/test-room.jpg");
  await page.getByRole("button", { name: /analyze/i }).click();
  await page.waitForLoadState("networkidle");
  await page.getByText(/modern/i).first().click();
  await page.getByRole("button", { name: /generate/i }).click();
  await expect(page.getByTestId("result-design-card").first()).toBeVisible({ timeout: 15000 });
}

type Mode = { base: string; on: boolean; screens: { home: string; results: string; project: string } };
const OFF: Mode = {
  base: BASE_URL,
  on: false,
  screens: {
    home: 'e2e/screens/store-capture-off-home.png',
    results: 'e2e/screens/store-capture-off-results.png',
    project: 'e2e/screens/store-capture-off-project.png',
  },
};
const ON: Mode = {
  base: CAPTURE_BASE_URL,
  on: true,
  screens: {
    home: 'e2e/screens/store-capture-on-home.png',
    results: 'e2e/screens/store-capture-on-results.png',
    project: 'e2e/screens/store-capture-on-project.png',
  },
};

async function checkHome(page: Page, mode: Mode) {
  await seed(page, false);
  await page.goto(mode.base);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: /start your first project/i }).first()).toBeVisible({ timeout: 10000 });
  if (mode.on) {
    await expect(page.getByTestId("pros-teaser")).toHaveCount(0);
    await expect(page.getByText("Join the waitlist")).toHaveCount(0);
  } else {
    await expect(page.getByTestId("pros-teaser")).toBeVisible();
  }
  // Launch tab bar in both states: Vi in the slot, never Inbox
  await expect(page.getByTestId("tab-vi")).toBeVisible();
  await expect(page.getByTestId("tab-inbox")).toHaveCount(0);
  await page.screenshot({ path: mode.screens.home, fullPage: false });
}

async function checkResults(page: Page, mode: Mode) {
  await seed(page, false);
  await generateToResults(page, mode.base);
  await expect(page.getByTestId("result-ai-badge").first()).toBeVisible();
  if (mode.on) {
    await expect(page.getByTestId("results-waitlist-card")).toHaveCount(0);
    await expect(page.getByText("Join the waitlist")).toHaveCount(0);
  } else {
    await expect(page.getByTestId("results-waitlist-card")).toBeVisible();
  }
  await page.screenshot({ path: mode.screens.results, fullPage: false });
}

async function checkProject(page: Page, mode: Mode) {
  await seed(page, true);
  await page.goto(`${mode.base}/project/mock-project-id`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("project-brief")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("project-brief-waitlist")).toHaveCount(mode.on ? 0 : 1);
  await page.screenshot({ path: mode.screens.project, fullPage: false });
}

async function checkSettingsAndInbox(page: Page, mode: Mode) {
  await seed(page, false);
  await page.addInitScript(() => localStorage.setItem("@visionbuild:mock_outreach_enabled", "true"));
  await page.goto(`${mode.base}/profile-settings`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("settings-pros-waitlist-toggle")).toHaveCount(mode.on ? 0 : 1);
  // The override turns Inbox on in a shipping build; capture mode always wins
  await expect(page.getByTestId("tab-inbox")).toHaveCount(mode.on ? 0 : 1);
}

test.describe("Store-capture mode off (shipping)", () => {
  test("Home waitlist card shown", async ({ page }) => checkHome(page, OFF));
  test("Results waitlist card shown, AI label kept", async ({ page }) => checkResults(page, OFF));
  test("project page pros entry shown", async ({ page }) => checkProject(page, OFF));
  test("Settings pros waitlist shown; outreach override still shows Inbox", async ({ page }) => checkSettingsAndInbox(page, OFF));
});

test.describe("Store-capture mode on", () => {
  test("Home waitlist card hidden", async ({ page }) => checkHome(page, ON));
  test("Results waitlist card hidden, AI label kept", async ({ page }) => checkResults(page, ON));
  test("project page pros entry hidden", async ({ page }) => checkProject(page, ON));
  test("Settings pros waitlist hidden; Inbox stays off even with the outreach override", async ({ page }) => checkSettingsAndInbox(page, ON));
});
