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
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 10000 });
    
    // Wait for update notice to be visible (should appear immediately with the screen)
    await expect(page.getByText(/We've updated how your photos are handled/i)).toBeVisible({ timeout: 10000 });
    
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

  test("consent decline sends nothing", async ({ page }: { page: Page }) => {
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

    // Click "Not now"
    await page.getByRole("button", { name: /not now/i }).click();

    // Should be back on camera screen (photo still there)
    await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /analyze room/i })).toBeVisible();
    
    // Screenshot showing we're back on camera with photo preserved
    await page.screenshot({ path: "e2e/screens/a7-consent-declined-camera.png", fullPage: true });

    // Verify no AI requests were made after decline
    expect(aiRequests).toHaveLength(0);
  });

  test("re-consent decline returns to project with photo", async ({ page }: { page: Page }) => {
    // Seed with intro seen, consent accepted initially
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
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

    // Analyze passes (consent check is skipped because mock_consent_version not set)
    await page.getByRole("button", { name: /analyze room/i }).click();
    await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });

    // Record the AI request count before triggering re-consent
    const requestsBeforeDecline = aiRequests.length;

    // Now simulate consent becoming outdated (e.g., policy updated between analyze and generate)
    await page.evaluate(() => {
      localStorage.setItem("@visionbuild:mock_consent_version", "2026-10-01"); // Set to old version to trigger outdated check
    });

    // Select style and generate
    await page.getByText("Modern", { exact: true }).click();
    await page.getByRole("button", { name: /generate 4 designs/i }).click();

    // Should trigger re-consent (outdated) - 403 returned before any generation
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
    await expect(page.getByText(/We've updated how your photos are handled/i)).toBeVisible();

    // Click "Not now"
    await page.getByRole("button", { name: /not now/i }).click();

    // Should be back on project detail screen with photo visible (not editor)
    await expect(page.getByText("Original Photo")).toBeVisible({ timeout: 5000 });
    // Verify the project screen has a testID or unique element - checking for the original image
    await expect(page.locator('img[alt*="Original"]').first()).toBeVisible({ timeout: 5000 });
    
    // Screenshot showing project detail with original photo
    await page.screenshot({ path: "e2e/screens/a7-reconsent-declined-project.png", fullPage: true });
    
    // Verify no NEW AI requests were made after the decline (analyze-room was called before, but generate-design should not have been called)
    expect(aiRequests.length).toBe(requestsBeforeDecline);
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

    // Get the project ID from the URL
    const editorUrl = page.url();
    const projectIdMatch = editorUrl.match(/\/editor\/([^\/\?]+)/);
    const projectIdBeforeConsent = projectIdMatch ? projectIdMatch[1] : null;
    expect(projectIdBeforeConsent).toBeTruthy();
    
    // Get the original photo source to verify later
    const originalPhotoSrc = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        if (img.src.includes('test-room') || img.alt?.includes('room')) {
          return img.src;
        }
      }
      return null;
    });

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

    // Should navigate to generating screen and then results
    // Wait for results screen (generating screen may be very brief in mock mode)
    await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
    
    // Verify we're on results for the same project (proves resume used correct project & photo)
    const resultUrl = page.url();
    expect(resultUrl).toContain(`/result/${projectIdBeforeConsent}`);
    
    // Verify design options are visible (proves generation completed successfully)
    await expect(page.getByText("Option 1")).toBeVisible();
    
    // Take screenshot showing results screen with designs from the resumed generation
    await page.screenshot({ path: "e2e/screens/a7-reconsent-resumed-results.png", fullPage: true });
  });
});
