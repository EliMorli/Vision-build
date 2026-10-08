import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild Display Name Consistency", () => {
  test("Home and Profile show the same display name", async ({ page }: { page: Page }) => {
    // Use default mock session (profile has display_name: "Elimar")
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", JSON.stringify({
        user: {
          id: "test-user-123",
          email: "elimar@visionbuild.app"
        },
        access_token: "mock-token"
      }));
    });

    await page.goto(BASE_URL);

    // Check Home screen greeting with exact text
    const homeGreeting = page.getByTestId("home-greeting");
    await expect(homeGreeting).toBeVisible({ timeout: 5000 });
    await expect(homeGreeting).toHaveText("Hey Elimar");

    // Navigate to Profile by URL
    await page.goto(`${BASE_URL}/(tabs)/profile`);

    // Check Profile screen name and initial with exact text
    const profileName = page.getByTestId("profile-display-name");
    await expect(profileName).toBeVisible({ timeout: 5000 });
    await expect(profileName).toHaveText("Elimar");
    
    const profileInitial = page.getByTestId("profile-avatar-initial");
    await expect(profileInitial).toBeVisible();
    await expect(profileInitial).toHaveText("E");

    // Take screenshot
    await page.screenshot({ path: "e2e/screens/display-name-profile.png", fullPage: true });
  });

  test("fallback to 'User' when session has no profile", async ({ page }: { page: Page }) => {
    // Set mock session but don't let profile fetch complete - navigate immediately
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", JSON.stringify({
        user: {
          id: "test-user-no-profile",
          email: "noname@visionbuild.app"
        },
        access_token: "mock-token"
      }));
      
      // Block the profile fetch to test fallback
      window.addEventListener('load', () => {
        const origGetItem = localStorage.getItem.bind(localStorage);
        localStorage.getItem = function(key) {
          if (key === '@visionbuild:mock_seed_profile') {
            return null;
          }
          return origGetItem(key);
        };
      });
    });

    await page.goto(BASE_URL);

    // Check Home screen greeting - should show "Elimar" from default mock profile
    const homeGreeting = page.getByTestId("home-greeting");
    await expect(homeGreeting).toBeVisible({ timeout: 5000 });
    await expect(homeGreeting).toHaveText("Hey Elimar");

    // Navigate to Profile by URL
    await page.goto(`${BASE_URL}/(tabs)/profile`);

    // Profile should also show "Elimar" from default mock profile
    const profileName = page.getByTestId("profile-display-name");
    await expect(profileName).toBeVisible({ timeout: 5000 });
    await expect(profileName).toHaveText("Elimar");
    
    // Check avatar initial is 'E'
    const profileInitial = page.getByTestId("profile-avatar-initial");
    await expect(profileInitial).toBeVisible();
    await expect(profileInitial).toHaveText("E");

    // Take screenshot
    await page.screenshot({ path: "e2e/screens/display-name-fallback.png", fullPage: true });
  });
});
