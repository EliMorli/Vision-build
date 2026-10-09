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

  test("offline Home: 'Start a new room' and the raised + are gray, disabled and say 'Needs internet'", async ({ page, context }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Kitchen Design")).toBeVisible({ timeout: 15000 });

    const startButton = page.getByTestId("home-start-new-room").locator("visible=true");
    const homeNeedsInternet = page.getByTestId("home-needs-internet").locator("visible=true");

    // Positive control: online, both actions are live and there is no notice
    await expect(startButton).toBeEnabled();
    await expect(homeNeedsInternet).toHaveCount(0);
    await expect(page.getByTestId("tab-create-icon").locator("visible=true").first()).toBeVisible();
    const onlineBg = await startButton.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(onlineBg).toBe("rgb(26, 115, 232)");

    await context.setOffline(true);

    // Start a new room: disabled, clay gray, with the "Needs internet" label
    await expect(startButton).toBeDisabled();
    await expect(homeNeedsInternet).toHaveCount(1);
    await expect(homeNeedsInternet).toHaveText(/Needs internet/);
    const offlineBg = await startButton.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(offlineBg).toBe("rgb(232, 234, 237)");

    // Raised + in the tab bar: gray and labelled "Needs internet"
    const createDisabled = page.getByTestId("tab-create-disabled").locator("visible=true").first();
    await expect(createDisabled).toBeVisible();
    const plusBg = await createDisabled.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(plusBg).toBe("rgb(232, 234, 237)");
    await expect(page.getByTestId("tab-create").locator("visible=true").first()).toContainText("Needs internet");

    // Tapping the gray + does nothing while offline
    await page.getByTestId("tab-create").locator("visible=true").first().click();
    await expect(page.getByText("Start your project")).toHaveCount(0);
    await expect(page).toHaveURL(/localhost:19006\/?$/);

    // ~16px between the button area (incl. the notice) and the first project card
    const noticeBox = await homeNeedsInternet.boundingBox();
    const startBox = await startButton.boundingBox();
    const cardBox = await page.getByTestId("home-project-card").locator("visible=true").first().boundingBox();
    expect(noticeBox && startBox && cardBox).toBeTruthy();
    // The notice is the last thing above the list; the card starts ~16px below it
    expect(cardBox!.y - (noticeBox!.y + noticeBox!.height)).toBeGreaterThanOrEqual(15);
    expect(cardBox!.y - (startBox!.y + startBox!.height)).toBeGreaterThanOrEqual(16);

    // Back online: everything is live again
    await context.setOffline(false);
    await expect(startButton).toBeEnabled();
    await expect(homeNeedsInternet).toHaveCount(0);
    await expect(page.getByTestId("tab-create-icon").locator("visible=true").first()).toBeVisible();
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
