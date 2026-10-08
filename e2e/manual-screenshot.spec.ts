import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:8081";

test("manual screenshot of results with real images", async ({ page }) => {
  // Seed state
  await page.addInitScript(() => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:ai_consent", "true");
    localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
  });

  // NO route interception - let the app work normally
  
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

  // Wait for images to load (SVG files)
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img'));
    const designImages = images.filter((img: any) => {
      const src = img.getAttribute('src');
      return src && src.includes('__mock__/design_');
    });
    console.log(`Found ${designImages.length} design images`);
    return designImages.length > 0 && designImages.some((img: any) => {
      console.log(`Image naturalWidth: ${img.naturalWidth}`);
      return img.naturalWidth > 0;
    });
  }, { timeout: 10000 });
  
  await page.screenshot({ path: "e2e/debug/manual-results.png", fullPage: true });
});
