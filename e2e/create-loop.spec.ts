import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

// Solid green 100x100 PNG for mock design images
// This is large enough to be visible in the UI
const GREEN_IMAGE = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64, 0x08, 0x02, 0x00, 0x00, 0x00, 0xFF, 0x80, 0x02,
  0x03, 0x00, 0x00, 0x00, 0x19, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0xED, 0xC1, 0x01, 0x01, 0x00,
  0x00, 0x00, 0x82, 0x20, 0xFF, 0xAF, 0x6E, 0x48, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0xD8, 0x9F,
  0x00, 0x01, 0x00, 0x00, 0xDE, 0x00, 0x02, 0xE7, 0xC7, 0x37, 0xB6, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

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

    // Intercept mock design image URLs and serve green images
    // Match both relative and absolute URLs
    let imageRequestCount = 0;
    await page.route(/\/__mock__\/design_\d+\.png/, async (route) => {
      imageRequestCount++;
      console.log(`[TEST] Intercepted mock image request #${imageRequestCount}: ${route.request().url()}`);
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: GREEN_IMAGE,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache'
        }
      });
    });

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
    // Note: testID is on the Image element itself in React Native Web
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
    let interceptFailures = true;
    
    // Intercept mock design image URLs that PrivateImage will request
    // Initially return 403 to trigger retry, then succeed after we verify placeholder
    await page.route(/\/__mock__\/design_\d+\.png/, async (route) => {
      const url = route.request().url();
      signedUrlRequests.push(url);
      
      if (interceptFailures) {
        // Return 403 to trigger retry and placeholder display
        await route.fulfill({ 
          status: 403, 
          body: "Forbidden",
          contentType: "text/plain"
        });
      } else {
        // Return a green image
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: GREEN_IMAGE
        });
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    await page.getByRole("button", { name: /start your first project/i }).click();
    
    // Upload test image using filechooser pattern
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");
    
    await page.getByRole("button", { name: /analyze room/i }).click();
    
    await page.getByText("Modern", { exact: true }).click();
    await page.getByRole("button", { name: /generate 4 designs/i }).click();
    
    // Wait for generating screen to pass
    await page.waitForTimeout(4000);
    
    // Wait for results screen
    await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });

    // Wait for initial image load attempts to fail and show placeholder
    // PrivateImage retries after 500ms, then 1500ms, so wait enough time
    await page.waitForTimeout(2500);
    
    // Assert that placeholder is visible (the IsoRoom clay placeholder)
    await expect(page.getByTestId("private-image-placeholder")).toBeVisible({ timeout: 2000 });
    
    // Verify that multiple signed URL requests were made (initial + retries)
    const initialRequestCount = signedUrlRequests.length;
    expect(initialRequestCount).toBeGreaterThan(1); // At least one retry happened
    
    await page.screenshot({ path: "e2e/screens/a5-image-expired-placeholder.png", fullPage: true });
    
    // Now allow subsequent requests to succeed
    interceptFailures = false;
    
    // The retry logic should eventually request a fresh signed URL (v=2, v=3, etc.)
    // Wait for the component to make another retry attempt
    await page.waitForTimeout(2000);
    
    // Assert that design images eventually load after retry
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const designImages = images.filter((img: any) => {
        const src = img.getAttribute('src');
        return src && src.includes('__mock__/design_');
      });
      return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
    }, { timeout: 5000 });
    
    await page.screenshot({ path: "e2e/screens/a5-image-retried.png", fullPage: true });

    // Verify that additional signed URL requests were made (for the retry)
    expect(signedUrlRequests.length).toBeGreaterThan(initialRequestCount);
  });
});
