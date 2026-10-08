import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("Error Contact Support", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
  });

  test("with placeholder email, contact support link is hidden", async ({ page }: { page: Page }) => {
    // Trigger an error state
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ home: "error" }));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Error state should show
    await expect(page.getByTestId("home-error")).toBeVisible({ timeout: 10000 });
    
    // Contact support link should be hidden (placeholder email)
    await expect(page.getByTestId("error-contact-support")).toBeHidden();
  });
});
