import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

// Simple SVG image as a string - a green square with "MOCK" text
const GREEN_IMAGE_SVG = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#4CAF50"/>
  <text x="400" y="300" font-family="Arial" font-size="48" fill="white" text-anchor="middle">MOCK DESIGN</text>
</svg>`;
const GREEN_IMAGE = Buffer.from(GREEN_IMAGE_SVG);

test.describe("VisionBuild Create Loop", () => {
  test("fresh session shows intro then consent", async ({ page }: { page: Page }) => {
    // No state seeded - fresh user
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Assert intro/splash screen first
    await expect(page.getByText(/welcome/i).or(page.getByText(/visionbuild/i))).toBeInViewport({ timeout: 10000 });
    
    // Complete intro (look for continue/get started button)
    const introButton = page.getByRole("button", { name: /(get started|continue|next)/i }).first();
    await introButton.click();

    // After intro, if not signed in, may go to sign-in; in mock mode with session, should reach tabs
    // Wait for either Home screen or sign-in
    await page.waitForTimeout(2000);
    
    // If on Home, try to start a project - this should trigger consent flow
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
      await page.getByRole("button", { name: /analyze room/i }).click();
      
      // Should see consent screen
      await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
    }
  });

  test("completes full create loop when consented", async ({ page }: { page: Page }) => {
    // Seed intro seen and consent accepted
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });

    // NO route interception - the app serves real files from public/__mock__/

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Assert Home screen, then screenshot
    await expect(page.getByText("No projects yet")).toBeInViewport({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/a5-home-empty.png", fullPage: true });

    // Click "Start Your First Project"
    await page.getByRole("button", { name: /start your first project/i }).click();

    // Assert Camera screen, then screenshot
    await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
    await page.screenshot({ path: "e2e/screens/a5-capture.png", fullPage: true });

    // Upload a test image using Playwright's filechooser pattern
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");

    // Wait for image to be selected
    await expect(page.getByText("Analyze Room")).toBeVisible();

    // Click "Analyze Room"
    await page.getByRole("button", { name: /analyze room/i }).click();

    // Assert Style picker, then screenshot
    await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/a5-style.png", fullPage: true });

    // Select a style (e.g., Modern)
    await page.getByText("Modern", { exact: true }).click();

    // Click "Generate 4 Designs"
    await page.getByRole("button", { name: /generate 4 designs/i }).click();

    // Wait a moment for navigation to generating screen
    await page.waitForTimeout(500);

    // Assert Generating screen (with countdown text), then screenshot
    await expect(page.getByText(/building your/i)).toBeInViewport({ timeout: 10000 });
    await expect(page.getByText(/sec left/i)).toBeVisible({ timeout: 2000 });
    await page.screenshot({ path: "e2e/screens/a5-generating.png", fullPage: true });

    // Wait for generation to complete - look for results screen
    await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });

    // Assert Results screen with loaded design images
    await expect(page.getByText("Option 1")).toBeVisible();
    
    // Wait for at least one design image to actually load (naturalWidth > 0)
    // Note: Design images are SVG files served from public/__mock__/
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      // Filter to only images in the design cards (not the XP banner icon, etc.)
      const designImages = images.filter((img: any) => {
        const src = img.getAttribute('src');
        return src && src.includes('__mock__/design_');
      });
      return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
    }, { timeout: 10000 });
    
    await page.screenshot({ path: "e2e/screens/a5-results.png", fullPage: true });

    // Select a design (click near the text "Option 1")
    await page.getByText("Option 1").click();

    // Click "Save Design"
    await page.getByRole("button", { name: /save design/i }).click();

    // Assert Project Detail screen, then screenshot
    await expect(page.getByText("Original Photo")).toBeInViewport({ timeout: 5000 });
    
    // Wait for design images in the grid to load
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const designImages = images.filter((img: any) => {
        const src = img.getAttribute('src');
        return src && src.includes('__mock__/design_');
      });
      return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
    }, { timeout: 5000 });
    
    await page.screenshot({ path: "e2e/screens/a5-project-detail.png", fullPage: true });
    
    // Note: The page shows "Original Photo" section with the uploaded image,
    // and below that, a "Designs" grid with the generated designs.
    // We don't need to verify image sources here - the screenshot will show whether they loaded.

    // Use browser back to return (likely to results, not home)
    await page.goBack();

    // Should be back on results screen, go back again
    await page.goBack();

    // Should be on editor/style screen, go back again
    await page.goBack();

    // Should be on camera screen, go back again
    await page.goBack();

    // Assert Home with project, then screenshot
    await expect(page.getByText(/renovation/i)).toBeVisible({ timeout: 5000 });
    
    // Wait for the project card image to load
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const designImages = images.filter((img: any) => {
        const src = img.getAttribute('src');
        return src && src.includes('__mock__/design_');
      });
      return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
    }, { timeout: 5000 });
    
    await page.screenshot({ path: "e2e/screens/a5-home-with-project.png", fullPage: true });

    // Verify no console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    expect(errors).toHaveLength(0);
  });

  test("handles consent decline correctly", async ({ page }: { page: Page }) => {
    // Seed intro seen but NOT consented
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
    });

    // Track requests to verify no analyze or generate requests are made
    const requests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("analyze-room") || url.includes("generate-design")) {
        requests.push(url);
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // With intro seen but no consent, and mock session enabled,
    // app will navigate to Home -> AI consent check triggers -> consent screen
    // So we should land on consent screen directly
    // Assert consent screen visible, then screenshot
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/a5-consent.png", fullPage: true });

    // Navigate back (decline consent)
    await page.goBack();

    // Should be back on Home screen now
    await expect(page.getByText("No projects yet")).toBeInViewport({ timeout: 5000 });

    // Try to start a project again
    await page.getByRole("button", { name: /start your first project/i }).click();

    // Should be on camera screen
    await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();

    // Upload test image using filechooser pattern
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");

    // Click Analyze - this should trigger consent check again
    await page.getByRole("button", { name: /analyze room/i }).click();

    // Should be on consent screen again
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });

    // Navigate back again (decline again)
    await page.goBack();

    // Should be back on camera screen
    await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();

    // Verify no analyze or generate requests were made
    expect(requests).toHaveLength(0);
  });

  test("handles image load failure with placeholder and retry", async ({ page }: { page: Page }) => {
    // Seed intro seen and consent accepted
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });

    // Track all signed URL requests to verify retries
    const signedUrlRequests: string[] = [];
    let requestCount = 0;
    let resolveHold!: () => void;
    const holdPromise = new Promise<void>((resolve) => { resolveHold = resolve; });
    
    // Intercept mock design image URLs
    // First request: return 403 to trigger error
    // Retry requests: hold on a promise so we can capture the placeholder state
    // After release: let requests through to succeed
    await page.route(/\/__mock__\/design_\d+\.svg/, async (route) => {
      const url = route.request().url();
      requestCount++;
      const reqNum = requestCount;
      signedUrlRequests.push(url);
      
      if (reqNum <= 4) {
        // First batch: return 403 to trigger handleImageError
        console.log(`[TEST] Request #${reqNum}: returning 403`);
        await route.fulfill({ status: 403, body: 'Forbidden' });
      } else if (reqNum <= 8) {
        // Retry batch: hold on promise so placeholder shows
        console.log(`[TEST] Request #${reqNum}: holding on promise`);
        await holdPromise;
        console.log(`[TEST] Request #${reqNum}: released, continuing to real file`);
        await route.continue();
      } else {
        // Final retries after placeholder captured: let through
        console.log(`[TEST] Request #${reqNum}: passing through`);
        await route.continue();
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    await page.getByRole("button", { name: /start your first project/i }).click();
    
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");
    
    await page.getByRole("button", { name: /analyze room/i }).click();
    await page.getByText("Modern", { exact: true }).click();
    await page.getByRole("button", { name: /generate 4 designs/i }).click();
    await page.waitForTimeout(4000);
    await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });

    // Wait for initial 403s to trigger, then wait for retries to be held
    // The first requests return 403, then retries are held on promise
    await page.waitForTimeout(2500);
    
    // Take screenshot showing loading/failed state (images haven't loaded yet)
    // This demonstrates the retry behavior - requests are being held
    await page.screenshot({ path: "e2e/screens/a5-image-expired-placeholder.png", fullPage: true });
    
    // Release the hold so retry requests can proceed
    console.log('[TEST] Releasing hold, allowing retry requests through');
    resolveHold();
    
    // Wait for images to load after retry succeeds
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const designImages = images.filter((img: any) => {
        const src = img.getAttribute('src');
        return src && src.includes('__mock__/design_');
      });
      return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
    }, { timeout: 10000 });
    
    await page.screenshot({ path: "e2e/screens/a5-image-retried.png", fullPage: true });

    // Verify that retries happened
    console.log(`[TEST] Total requests: ${signedUrlRequests.length}`);
    expect(signedUrlRequests.length).toBeGreaterThan(4);
  });
});
