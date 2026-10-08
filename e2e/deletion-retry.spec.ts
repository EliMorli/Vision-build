// Test E: E2E deletion retry flow with screenshots
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("Account Deletion Retry Flow", () => {
  test.use({ 
    viewport: { width: 390, height: 844 } 
  });

  test("deletion failure shows retry UI and allows retry", async ({ page }: { page: Page }) => {
    const testToken = "test-token-for-e2e";
    let postCallCount = 0;

    // Intercept confirm-account-deletion function calls
    // Match both with and without query params
    await page.route(/.*\/functions\/v1\/confirm-account-deletion.*/, async (route) => {
      const request = route.request();
      const method = request.method();

      if (method === "GET") {
        // Return valid token on GET (validation)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            valid: true,
            email: "test@example.com",
            isAppleUser: false,
          }),
        });
      } else if (method === "POST") {
        postCallCount++;
        if (postCallCount === 1) {
          // First POST: return failure with retry
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              canRetry: true,
              error: "We couldn't finish deleting your account. Some of your data may already be removed. Please try again.",
            }),
          });
        } else {
          // Second POST: return success
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
            }),
          });
        }
      } else {
        await route.continue();
      }
    });

    // Navigate to confirm page
    await page.goto(`${BASE_URL}/delete-account/confirm?token=${testToken}`);
    await page.waitForLoadState("networkidle");

    // Wait for the page to load and show the confirm button (validates that our mock GET worked)
    const confirmButton = page.getByRole("button", { name: /confirm deletion/i });
    await expect(confirmButton).toBeVisible({ timeout: 10000 });
    
    // Click confirm button to trigger deletion
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
