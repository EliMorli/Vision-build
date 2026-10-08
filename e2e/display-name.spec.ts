import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild Display Name Consistency", () => {
  test("Home and Profile show the same display name", async ({ page }: { page: Page }) => {
    // Seed profile with display_name
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_seed_profile", JSON.stringify({
        id: "test-user-123",
        email: "elimar@visionbuild.app",
        display_name: "Elimar",
        photo_url: null,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        xp: 0,
        level: 1
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

  test("fallback to 'User' when profile has empty display_name", async ({ page }: { page: Page }) => {
    // Seed profile with empty display_name
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_seed_profile", JSON.stringify({
        id: "test-user-no-name",
        email: "noname@visionbuild.app",
        display_name: "",
        photo_url: null,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        xp: 0,
        level: 1
      }));
    });

    await page.goto(BASE_URL);

    // Check Home screen greeting - should show "Hey there" when name is User fallback
    const homeGreeting = page.getByTestId("home-greeting");
    await expect(homeGreeting).toBeVisible({ timeout: 5000 });
    await expect(homeGreeting).toHaveText("Hey there");

    // Navigate to Profile by URL
    await page.goto(`${BASE_URL}/(tabs)/profile`);
    
    // Check Profile screen name and initial - should show "User" and "U"
    const profileName = page.getByTestId("profile-display-name");
    await expect(profileName).toBeVisible({ timeout: 5000 });
    await expect(profileName).toHaveText("User");
    
    // Check avatar initial is 'U'
    const profileInitial = page.getByTestId("profile-avatar-initial");
    await expect(profileInitial).toBeVisible();
    await expect(profileInitial).toHaveText("U");

    // Take screenshot
    await page.screenshot({ path: "e2e/screens/display-name-fallback.png", fullPage: true });
  });
});
