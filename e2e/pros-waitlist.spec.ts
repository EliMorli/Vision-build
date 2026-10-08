import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("Pros Waitlist", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Seed intro seen and consent accepted for all tests
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
  });

  test("join from Home, then collapsed state survives reload", async ({ page }: { page: Page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Assert the pros-teaser card is visible on Home (empty state)
    await expect(page.getByTestId("pros-teaser")).toBeVisible({ timeout: 10000 });

    // Screenshot before joining
    await page.screenshot({ path: "e2e/screenshots/hf-home-waitlist.png", fullPage: false });

    // Click "Join the waitlist"
    await page.getByTestId("pros-teaser-join").click();

    // Wait for the card to collapse to slim mode
    await expect(page.getByTestId("pros-teaser-joined")).toBeVisible({ timeout: 5000 });

    // Screenshot after joining
    await page.screenshot({ path: "e2e/screenshots/hf-home-joined.png", fullPage: false });

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert the collapsed state persists
    await expect(page.getByTestId("pros-teaser-joined")).toBeVisible({ timeout: 10000 });
  });

  test("join from Results above Save button", async ({ page }: { page: Page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Start a project
    const startButton = page.getByRole("button", { name: /start your first project/i }).first();
    await startButton.click();

    // Upload image
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");

    // Click Analyze
    await page.getByRole("button", { name: /analyze/i }).click();
    await page.waitForLoadState("networkidle");

    // Pick a style
    await page.getByText(/modern/i).first().click();
    await page.getByRole("button", { name: /generate/i }).click();

    // Wait for results screen
    await expect(page.getByText(/swipe to browse|tap to select/i)).toBeVisible({ timeout: 15000 });

    // Look for the waitlist card above Save button
    await expect(page.getByTestId("results-waitlist-card")).toBeVisible();

    // Screenshot
    await page.screenshot({ path: "e2e/screenshots/hf-results-waitlist.png", fullPage: false });

    // Join waitlist from results
    await page.getByTestId("results-waitlist-join").click();

    // The card should disappear after joining
    await expect(page.getByTestId("results-waitlist-card")).not.toBeVisible({ timeout: 3000 });
  });

  test("pros-coming-soon screen shows 3 steps", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/pros-coming-soon`);
    await page.waitForLoadState("networkidle");

    // Assert the screen loads
    await expect(page.getByText("Local pros are coming soon")).toBeVisible({ timeout: 10000 });

    // Check all 3 steps using testIDs
    await expect(page.getByTestId("pros-coming-soon-step-1")).toBeVisible();
    await expect(page.getByTestId("pros-coming-soon-step-2")).toBeVisible();
    await expect(page.getByTestId("pros-coming-soon-step-3")).toBeVisible();

    // Screenshot
    await page.screenshot({ path: "e2e/screenshots/hf-pros-coming-soon.png", fullPage: false });

    // Try to join waitlist using testID
    await page.getByTestId("pros-coming-soon-join").click();

    // Should show "You're on the list"
    await expect(page.getByText("You're on the list")).toBeVisible({ timeout: 5000 });
  });

  test("contractor entry point lands on pros-coming-soon and Quotes tab not visible", async ({ page }: { page: Page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Start a project to get to project detail
    const startButton = page.getByRole("button", { name: /start your first project/i }).first();
    await startButton.click();

    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");

    await page.getByRole("button", { name: /analyze/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByText(/modern/i).first().click();
    await page.getByRole("button", { name: /generate/i }).click();

    // Wait for results
    await expect(page.getByText(/swipe to browse/i)).toBeVisible({ timeout: 15000 });
    
    // Select a design by clicking on it (not on the disabled Save button)
    const designCards = page.locator('[data-testid*="design"], .card, img[alt*="Design"]').first();
    await designCards.click();
    
    // Now save design
    await page.getByRole("button", { name: /save/i }).click();

    // Should be on project detail page
    await page.waitForLoadState("networkidle");

    // Assert "Quotes" tab does not appear
    await expect(page.getByText("Quotes", { exact: true })).not.toBeVisible();
    await expect(page.getByText(/quotes \(/i)).not.toBeVisible();

    // Look for contractor entry point (e.g., "Get quotes" button in project brief)
    const quotesButton = page.getByRole("button", { name: /get quotes/i }).first();
    if (await quotesButton.isVisible()) {
      await quotesButton.click();

      // Should land on pros-coming-soon
      await expect(page.getByText("Local pros are coming soon")).toBeVisible({ timeout: 5000 });
    }
  });

  test("Settings toggle off brings Home card back to unjoined", async ({ page }: { page: Page }) => {
    // First join the waitlist
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      localStorage.setItem("@visionbuild:waitlist:general", "true");
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Should see collapsed state
    await expect(page.getByTestId("pros-teaser-joined")).toBeVisible({ timeout: 10000 });

    // Go to Settings - look for settings gear icon or Profile tab then Settings
    const profileTab = page.getByRole("tab", { name: /profile/i }).or(page.locator('[aria-label*="profile" i]')).first();
    await profileTab.click();
    await page.waitForLoadState("networkidle");
    
    const settingsButton = page.getByRole("button", { name: /settings/i }).first();
    await settingsButton.click();
    await page.waitForLoadState("networkidle");

    // Find and screenshot the settings
    await expect(page.getByText("Pros Waitlist")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/hf-settings-waitlist.png", fullPage: false });

    // Toggle off using testID
    await page.getByTestId("settings-pros-waitlist-toggle").click();

    // Go back to Home
    await page.goBack();
    await page.goBack(); // Back twice: settings -> profile -> home
    await page.waitForLoadState("networkidle");

    // Should see the full card again (not collapsed)
    await expect(page.getByTestId("pros-teaser")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("pros-teaser-join")).toBeVisible();
    await expect(page.getByTestId("pros-teaser-joined")).not.toBeVisible();
  });
});
