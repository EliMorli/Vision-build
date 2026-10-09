import { test, expect, type Page } from "@playwright/test";

/** Checks from the full UI pass (icon, header row, Explore grid, Cancel button). */
const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

async function seedSignedIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:mock_session", "true");
    localStorage.setItem("@visionbuild:ai_consent", "true");
    localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
  });
}

test.describe("UI pass", () => {
  test("intro shows the real app icon beside VisionBuild", async ({ page }) => {
    await page.goto(`${BASE_URL}/intro`);
    const icon = page.getByTestId("intro-app-icon");
    await expect(icon).toBeVisible({ timeout: 15000 });
    const brand = page.getByText("VisionBuild", { exact: true }).first();
    const [i, b] = [await icon.boundingBox(), await brand.boundingBox()];
    expect(i && b).toBeTruthy();
    // Same row, icon on the left
    expect(Math.abs(i!.y + i!.height / 2 - (b!.y + b!.height / 2))).toBeLessThan(8);
    expect(i!.x + i!.width).toBeLessThanOrEqual(b!.x + 1);
    expect(i!.width).toBeGreaterThanOrEqual(28);
    // The image is the store icon asset, not a vector glyph
    const src = await icon.evaluate((el) => {
      const img = el.querySelector("img");
      const bg = getComputedStyle(el.querySelector("div") || el).backgroundImage;
      return img?.getAttribute("src") || bg;
    });
    expect(src).toMatch(/icon/);
    // No second (house) icon circle under the brand row: the title follows it
    // directly and the slider sits higher on the screen
    const title = page.getByText("See the transformation");
    const slider = page.getByTestId("intro-slider");
    const [t, s] = [await title.boundingBox(), await slider.boundingBox()];
    expect(t && s).toBeTruthy();
    const between = await page.evaluate(({ top, bottom }) => {
      // Any sizable box (like the 110px icon circle) between the brand row and the title
      return Array.from(document.querySelectorAll("div")).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= top && r.bottom <= bottom && r.width >= 80 && r.width <= 140 && r.height >= 80 && Math.abs(r.width - r.height) < 2;
      }).length;
    }, { top: i!.y + i!.height, bottom: t!.y });
    expect(between).toBe(0);
    expect(s!.y).toBeLessThan(270);
    await page.screenshot({ path: "e2e/screens/ui-intro-app-icon.png", fullPage: false });
  });

  test("Find a pro: back arrow sits in the header row on the left", async ({ page }) => {
    await seedSignedIn(page);
    await page.goto(`${BASE_URL}/pros-coming-soon`);
    const header = page.getByTestId("pros-header");
    await expect(header).toBeVisible({ timeout: 15000 });
    const back = page.getByTestId("pros-back");
    const title = header.getByText("Find a pro");
    const [bb, tb, hb] = [await back.boundingBox(), await title.boundingBox(), await header.boundingBox()];
    expect(Math.abs(bb!.y + bb!.height / 2 - (tb!.y + tb!.height / 2))).toBeLessThan(6);
    expect(bb!.x).toBeLessThan(40);
    expect(bb!.x).toBeLessThan(tb!.x);
    expect(hb!.y).toBeLessThan(80);
    // Only one "Find a pro" title (no second navigation header above)
    await expect(page.getByText("Find a pro", { exact: true })).toHaveCount(1);
    await page.screenshot({ path: "e2e/screens/ui-find-a-pro-header.png", fullPage: false });
  });

  test("Explore feed is a 2-column grid with a white caption strip under each image", async ({ page }) => {
    await seedSignedIn(page);
    await page.addInitScript(() => {
      const base = { is_public: true, status: "generated", original_image_url: "mock/o.jpg", created_at: new Date().toISOString(), generated_image_urls: ["mock/g.jpg"] };
      localStorage.setItem(
        "@visionbuild:mock_seed_projects",
        JSON.stringify([
          { ...base, id: "p1", user_id: "u1", title: "Modern living room", selected_style: "modern" },
          { ...base, id: "p2", user_id: "u2", title: "Farmhouse kitchen", selected_style: "farmhouse" },
          { ...base, id: "p3", user_id: "u3", title: "Coastal bedroom", selected_style: "coastal" },
          { ...base, id: "p4", user_id: "u4", title: "Japandi office", selected_style: "japandi" },
        ])
      );
      localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
    });
    await page.goto(`${BASE_URL}/(tabs)/explore`);
    const cards = page.getByTestId("explore-design-card");
    await expect(cards).toHaveCount(4, { timeout: 15000 });
    const boxes = await Promise.all([0, 1, 2].map(async (i) => (await cards.nth(i).boundingBox())!));
    // Two per row, roughly half the width each
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width);
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 1);
    expect(boxes[0].width).toBeGreaterThan(160);
    expect(boxes[0].width).toBeLessThan(195);

    const caption = page.getByTestId("explore-card-caption").first();
    await expect(caption).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(caption).toContainText("Modern living room");
    await expect(caption).toContainText("Modern");
    // Caption is below the square image, not overlaid on it
    const capBox = (await caption.boundingBox())!;
    expect(capBox.y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].width - 1);
    await page.screenshot({ path: "e2e/screens/ui-explore-grid.png", fullPage: false });
  });

  test("delete confirmation: Cancel is a plain gray button with no thick border", async ({ page }) => {
    await seedSignedIn(page);
    await page.goto(`${BASE_URL}/profile-settings`);
    await page.getByTestId("delete-account-button").click();
    const cancel = page.getByTestId("delete-account-confirm-cancel");
    await expect(cancel).toBeVisible({ timeout: 5000 });
    const style = await cancel.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor,
        top: parseFloat(cs.borderTopWidth),
        bottom: parseFloat(cs.borderBottomWidth),
        left: parseFloat(cs.borderLeftWidth),
      };
    });
    expect(style.bg).toBe("rgb(241, 243, 244)");
    expect(style.top + style.bottom + style.left).toBe(0);
    await expect(cancel).toHaveText("Cancel");
    await expect(page.getByTestId("delete-account-confirm-confirm")).toHaveText("Delete my account");
    await page.screenshot({ path: "e2e/screens/ui-delete-sheet-cancel.png", fullPage: false });
  });
});
