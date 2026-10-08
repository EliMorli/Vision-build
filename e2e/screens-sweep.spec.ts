import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

// Phone viewport: iPhone 14 Pro dimensions
const PHONE_VIEWPORT = {
  width: 390,
  height: 844,
};

test.use({ viewport: PHONE_VIEWPORT, deviceScaleFactor: 2 });

test.describe("VisionBuild UI Screens Sweep", () => {
  test("captures all homeowner screens at phone size", async ({ page }: { page: Page }) => {
    // Seed localStorage for authenticated state with consent
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // ===== Empty Home =====
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/redesign your first room/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-home-empty.png", fullPage: false });

    // ===== Camera/Photo screen =====
    await page.getByRole("button", { name: /redesign your first room/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/quick tips/i)).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-camera.png", fullPage: false });

    // Upload image
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /choose from gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screens/ui-camera-with-image.png", fullPage: false });

    // ===== Style picker (unselected) =====
    await page.getByRole("button", { name: /analyze room/i }).click();
    await expect(page.getByText(/select a design style/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-style-picker-unselected.png", fullPage: false });

    // ===== Style picker (selected) =====
    await page.getByText("Modern", { exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "e2e/screens/ui-style-picker-selected.png", fullPage: false });

    // ===== Generating screen =====
    await page.getByRole("button", { name: /generate 4 designs/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/building your/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-generating.png", fullPage: false });

    // ===== Results (unselected) =====
    await expect(page.getByText(/swipe to browse/i)).toBeVisible({ timeout: 30000 });
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const designImages = images.filter((img: any) => {
        const src = img.getAttribute('src');
        return src && src.includes('__mock__/design_');
      });
      return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
    }, { timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-results-unselected.png", fullPage: false });

    // ===== Results (selected) =====
    await page.getByText("Option 1").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "e2e/screens/ui-results-selected.png", fullPage: false });

    // ===== Project detail =====
    await page.getByRole("button", { name: /save design/i }).click();
    await expect(page.getByText(/original photo/i)).toBeVisible({ timeout: 5000 });
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const designImages = images.filter((img: any) => {
        const src = img.getAttribute('src');
        return src && src.includes('__mock__/design_');
      });
      return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
    }, { timeout: 5000 });
    await page.screenshot({ path: "e2e/screens/ui-project-detail.png", fullPage: false });

    // Go back to home
    await page.goBack();
    await page.goBack();
    await page.goBack();
    await page.goBack();

    // ===== Home with project =====
    await page.waitForTimeout(1000);
    await expect(page.getByText(/renovation/i)).toBeVisible({ timeout: 5000 });
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const designImages = images.filter((img: any) => {
        const src = img.getAttribute('src');
        return src && src.includes('__mock__/design_');
      });
      return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
    }, { timeout: 5000 });
    await page.screenshot({ path: "e2e/screens/ui-home-with-project.png", fullPage: false });

    // ===== Explore =====
    await page.getByRole("button", { name: /explore/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/search styles, rooms/i)).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-explore.png", fullPage: false });

    // ===== Profile =====
    await page.getByRole("button", { name: /profile/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/rookie designer/i)).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-profile.png", fullPage: false });

    // ===== Settings =====
    await page.getByRole("button", { name: /settings & privacy/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/settings/i).first()).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-settings.png", fullPage: false });

    // Go back to home
    await page.goBack();
    await page.getByRole("button", { name: /home/i }).click();
    await page.waitForTimeout(500);

    // ===== Daily limit screen =====
    // Navigate directly to the error screen
    await page.goto(`${BASE_URL}/result-error?type=rate-limit`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/daily limit reached/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "e2e/screens/ui-daily-limit.png", fullPage: false });
  });
});
