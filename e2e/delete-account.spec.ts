import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("Delete Account Flow", () => {
  test("delete account confirmation: cancel, reopen, confirm", async ({ page }: { page: Page }) => {
    // Set device scale factor to 2 for screenshots
    await page.setViewportSize({ width: 390, height: 844 });
    
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
      
      // Mock the delete-account function to prevent actual deletion
      // and track that it was called
      (window as any).__deleteCalled = false;
      const originalFetch = window.fetch;
      window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
        if (url && url.includes('/functions/v1/delete-account')) {
          (window as any).__deleteCalled = true;
          // Return success
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return originalFetch.call(this, input as RequestInfo, init);
      };
    });

    await page.goto(BASE_URL);

    // Navigate to Profile
    await page.goto(`${BASE_URL}/(tabs)/profile`);

    // Click Settings button
    await page.getByTestId("profile-settings-button").click();
    await page.waitForLoadState("networkidle");

    // Click Delete Account button
    await page.getByTestId("delete-account-button").click();

    // ─── Part 1: Verify confirm sheet shows and take screenshot ───
    
    await expect(page.getByTestId("delete-account-confirm")).toBeVisible({ timeout: 3000 });
    
    // Verify message contains deletion summary (from DELETED_DATA_SUMMARY)
    await expect(page.getByText(/This will permanently delete your account and your projects/i)).toBeVisible();

    // Take screenshot at DSF 2 (390x844 viewport already set)
    await page.screenshot({ 
      path: "e2e/screens/ui-delete-account-confirm.png", 
      fullPage: false 
    });

    // ─── Part 2: Cancel and verify sheet is hidden ───
    
    await page.getByTestId("delete-account-confirm-cancel").click();
    await expect(page.getByTestId("delete-account-confirm")).not.toBeVisible({ timeout: 3000 });

    // ─── Part 3: Reopen and confirm ───
    
    await page.getByTestId("delete-account-button").click();
    await expect(page.getByTestId("delete-account-confirm")).toBeVisible({ timeout: 3000 });
    
    await page.getByTestId("delete-account-confirm-confirm").click();

    // ─── Part 4: Assert deletion was recorded (function was called) ───
    
    // Wait a bit for the deletion call to complete
    await page.waitForTimeout(1000);
    
    // Check that delete-account function was called
    const deleteCalled = await page.evaluate(() => (window as any).__deleteCalled);
    expect(deleteCalled).toBe(true);
  });
});
