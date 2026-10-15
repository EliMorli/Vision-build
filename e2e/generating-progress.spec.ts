import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });

async function seedAndOpen(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:mock_session", "true");
    localStorage.setItem("@visionbuild:ai_consent", "true");
    localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
  });
  await page.goto(`${BASE_URL}/generating/mock-project-id`);
  await expect(page.getByTestId("generating-screen")).toBeVisible({ timeout: 10000 });
}

test.describe("Generating progress bar", () => {
  test("is a 4-segment progressbar with a real-progress a11y label", async ({ page }) => {
    await seedAndOpen(page);
    const bar = page.getByRole("progressbar");
    await expect(bar).toHaveCount(1);
    await expect(bar).toHaveAttribute("aria-label", "Creating design 1 of 4");
    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "4");
    await expect(bar).toHaveAttribute("aria-valuenow", "0");
    for (const i of [1, 2, 3, 4]) await expect(page.getByTestId(`generating-segment-${i}`)).toBeVisible();
  });

  test("Reduce Motion: steady highlight on the active segment, no shimmer", async ({ page }) => {
    await seedAndOpen(page); // project-wide reducedMotion: "reduce"
    await expect(page.getByTestId("generating-segment-steady")).toHaveCount(1);
    await expect(page.getByTestId("generating-segment-1").getByTestId("generating-segment-steady")).toBeVisible();
    await expect(page.getByTestId("generating-segment-shimmer")).toHaveCount(0);
    await page.screenshot({ path: "e2e/screens/generating-reduced-motion.png", fullPage: false });
  });

  test.describe("motion allowed", () => {
    test.use({ reducedMotion: "no-preference" });
    test("active segment shimmers, no steady highlight", async ({ page }) => {
      await seedAndOpen(page);
      await expect(page.getByTestId("generating-segment-1").getByTestId("generating-segment-shimmer")).toBeAttached();
      await expect(page.getByTestId("generating-segment-shimmer")).toHaveCount(1);
      await expect(page.getByTestId("generating-segment-steady")).toHaveCount(0);
    });
  });

  test("shows real design progress and no fixed time-left countdown", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      const now = new Date().toISOString();
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([{
        id: "mock-project-id", user_id: "mock-user", title: "Living room", status: "generated",
        selected_style: "modern", is_public: false, room_analysis: { roomType: "living_room" },
        original_image_url: "mock/original.jpg", generated_image_urls: ["mock/gen1.jpg"],
        created_at: now, updated_at: now,
      }]));
    });
    // Opened straight, Generating stays on its progress screen
    await page.goto(`${BASE_URL}/generating/mock-project-id`);
    await expect(page.getByTestId("generating-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("generating-progress-label")).toHaveText(/^Design [1-4] of 4$/);
    await expect(page.getByText(/sec left/i)).toHaveCount(0);
    await expect(page.getByText(/seconds? left|min(ute)?s? left|time left/i)).toHaveCount(0);
    await page.screenshot({ path: "e2e/screens/generating-no-countdown.png", fullPage: false });
  });
});
