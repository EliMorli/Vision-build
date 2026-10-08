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

    // Assert Home screen
    await expect(page.getByText(/No projects yet|Ready to redesign/i)).toBeInViewport({ timeout: 10000 });

    // Find the ProsTeaserCard
    await expect(page.getByText("We'll reach out to local pros for you")).toBeInViewport();
    await expect(page.getByText("No forms. Your number stays private until you pick a pro.")).toBeVisible();

    // Screenshot before joining
    await page.screenshot({ path: "e2e/screenshots/hf-home-waitlist.png", fullPage: true });

    // Click "Join the waitlist"
    await page.getByRole("button", { name: /join the waitlist/i }).click();

    // Wait for the card to collapse to slim mode
    await expect(page.getByText("✓ You're on the list.")).toBeInViewport({ timeout: 5000 });

    // Screenshot after joining
    await page.screenshot({ path: "e2e/screenshots/hf-home-joined.png", fullPage: true });

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert the collapsed state persists
    await expect(page.getByText("✓ You're on the list.")).toBeInViewport({ timeout: 10000 });
  });

  test("join from Results above Save button", async ({ page }: { page: Page }) => {
    // Also seed a mock project ID for the Results screen
    const mockProjectId = "mock-project-123";
    
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });

    // Navigate directly to a mock result page
    // In the real app, we'd need a project. For this test, we'll create a minimal flow:
    // 1. Go to home
    // 2. Start project
    // 3. Upload image
    // 4. Generate designs
    // 5. See results with waitlist card

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Start a project
    const startButton = page.getByRole("button", { name: /start your first project/i });
    if (await startButton.isVisible()) {
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
      await page.getByText(/modern|minimalist/i).first().click();
      await page.getByRole("button", { name: /generate|create/i }).click();

      // Wait for results screen
      await expect(page.getByText(/swipe to browse|tap to select/i)).toBeInViewport({ timeout: 15000 });

      // Look for the waitlist card above Save button
      await expect(page.getByText("Want this built?")).toBeInViewport();

      // Screenshot
      await page.screenshot({ path: "e2e/screenshots/hf-results-waitlist.png", fullPage: true });

      // Join waitlist from results
      await page.getByRole("button", { name: /join the waitlist/i }).click();

      // The card should disappear after joining
      await expect(page.getByText("Want this built?")).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("pros-coming-soon screen shows 3 steps", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/pros-coming-soon`);
    await page.waitForLoadState("networkidle");

    // Assert the screen loads
    await expect(page.getByText("Local pros are coming soon")).toBeInViewport({ timeout: 10000 });

    // Check all 3 steps
    await expect(page.getByText("We write a brief from your design")).toBeVisible();
    await expect(page.getByText("We reach out to local pros for you")).toBeVisible();
    await expect(page.getByText("Quotes land in your Inbox when pros reply")).toBeVisible();

    // Screenshot
    await page.screenshot({ path: "e2e/screenshots/hf-pros-coming-soon.png", fullPage: true });

    // Try to join waitlist
    await page.getByRole("button", { name: /join the waitlist/i }).click();

    // Should show "You're on the list"
    await expect(page.getByText("You're on the list")).toBeInViewport({ timeout: 5000 });
  });

  test("contractor entry point lands on pros-coming-soon and Quotes tab not visible", async ({ page }: { page: Page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Start a project to get to project detail
    const startButton = page.getByRole("button", { name: /start your first project/i });
    if (await startButton.isVisible()) {
      await startButton.click();

      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByRole("button", { name: /gallery/i }).click(),
      ]);
      await chooser.setFiles("e2e/fixtures/test-room.jpg");

      await page.getByRole("button", { name: /analyze/i }).click();
      await page.waitForLoadState("networkidle");

      await page.getByText(/modern|minimalist/i).first().click();
      await page.getByRole("button", { name: /generate|create/i }).click();

      // Wait for results, then save design
      await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 15000 });
      
      // Select first design
      const firstImage = page.locator("img").first();
      if (await firstImage.isVisible()) {
        await firstImage.click();
      }
      
      await page.getByRole("button", { name: /save design/i }).click();

      // Should be on project detail page
      await page.waitForLoadState("networkidle");

      // Assert "Quotes" tab does not appear
      await expect(page.getByText("Quotes", { exact: true })).not.toBeVisible();
      await expect(page.getByText(/quotes \(/i)).not.toBeVisible();

      // Look for contractor entry point (e.g., "Get quotes" button)
      const quotesButton = page.getByRole("button", { name: /get quotes|view full brief/i }).first();
      if (await quotesButton.isVisible()) {
        await quotesButton.click();

        // Should land on pros-coming-soon
        await expect(page.getByText("Local pros are coming soon")).toBeInViewport({ timeout: 5000 });
      }
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
    await expect(page.getByText("✓ You're on the list.")).toBeInViewport({ timeout: 10000 });

    // Go to Settings
    const profileButton = page.getByLabel(/profile/i).or(page.getByRole("tab", { name: /profile/i }));
    await profileButton.click();
    
    await page.getByRole("button", { name: /settings/i }).click();
    await page.waitForLoadState("networkidle");

    // Find and screenshot the settings
    await expect(page.getByText("Pros Waitlist")).toBeInViewport();
    await page.screenshot({ path: "e2e/screenshots/hf-settings-waitlist.png", fullPage: true });

    // Toggle off
    await page.getByText("Pros Waitlist").click();

    // Go back to Home
    await page.goBack();
    await page.goBack(); // Back twice: settings -> profile -> home
    await page.waitForLoadState("networkidle");

    // Should see the full card again (not collapsed)
    await expect(page.getByText("We'll reach out to local pros for you")).toBeInViewport({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /join the waitlist/i })).toBeVisible();
    await expect(page.getByText("✓ You're on the list.")).not.toBeVisible();
  });
});
