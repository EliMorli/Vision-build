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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "offline-test-2",
          user_id: "mock-user",
          title: "Bathroom Remodel",
          original_image_url: "https://placehold.co/800x500?text=Bathroom",
          status: "generated",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
    });
  });

  test("shows offline banner with exact text when offline", async ({ page, context }: { page: Page, context: any }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Wait for content to load while online
    await expect(page.getByText(/Kitchen Design|ready to redesign/i)).toBeVisible({ timeout: 10000 });
    
    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Check offline banner text is exactly as specified
    await expect(page.getByText("You're offline. Showing what's saved on this phone.")).toBeVisible({ timeout: 10000 });
    
    // Screenshot
    await page.screenshot({ path: "e2e/screens/ui-offline-home.png", fullPage: false });
  });

  test("shows exactly one visible offline banner", async ({ page, context }: { page: Page, context: any }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Get all offline banners (mounted tabs can each have one)
    const banners = page.getByTestId("offline-banner");
    const visibleBanners = await banners.filter({ has: page.locator(":visible") }).all();
    
    // Exactly one should be visible
    expect(visibleBanners.length).toBe(1);
  });

  test("seeded projects are still visible when offline", async ({ page, context }: { page: Page, context: any }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Verify projects are visible online
    await expect(page.getByText("Kitchen Design")).toBeVisible({ timeout: 10000 });
    
    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Projects should still be visible from seed
    await expect(page.getByText("Kitchen Design")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bathroom Remodel")).toBeVisible({ timeout: 10000 });
  });

  test("Create button is disabled showing 'Needs internet' when offline", async ({ page, context }: { page: Page, context: any }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Click the create tab
    await page.locator('[href="/create-choice"]').first().click();
    await page.waitForLoadState("networkidle");
    
    // Verify disabled state or "Needs internet" message
    const needsInternetText = page.getByText(/needs internet/i);
    await expect(needsInternetText).toBeVisible({ timeout: 10000 });
  });

  test("banner is hidden when back online", async ({ page, context }: { page: Page, context: any }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Banner should be visible
    await expect(page.getByTestId("offline-banner")).toBeVisible({ timeout: 10000 });
    
    // Go back online
    await context.setOffline(false);
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Banner should be hidden
    await expect(page.getByTestId("offline-banner")).toBeHidden({ timeout: 10000 });
  });
});
