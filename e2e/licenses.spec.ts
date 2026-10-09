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
    // Navigate to help-contact
    await page.goto(`${BASE_URL}/help-contact`);
    await page.waitForLoadState("networkidle");
    
    // Click Licenses row
    await page.getByText(/open.*source.*licenses|licenses/i).click();
    await page.waitForLoadState("networkidle");
    
    // Assert licenses-list is visible
    await expect(page.getByTestId("licenses-list")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(/^license-item-/).first()).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: "e2e/screens/ui-licenses.png", fullPage: false });
    
    // The list is virtualized; filter to the package before tapping it
    await page.getByPlaceholder("Search packages...").fill("react");
    const reactEntry = page.getByTestId("license-item-react@18.3.1");
    await expect(reactEntry).toBeVisible({ timeout: 10000 });
    await reactEntry.click();

    // Assert license-text is visible and contains expected text
    const licenseText = page.getByTestId("license-text");
    await expect(licenseText).toBeVisible({ timeout: 10000 });
    await expect(licenseText).toContainText("Permission is hereby granted");
    await expect(licenseText).toContainText(/Copyright/i);
    // The modal slides in; wait until the sheet is fully on screen before capturing
    await expect(licenseText).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: "e2e/screens/ui-licenses-text.png", fullPage: false });
  });
});
