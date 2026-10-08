// Test E: E2E deletion retry flow with screenshots
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("Account Deletion Retry Flow", () => {
  test.use({ 
    viewport: { width: 390, height: 844 } 
  });

  test("deletion failure shows retry UI and allows retry", async ({ page }: { page: Page }) => {
    // Seed localStorage to mock deletion failure
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_deletion_failure", "true");
    });

    // Navigate to confirm page (use a mock token)
    await page.goto(`${BASE_URL}/delete-account/confirm?token=test-token-for-e2e`);
    await page.waitForLoadState("networkidle");

    // Click confirm button to trigger deletion
    const confirmButton = page.getByRole("button", { name: /confirm deletion/i });
    await confirmButton.click();

    // Wait for error state to appear
    await expect(page.getByText("We couldn't finish deleting your account. Some of your data may already be removed. Please try again.")).toBeVisible({ timeout: 10000 });

    // Verify Try again button is visible
    const retryButton = page.getByTestId("delete-retry-button");
    await expect(retryButton).toBeVisible();

    // Verify Contact support link is visible
    const supportLink = page.getByText("Contact support");
    await expect(supportLink).toBeVisible();

    // Take screenshot of failure state
    await page.screenshot({ 
      path: "e2e/screenshots/del-failed.png",
      fullPage: false 
    });

    console.log("✅ Screenshot saved: e2e/screenshots/del-failed.png");

    // Clear the mock failure flag
    await page.addInitScript(() => {
      localStorage.removeItem("@visionbuild:mock_deletion_failure");
    });

    // Click Try again button
    await retryButton.click();

    // Wait for success state
    await expect(page.getByText(/your account has been deleted/i)).toBeVisible({ timeout: 10000 });

    // Take screenshot of success state
    await page.screenshot({ 
      path: "e2e/screenshots/del-retry-success.png",
      fullPage: false 
    });

    console.log("✅ Screenshot saved: e2e/screenshots/del-retry-success.png");
  });
});
