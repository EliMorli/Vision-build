import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("Delete Account Flow", () => {
  test("delete account confirmation: cancel, reopen, confirm", async ({ page }: { page: Page }) => {
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

    // Click Delete Account button
    await page.getByTestId("delete-account-button").click();

    // ─── Part 1: Verify confirm sheet shows and take screenshot ───
    
    await expect(page.getByTestId("delete-account-confirm")).toBeVisible({ timeout: 3000 });
    
    // Verify message contains deletion summary (from DELETED_DATA_SUMMARY)
    await expect(page.getByText(/This will permanently delete your account and your projects/i)).toBeVisible();

    // Take screenshot
    await page.screenshot({ 
      path: "e2e/screens/ui-delete-account-confirm.png", 
      fullPage: false 
    });

    // ─── Part 2: Cancel and verify sheet is hidden ───
    
    await page.getByTestId("delete-account-confirm-cancel").click();
    await expect(page.getByTestId("delete-account-confirm")).not.toBeVisible({ timeout: 3000 });

    // ─── Part 3: Reopen and verify sheet shows again ───
    
    await page.getByTestId("delete-account-button").click();
    await expect(page.getByTestId("delete-account-confirm")).toBeVisible({ timeout: 3000 });

    // ─── Part 4: Cancel first - assert no delete call ───
    
    await page.getByTestId("delete-account-confirm-cancel").click();
    await expect(page.getByTestId("delete-account-confirm")).not.toBeVisible({ timeout: 3000 });
    
    // Verify no delete call was recorded
    let deleteCalls = await page.evaluate(() => (window as any).__VB_MOCK_DELETE_CALLS__ || []);
    expect(deleteCalls.length).toBe(0);
    
    // ─── Part 5: Reopen and confirm deletion ───
    
    await page.getByTestId("delete-account-button").click();
    await expect(page.getByTestId("delete-account-confirm")).toBeVisible({ timeout: 3000 });
    await page.getByTestId("delete-account-confirm-confirm").click();
    
    // Wait for sheet to close
    await expect(page.getByTestId("delete-account-confirm")).not.toBeVisible({ timeout: 3000 });
    
    // Verify exactly 1 delete call was recorded
    deleteCalls = await page.evaluate(() => (window as any).__VB_MOCK_DELETE_CALLS__ || []);
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0].userId).toBe("test-user-123");
    
    // App should end on signed-out/welcome screen
    // Wait for navigation to complete
    await page.waitForLoadState("networkidle");
    
    // Should see the intro/welcome screen (sign-in button or welcome message)
    await expect(
      page.getByText(/Get Started|Sign In|Welcome/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
