import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });

test.describe("Intro carousel copy", () => {
  test("save slide promises only what ships (no pros, no coming soon)", async ({ page }) => {
    await page.goto(`${BASE_URL}/intro`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Keep every idea", { exact: true })).toBeAttached({ timeout: 10000 });
    await expect(page.getByText("Save your favorite designs to a project.", { exact: true })).toBeAttached();
    await expect(page.getByText(/local pros/i)).toHaveCount(0);
    await expect(page.getByText(/coming soon/i)).toHaveCount(0);
  });
});
