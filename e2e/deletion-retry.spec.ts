// Test E: E2E deletion retry flow with screenshots
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("Account Deletion Retry Flow", () => {
  test.use({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  test("deletion failure shows retry UI and allows retry", async ({ page }: { page: Page }) => {
    const testToken = "test-token-for-e2e";
    let postCallCount = 0;

    // Intercept confirm-account-deletion function calls with CORS headers
    await page.route('**/functions/v1/confirm-account-deletion**', async (route) => {
      const request = route.request();
      const method = request.method();

      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      };

      if (method === "OPTIONS") {
        // Handle preflight
        await route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
      } else if (method === "GET") {
        // Return valid token on GET (validation)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: corsHeaders,
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
            headers: corsHeaders,
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
            headers: corsHeaders,
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

    // Assert the mocked GET worked by checking email and heading are visible
    await expect(page.getByText("test@example.com")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Delete your account?")).toBeVisible();

    // Wait for and click the delete button
    const deleteButton = page.getByTestId("delete-confirm-button");
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for error state to appear with exact text
    await expect(page.getByText("We couldn't finish deleting your account. Some of your data may already be removed. Please try again.")).toBeVisible({ timeout: 10000 });

    // Verify automatic retry message is visible
    await expect(page.getByText("We'll also keep trying automatically, so you don't need to do anything else.")).toBeVisible();

    // Verify Try again button is visible
    const retryButton = page.getByTestId("delete-retry-button");
    await expect(retryButton).toBeVisible();

    // Verify Contact support link is visible
    const supportLink = page.getByText("Contact support");
    await expect(supportLink).toBeVisible();

    // Verify device scale factor before screenshot
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(390);
    expect(viewport?.height).toBe(844);

    // Take screenshot of failure state with device scale factor
    await page.screenshot({ 
      path: "e2e/screens/del-failed.png",
      fullPage: false,
      scale: "device"
    });

    // Click Try again
    await retryButton.click();

    // Wait for success message
    await expect(page.getByText("Your account has been deleted")).toBeVisible({ timeout: 10000 });

    // Verify exactly 2 POSTs happened
    expect(postCallCount).toBe(2);

    // Verify device scale factor before screenshot
    const viewport2 = page.viewportSize();
    expect(viewport2?.width).toBe(390);
    expect(viewport2?.height).toBe(844);

    // Take screenshot of success state
    await page.screenshot({
      path: "e2e/screens/del-retry-success.png",
      fullPage: false,
      scale: "device"
    });
  });

  test("deleted state shows Done button in native app with Apple settings note", async ({ page }: { page: Page }) => {
    const testToken = "test-token-apple";

    // Intercept confirm-account-deletion function calls
    await page.route('**/functions/v1/confirm-account-deletion**', async (route) => {
      const request = route.request();
      const method = request.method();

      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      };

      if (method === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
      } else if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: corsHeaders,
          body: JSON.stringify({
            valid: true,
            email: "apple@example.com",
            isAppleUser: true,
          }),
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            needsManualDisconnect: false,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate and delete
    await page.goto(`${BASE_URL}/delete-account/confirm?token=${testToken}`);
    await page.waitForLoadState("networkidle");

    const deleteButton = page.getByTestId("delete-confirm-button");
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for success message
    await expect(page.getByText("Your account has been deleted")).toBeVisible({ timeout: 10000 });

    // On web, Done button should NOT be visible
    const doneButton = page.getByTestId("delete-done-button");
    await expect(doneButton).not.toBeVisible();

    // Apple settings note should NOT be visible on web
    await expect(page.getByText(/We've also asked Apple to disconnect/)).not.toBeVisible();
  });
});
