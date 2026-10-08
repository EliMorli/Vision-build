import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("Delete Account Flow", () => {
  test("delete account confirmation sheet shows DELETED_DATA_SUMMARY", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_seed_profile", JSON.stringify({
        id: "test-user-123",
        email: "test@visionbuild.app",
        display_name: "Test User",
        photo_url: null,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        xp: 0,
        level: 1
      }));
    });

    await page.goto(BASE_URL);

    // Navigate to Profile
    await page.goto(`${BASE_URL}/(tabs)/profile`);

    // Click Settings button
    await page.getByTestId("profile-settings-button").click();
    await page.waitForLoadState("networkidle");

    // Scroll to bottom to find Delete Account button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Click Delete Account button
    await page.getByRole("button", { name: /Delete Account/i }).click();

    // Verify ConfirmationSheet is visible
    await expect(page.getByTestId("delete-account-confirm")).toBeVisible({ timeout: 3000 });

    // Verify message contains deletion summary
    await expect(page.getByText(/This will permanently delete your account and your projects/i)).toBeVisible();

    // Take screenshot showing the confirmation with DELETED_DATA_SUMMARY
    await page.screenshot({ path: "e2e/screens/ui-delete-account-confirm.png", fullPage: true });
  });
});
