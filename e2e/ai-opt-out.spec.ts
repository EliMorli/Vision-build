import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("AI Opt-Out", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      
      // Seed a project for generation test
      const projects = [{
        id: "ai-test-1",
        user_id: "mock-user",
        title: "Test Room",
        original_image_url: "https://placehold.co/800x500",
        room_analysis: { roomType: "kitchen", currentStyle: "traditional", estimatedSqFt: 150, keyElements: [], rawAnalysis: "test" },
        selected_style: "modern",
        status: "analyzed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
      
      // Initialize AI call counter as array
      (window as any).__VB_MOCK_AI_CALLS__ = [];
    });
  });

  test("positive control: with AI allowed, generate increments call counter", async ({ page }: { page: Page }) => {
    await page.goto("/editor/ai-test-1");
    await page.waitForLoadState("networkidle");
    
    // Click a style to generate
    const styleButtons = page.locator('button, [role="button"]').filter({ hasText: /modern|coastal|industrial/i });
    const firstStyle = styleButtons.first();
    await expect(firstStyle).toBeVisible();
    await firstStyle.click();
    await page.waitForLoadState("networkidle");
    
    // Check AI was called (array length)
    const callCount = await page.evaluate(() => ((window as any).__VB_MOCK_AI_CALLS__ || []).length);
    expect(callCount).toBeGreaterThan(0);
  });

  test("after opting out, generate leaves counter unchanged and explains why", async ({ page }: { page: Page }) => {
    // Opt out of AI
    await page.goto("/profile-settings");
    await page.waitForLoadState("networkidle");
    
    // Find and toggle AI opt-out
    const optOutToggle = page.locator('[aria-label*="Opt out"]').or(page.getByText(/opt out.*AI/i).locator('..').locator('..'));
    await expect(optOutToggle).toBeVisible();
    await optOutToggle.click();
    await page.waitForLoadState("networkidle");
    
    // Try to generate
    await page.goto("/editor/ai-test-1");
    await page.waitForLoadState("networkidle");
    
    // Reset counter
    await page.evaluate(() => {
      (window as any).__VB_MOCK_AI_CALLS__ = [];
    });
    
    // Click a style
    const styleButtons = page.locator('button, [role="button"]').filter({ hasText: /modern|coastal|industrial/i });
    const firstStyle = styleButtons.first();
    await expect(firstStyle).toBeVisible();
    await firstStyle.click();
    await page.waitForLoadState("networkidle");
    
    // Counter should be unchanged (0)
    const callCount = await page.evaluate(() => ((window as any).__VB_MOCK_AI_CALLS__ || []).length);
    expect(callCount).toBe(0);
    
    // UI should explain why
    await expect(page.getByText(/opted out|disabled|not available/i)).toBeVisible({ timeout: 10000 });
  });
});
