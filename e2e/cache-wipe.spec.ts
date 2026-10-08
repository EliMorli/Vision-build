import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("Offline Cache Wipe", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
  });

  test("after load, localStorage has offline cache entries", async ({ page }: { page: Page }) => {
    // Seed projects to trigger cache
    await page.addInitScript(() => {
      const projects = [{ id: "cache-1", user_id: "mock-user", title: "Test", original_image_url: "https://placehold.co/800x500", status: "draft", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
      // Simulate offline cache
      localStorage.setItem("@visionbuild:offline:mock-user:projects", JSON.stringify(projects));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("@visionbuild:offline:mock-user:")));
    expect(keys.length).toBeGreaterThan(0);
  });

  test("after sign-out, there are 0 offline cache entries", async ({ page }: { page: Page }) => {
    // Seed with cache
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:offline:mock-user:projects", JSON.stringify([]));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Sign out
    await page.getByRole("button", { name: /profile/i }).or(page.locator('[href="/(tabs)/profile"]')).first().click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForLoadState("networkidle");
    
    // Check cache is wiped
    const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("@visionbuild:offline:mock-user:")));
    expect(keys.length).toBe(0);
  });

  test("account deletion leaves 0 offline cache entries by the time deleted screen shows", async ({ page }: { page: Page }) => {
    // Seed with cache
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:offline:mock-user:projects", JSON.stringify([]));
    });
    
    await page.goto("/profile-settings");
    await page.waitForLoadState("networkidle");
    
    // Start delete flow
    await page.getByTestId("delete-account-button").click();
    await page.waitForLoadState("networkidle");
    
    // Confirm deletion
    await page.getByRole("button", { name: /delete my account/i }).click();
    await page.waitForLoadState("networkidle");
    
    // Wait for deleted screen
    await expect(page.getByText(/account.*deleted/i)).toBeVisible({ timeout: 10000 });
    
    // Check cache is wiped
    const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("@visionbuild:offline:mock-user:")));
    expect(keys.length).toBe(0);
  });
});
