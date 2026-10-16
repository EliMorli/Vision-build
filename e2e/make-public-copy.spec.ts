import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });

test.describe("Make public sheet copy", () => {
  test("stays-private list names chats and ZIP, no quotes", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      const now = new Date().toISOString();
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([{
        id: "mock-project-id", user_id: "mock-user", title: "Living room", status: "generated", selected_style: "modern",
        is_public: false, room_analysis: { roomType: "living_room" }, original_image_url: "mock/original.jpg",
        generated_image_urls: ["mock/gen1.jpg"], created_at: now, updated_at: now,
      }]));
    });
    await page.goto(`${BASE_URL}/project/mock-project-id`);
    await page.getByRole("switch", { name: "Make project public" }).click();
    const sheet = page.getByTestId("make-public-sheet");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet).toContainText("your chats and ZIP.");
    await expect(sheet).not.toContainText(/quotes?/i);
  });
});
