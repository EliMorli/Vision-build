import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("Licenses Screen", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
  });

  test("Help links to Licenses, list renders, tapping entry shows full license text", async ({ page }: { page: Page }) => {
    // Navigate to profile
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    await page.locator('[href="/(tabs)/profile"]').first().click();
    await page.waitForLoadState("networkidle");
    
    // Click Help & Contact
    await page.getByText("Help & Contact").click();
    await page.waitForLoadState("networkidle");
    
    // Click Licenses
    await page.getByText(/open.*source.*licenses|licenses/i).click();
    await page.waitForLoadState("networkidle");
    
    // List should render
    await expect(page.getByText(/@/)).toBeVisible({ timeout: 10000 }); // Package names with @ or version
    
    // Screenshot
    await page.screenshot({ path: "e2e/screens/ui-licenses.png", fullPage: false });
    
    // Tap a license entry
    const firstEntry = page.locator('button, [role="button"], [role="listitem"]').filter({ hasText: /@|react|MIT|License/i }).first();
    await firstEntry.click();
    await page.waitForLoadState("networkidle");
    
    // Full license text should show
    await expect(page.getByText(/permission.*hereby.*granted|copyright|license/i)).toBeVisible({ timeout: 10000 });
  });
});
