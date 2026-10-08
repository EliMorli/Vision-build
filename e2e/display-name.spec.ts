import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild Display Name Consistency", () => {
  test("Home and Profile show the same seeded display name", async ({ page }: { page: Page }) => {
    // Seed with intro seen, mock session, and a specific display name
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", JSON.stringify({
        user: {
          id: "test-user-123",
          email: "elimar@visionbuild.app",
          user_metadata: {
            full_name: "Elimar Morli"
          }
        },
        access_token: "mock-token"
      }));
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Check Home screen greeting
    await expect(page.getByText(/Hey Elimar/i)).toBeVisible({ timeout: 5000 });

    // Navigate to Profile
    await page.getByRole("button", { name: /Profile/i }).click();
    await page.waitForTimeout(500);

    // Check Profile screen name
    await expect(page.getByText("Elimar Morli")).toBeVisible({ timeout: 5000 });
    
    // Check avatar initial is 'E'
    await expect(page.locator('text=/^E$/').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "e2e/screens/display-name-profile.png", fullPage: true });
  });

  test("fallback to 'User' when no display name exists", async ({ page }: { page: Page }) => {
    // Seed with no display name or user metadata
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", JSON.stringify({
        user: {
          id: "test-user-no-name",
          email: "noname@visionbuild.app"
          // No user_metadata
        },
        access_token: "mock-token"
      }));
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Check Home screen greeting - should show first name extracted from email
    // noname@visionbuild.app -> Noname
    await expect(page.getByText(/Hey Noname/i)).toBeVisible({ timeout: 5000 });

    // Navigate to Profile
    await page.getByRole("button", { name: /Profile/i }).click();
    await page.waitForTimeout(500);

    // Check Profile screen shows "Noname"
    await expect(page.getByText("Noname")).toBeVisible({ timeout: 5000 });
    
    // Check avatar initial is 'N'
    await expect(page.locator('text=/^N$/').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "e2e/screens/display-name-fallback.png", fullPage: true });
  });

  test("fallback to 'User' when email has no extractable name", async ({ page }: { page: Page }) => {
    // Seed with minimal email
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", JSON.stringify({
        user: {
          id: "test-user-minimal",
          email: "u@example.com"
          // No user_metadata, email has single char before @
        },
        access_token: "mock-token"
      }));
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Check Home screen greeting
    await expect(page.getByText(/Hey U/i)).toBeVisible({ timeout: 5000 });

    // Navigate to Profile
    await page.getByRole("button", { name: /Profile/i }).click();
    await page.waitForTimeout(500);

    // Check Profile screen shows "U"
    await expect(page.getByText(/^U$/)).toBeVisible({ timeout: 5000 });
    
    // Check avatar initial is 'U'
    const avatarInitials = page.locator('[style*="fontSize: 36"]').filter({ hasText: /^U$/ });
    await expect(avatarInitials.first()).toBeVisible();
  });
});
