// Test deleted account screen preview for design review
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("Deleted Account Screen Preview", () => {
  test.use({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  test.beforeEach(async ({ page }: { page: Page }) => {
    // Set up dev mode
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
    });
  });

  test("deleted screen preview: Apple variant shows Done button and Apple note", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/dev/deleted-preview?variant=apple`);
    await page.waitForLoadState("networkidle");

    // Should show the main message
    await expect(page.getByText("Your account has been deleted")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/all your data has been permanently removed/i)).toBeVisible();

    // Should show Done button (native action)
    const doneButton = page.getByTestId("delete-done-button");
    await expect(doneButton).toBeVisible();
    await expect(doneButton).toHaveText("Done");

    // Should show Apple settings note
    await expect(page.getByText("We've also asked Apple to disconnect VisionBuild from your Apple ID. To check, open Settings, tap your name, then Sign-In & Security, then Sign in with Apple.")).toBeVisible();

    await page.screenshot({ path: "e2e/screens/ui-deleted-apple.png", fullPage: false });
  });

  test("deleted screen preview: Email variant shows Done button but no Apple note", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/dev/deleted-preview?variant=email`);
    await page.waitForLoadState("networkidle");

    // Should show the main message
    await expect(page.getByText("Your account has been deleted")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/all your data has been permanently removed/i)).toBeVisible();

    // Should show Done button (native action)
    const doneButton = page.getByTestId("delete-done-button");
    await expect(doneButton).toBeVisible();
    await expect(doneButton).toHaveText("Done");

    // Should NOT show Apple settings note
    await expect(page.getByText("We've also asked Apple to disconnect VisionBuild")).not.toBeVisible();

    await page.screenshot({ path: "e2e/screens/ui-deleted-email.png", fullPage: false });
  });

  test("real confirm route: web hides Done button and Apple note", async ({ page }: { page: Page }) => {
    const testToken = "test-web-deleted-token";

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
            email: "test@example.com",
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
      }
    });

    await page.goto(`${BASE_URL}/delete-account/confirm?token=${testToken}`);
    await page.waitForLoadState("networkidle");

    // Wait for and click the delete button
    const deleteButton = page.getByTestId("delete-confirm-button");
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for deleted state
    await expect(page.getByText("Your account has been deleted")).toBeVisible({ timeout: 10000 });

    // On web, Done button should NOT be visible
    await expect(page.getByTestId("delete-done-button")).not.toBeVisible();

    // Apple note should NOT be visible on web
    await expect(page.getByText("We've also asked Apple to disconnect VisionBuild")).not.toBeVisible();
  });
});
