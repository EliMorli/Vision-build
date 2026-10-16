import { test, expect, type Page } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

const aiCallCount = (page: Page) =>
  page.evaluate(() => ((window as any).__VB_MOCK_AI_CALLS__ || []).length as number);

test.describe("AI Opt-Out", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");

      const projects = [{
        id: "ai-test-1",
        user_id: "mock-user",
        title: "Test Room",
        original_image_url: "https://placehold.co/800x500",
        room_analysis: { roomType: "kitchen", currentStyle: "traditional", estimatedSqFt: 150, keyElements: [], rawAnalysis: "test" },
        selected_style: null,
        generated_image_urls: [],
        status: "analyzed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
    });
  });

  test("positive control: with AI allowed, generate increments call counter", async ({ page }: { page: Page }) => {
    await page.goto("/editor/ai-test-1");
    await expect(page.getByTestId("style-picker-header")).toBeVisible({ timeout: 15000 });
    expect(await aiCallCount(page)).toBe(0);

    await page.getByRole("button", { name: "Modern style" }).click();
    const generate = page.getByRole("button", { name: /generate 4 designs/i });
    await expect(generate).toBeEnabled();
    await generate.click();

    await expect.poll(() => aiCallCount(page), { timeout: 15000 }).toBeGreaterThan(0);
  });

  test("after opting out, generate leaves counter unchanged and explains why", async ({ page }: { page: Page }) => {
    await page.goto("/profile-settings");
    const optOutToggle = page.getByRole("switch", { name: /opt out of ai processing/i })
      .or(page.locator('[aria-label^="Opt out of AI processing"]'));
    await expect(optOutToggle.first()).toBeVisible({ timeout: 15000 });
    await expect(optOutToggle.first()).toHaveAttribute("aria-label", /, off\./);
    await optOutToggle.first().click();
    await expect(optOutToggle.first()).toHaveAttribute("aria-label", /, on\./);

    await page.goto("/editor/ai-test-1");
    await expect(page.getByTestId("style-picker-header")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Modern style" }).click();

    // The UI explains why generation is unavailable and the button is disabled
    await expect(page.getByTestId("ai-opt-out-notice")).toBeVisible();
    await expect(page.getByText(/you opted out of ai processing/i)).toBeVisible();
    const generate = page.getByRole("button", { name: /generate 4 designs/i });
    await expect(generate).toBeDisabled();

    // Even a forced click must not reach the model
    await generate.click({ force: true });
    await expect(page).toHaveURL(/\/editor\/ai-test-1/);
    expect(await aiCallCount(page)).toBe(0);
  });
});
