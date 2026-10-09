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
    // Seed projects to trigger real cache via app logic
    await page.addInitScript(() => {
      const projects = [
        { id: "cache-1", user_id: "mock-user", title: "Kitchen", original_image_url: "https://placehold.co/800x500", status: "draft", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: "cache-2", user_id: "mock-user", title: "Bathroom", original_image_url: "https://placehold.co/800x500", status: "draft", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Wait for projects to be visible (means cache should be populated by app)
    await expect(page.getByText("Kitchen")).toBeVisible({ timeout: 10000 });
    
    // Now check cache entries exist
    const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("@visionbuild:offline:mock-user:")));
    expect(keys.length).toBeGreaterThan(0);
  });

  test("after sign-out, there are 0 offline cache entries", async ({ page }: { page: Page }) => {
    // Seed projects to create real cache
    await page.addInitScript(() => {
      const projects = [{ id: "cache-1", user_id: "mock-user", title: "Test", original_image_url: "https://placehold.co/800x500", status: "draft", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Wait for project to load and cache to populate
    await expect(page.getByText("Test")).toBeVisible({ timeout: 10000 });
    
    // Verify cache exists before sign out
    let keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("@visionbuild:offline:mock-user:")));
    expect(keys.length).toBeGreaterThan(0);
    
    // Sign out
    await page.locator('[href="/profile"]').first().click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForLoadState("networkidle");
    
    // Check cache is wiped
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("@visionbuild:offline:mock-user:")).length)).toBe(0);
  });

  test("account deletion leaves 0 offline cache entries by the time deleted screen shows", async ({ page }: { page: Page }) => {
    // Seed projects to create real cache
    await page.addInitScript(() => {
      const projects = [{ id: "cache-1", user_id: "mock-user", title: "Test", original_image_url: "https://placehold.co/800x500", status: "draft", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // Wait for project to load
    await expect(page.getByText("Test")).toBeVisible({ timeout: 10000 });
    
    // Verify cache exists
    let keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("@visionbuild:offline:mock-user:")));
    expect(keys.length).toBeGreaterThan(0);
    
    // Navigate to settings
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
    
    // Wiped before navigation, so it must already be 0 when the deleted screen is visible
    keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("@visionbuild:offline:mock-user:")));
    expect(keys.length).toBe(0);
  });
});
