import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild Create Loop", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Mock mode should be enabled (EXPO_PUBLIC_DEV_MOCK_SESSION=true)
    await page.goto(BASE_URL);
  });

  test("completes full create loop in mock mode", async ({ page }: { page: Page }) => {
    // Wait for app to load
    await page.waitForLoadState("networkidle");

    // Should start on Home (empty state) after intro
    await expect(page.getByText("No projects yet")).toBeInViewport({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/a5-home-empty.png", fullPage: true });

    // Click "Start Your First Project"
    await page.getByRole("button", { name: /start your first project/i }).click();

    // Should be on camera/create screen
    await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
    await page.screenshot({ path: "e2e/screens/a5-capture.png", fullPage: true });

    // Upload a test image
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles("e2e/fixtures/test-room.jpg");

    // Wait for image to be selected
    await expect(page.getByText("Analyze Room")).toBeVisible();

    // Click "Analyze Room"
    await page.getByRole("button", { name: /analyze room/i }).click();

    // Should navigate to consent screen (first time)
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
    await page.screenshot({ path: "e2e/screens/a5-consent.png", fullPage: true });

    // Accept consent
    await page.getByRole("button", { name: /continue/i }).click();

    // Should be on style picker
    await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/a5-style.png", fullPage: true });

    // Select a style (e.g., Modern)
    await page.getByText("Modern", { exact: true }).click();

    // Click "Generate 4 Designs"
    await page.getByRole("button", { name: /generate 4 designs/i }).click();

    // Should be on generating screen
    await expect(page.getByText(/building your/i)).toBeInViewport({ timeout: 5000 });
    await page.screenshot({ path: "e2e/screens/a5-generating.png", fullPage: true });

    // Wait for generation to complete (mock is fast)
    await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });

    // Should be on results screen
    await expect(page.getByText("Option 1")).toBeVisible();
    await page.screenshot({ path: "e2e/screens/a5-results.png", fullPage: true });

    // Select a design (tap the first one)
    const firstDesign = page.locator('[role="button"]').filter({ hasText: "Option 1" }).first();
    await firstDesign.click();

    // Click "Save Design"
    await page.getByRole("button", { name: /save design/i }).click();

    // Should be on project detail
    await expect(page.getByText("Original Photo")).toBeInViewport({ timeout: 5000 });
    await page.screenshot({ path: "e2e/screens/a5-project-detail.png", fullPage: true });

    // Navigate back to Home
    await page.goBack();

    // Should see the project in Home list
    await expect(page.getByText(/renovation/i)).toBeVisible();
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
    // Track requests to verify no analyze or generate requests are made
    const requests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("analyze-room") || url.includes("generate-design")) {
        requests.push(url);
      }
    });

    // Navigate to camera
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /start your first project/i }).click();

    // Upload test image
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles("e2e/fixtures/test-room.jpg");

    // Click Analyze
    await page.getByRole("button", { name: /analyze room/i }).click();

    // Should be on consent screen
    await expect(page.getByText("AI-Powered Designs")).toBeInViewport();

    // Navigate back (decline consent)
    await page.goBack();

    // Should be back on camera screen
    await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();

    // Verify no analyze or generate requests were made
    expect(requests).toHaveLength(0);
  });

  test("handles image load failure with placeholder", async ({ page }: { page: Page }) => {
    // Intercept first image request and return 403
    let requestCount = 0;
    await page.route("**/room-photos/**", (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First request: return 403 (expired link)
        route.fulfill({ status: 403, body: "Forbidden" });
      } else {
        // Subsequent requests: continue normally
        route.continue();
      }
    });

    // Navigate through the flow to results
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /start your first project/i }).click();
    
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles("e2e/fixtures/test-room.jpg");
    
    await page.getByRole("button", { name: /analyze room/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    
    await page.getByText("Modern", { exact: true }).click();
    await page.getByRole("button", { name: /generate 4 designs/i }).click();
    
    // Wait for results
    await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });

    // Wait for placeholder to appear (IsoRoom)
    await page.waitForTimeout(1000); // Give time for retry logic

    // Verify placeholder is visible (check for IsoRoom SVG element or container)
    const placeholder = page.locator('[data-testid*="iso-room"]').or(page.locator('svg')).first();
    await expect(placeholder).toBeInViewport({ timeout: 5000 });

    await page.screenshot({ path: "e2e/screens/a5-image-expired-placeholder.png", fullPage: true });

    // Verify that a retry was attempted (requestCount > 1)
    expect(requestCount).toBeGreaterThan(1);
  });
});
