import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild AI Consent Flow", () => {
  test("outdated consent triggers re-consent with update notice", async ({ page }: { page: Page }) => {
    // Seed with intro seen and OUTDATED consent version
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-01"); // Old version
      localStorage.setItem("@visionbuild:mock_consent_version", "2026-10-01"); // Simulate outdated in mock mode (must be set to trigger check)
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Start a project
    await page.getByRole("button", { name: /start your first project/i }).click();

    // Upload image
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");

    // Click Analyze - this should trigger outdated consent check
    await page.getByRole("button", { name: /analyze room/i }).click();

    // Should see consent screen with update notice
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
    
    // Get all text content for debugging
    const bodyText = await page.locator('body').textContent();
    console.log("[TEST] Body text:", bodyText?.substring(0, 500));
    
    await expect(page.getByText(/We've updated how your photos are handled/i)).toBeVisible();
    
    // Assert screen with update notice
    await page.screenshot({ path: "e2e/screens/a7-reconsent-outdated.png", fullPage: true });

    // Click Continue to accept (this should update mock consent version)
    await page.getByRole("button", { name: /continue/i }).click();

    // Should resume to style picker (analyze completed automatically)
    await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });

    // Select a style
    await page.getByText("Modern", { exact: true }).click();

    // Generate designs
    await page.getByRole("button", { name: /generate 4 designs/i }).click();

    // Should see generating screen
    await expect(page.getByText(/building your/i)).toBeInViewport({ timeout: 10000 });

    // Wait for results
    await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
    
    // Verify we reached results with the same project/style
    await expect(page.getByText("Option 1")).toBeVisible();
  });

  test("never consent shows normal consent screen without update notice", async ({ page }: { page: Page }) => {
    // Seed with intro seen but NO consent at all, and explicitly set mock consent version to empty to trigger check
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_consent_version", ""); // Empty string triggers never check
      // NO ai_consent or ai_consent_version keys set
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Start a project
    await page.getByRole("button", { name: /start your first project/i }).click();

    // Upload image
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");

    // Click Analyze - this should trigger never consent check
    await page.getByRole("button", { name: /analyze room/i }).click();

    // Should see consent screen WITHOUT update notice
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
    await expect(page.getByText(/We've updated how your photos are handled/i)).not.toBeVisible();
    
    // Assert screen without update notice
    await page.screenshot({ path: "e2e/screens/a7-reconsent-never.png", fullPage: true });

    // Click Continue to accept
    await page.getByRole("button", { name: /continue/i }).click();

    // Should resume to style picker
    await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });
  });

  test("decline in re-consent returns to project without calling AI", async ({ page }: { page: Page }) => {
    // Seed with intro seen, outdated consent, and an existing project
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-01");
      localStorage.setItem("@visionbuild:mock_consent_version", "2026-10-01"); // Must be set to trigger check
    });

    // Track AI requests to verify none are made after decline
    const aiRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("analyze-room") || url.includes("generate-design")) {
        aiRequests.push(url);
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Start a project
    await page.getByRole("button", { name: /start your first project/i }).click();

    // Upload image
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");

    // Click Analyze - triggers consent
    await page.getByRole("button", { name: /analyze room/i }).click();

    // Wait for consent screen
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });

    // Click Decline
    await page.getByRole("button", { name: /decline/i }).click();

    // Should be back on camera screen (photo still there)
    await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /analyze room/i })).toBeVisible();
    
    // Screenshot showing we're back with photo preserved
    await page.screenshot({ path: "e2e/screens/a7-reconsent-declined-project.png", fullPage: true });

    // Verify no AI requests were made after decline
    expect(aiRequests).toHaveLength(0);
  });

  test("generate-design triggers re-consent flow", async ({ page }: { page: Page }) => {
    // Seed with intro seen, consent accepted initially
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      // Start with current consent (no mock_consent_version key, so consent check is skipped initially)
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Start a project
    await page.getByRole("button", { name: /start your first project/i }).click();

    // Upload image
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");

    // Analyze passes (consent check is skipped because mock_consent_version not set)
    await page.getByRole("button", { name: /analyze room/i }).click();
    await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });

    // Now simulate consent becoming outdated (e.g., policy updated between analyze and generate)
    await page.evaluate(() => {
      localStorage.setItem("@visionbuild:mock_consent_version", "2026-10-01"); // Set to old version to trigger outdated check
    });

    // Select style and generate
    await page.getByText("Modern", { exact: true }).click();
    await page.getByRole("button", { name: /generate 4 designs/i }).click();

    // Should trigger re-consent (outdated)
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
    await expect(page.getByText(/We've updated how your photos are handled/i)).toBeVisible();

    // Accept
    await page.getByRole("button", { name: /continue/i }).click();

    // Should resume to generating screen
    await expect(page.getByText(/building your/i)).toBeInViewport({ timeout: 10000 });

    // Wait for results
    await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
  });
});
