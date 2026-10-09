import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("Offline Mode", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Set up authenticated mock state with seeded projects
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      
      // Seed mock projects
      const projects = [
        {
          id: "offline-test-1",
          user_id: "mock-user",
          title: "Kitchen Design",
          original_image_url: "https://placehold.co/800x500?text=Kitchen",
          status: "generated",
          room_analysis: { roomType: "kitchen", currentStyle: "traditional", estimatedSqFt: 150, keyElements: ["island"], rawAnalysis: "Galley kitchen with an island" },
          generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "offline-test-2",
          user_id: "mock-user",
          title: "Bathroom Remodel",
          original_image_url: "https://placehold.co/800x500?text=Bathroom",
          status: "generated",
          room_analysis: { roomType: "bathroom", currentStyle: "modern", estimatedSqFt: 60, keyElements: ["vanity"], rawAnalysis: "Small bathroom with a single vanity" },
          generated_image_urls: ["mock/gen3.jpg"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
    });
  });

  test("shows offline banner with exact text when offline", async ({ page, context }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Kitchen Design")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("offline-banner").locator("visible=true")).toHaveCount(0);

    await context.setOffline(true);

    const banner = page.getByTestId("offline-banner").locator("visible=true");
    await expect(banner).toHaveCount(1);
    // Exact copy (the banner also contains an icon glyph, so match the text node exactly)
    await expect(banner.getByText("You're offline. Showing what's saved on this phone.", { exact: true })).toBeVisible();
    await expect(page.getByText("Kitchen Design")).toBeVisible();

    await page.screenshot({ path: "e2e/screens/ui-offline-home.png", fullPage: false });
  });

  test("shows exactly one visible offline banner per screen", async ({ page, context }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Kitchen Design")).toBeVisible({ timeout: 15000 });
    await context.setOffline(true);

    const visibleBanners = page.getByTestId("offline-banner").locator("visible=true");
    await expect(visibleBanners).toHaveCount(1);

    // Switch tabs: the previous tab stays mounted but hidden, still exactly one visible
    await page.locator('[href="/explore"]').first().click();
    await expect(page.getByPlaceholder(/search styles, rooms/i)).toBeVisible();
    await expect(visibleBanners).toHaveCount(1);
  });

  test("seeded projects are still visible when offline", async ({ page, context }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Kitchen Design")).toBeVisible({ timeout: 15000 });

    await context.setOffline(true);
    await page.locator('[href="/explore"]').first().click();
    await expect(page.getByPlaceholder(/search styles, rooms/i)).toBeVisible();
    await page.locator('[href="/"]').first().click();

    await expect(page.getByTestId("offline-banner").locator("visible=true")).toHaveCount(1);
    await expect(page.getByText("Kitchen Design")).toBeVisible();
    await expect(page.getByText("Bathroom Remodel")).toBeVisible();
  });

  test("Generate is disabled showing 'Needs internet' when offline", async ({ page, context }) => {
    await page.goto(`${BASE_URL}/editor/offline-test-1`);
    await expect(page.getByTestId("style-picker-header")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Modern style" }).click();

    // Positive control: online, the action is available
    const generate = page.getByRole("button", { name: /generate 4 designs/i });
    await expect(generate).toBeEnabled();
    await expect(page.getByText(/needs internet/i)).toHaveCount(0);

    await context.setOffline(true);

    await expect(page.getByText(/needs internet/i)).toBeVisible();
    await expect(generate).toBeDisabled();
  });

  test("banner is hidden when back online", async ({ page, context }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Kitchen Design")).toBeVisible({ timeout: 15000 });

    await context.setOffline(true);
    await expect(page.getByTestId("offline-banner").locator("visible=true")).toHaveCount(1);

    await context.setOffline(false);
    await expect(page.getByTestId("offline-banner").locator("visible=true")).toHaveCount(0);
    await expect(page.getByText("Kitchen Design")).toBeVisible();
  });
});
