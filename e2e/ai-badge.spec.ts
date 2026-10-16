import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Every AI design image carries the "✦ AI-generated" label (top-left), on
 * Results, the project Designs grid, Explore cards and the before/after
 * detail view.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

async function seed(page: Page, isPublic = false) {
  await page.addInitScript((pub) => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:mock_session", "true");
    localStorage.setItem("@visionbuild:ai_consent", "true");
    localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    const base = {
      status: "generated",
      room_analysis: { roomType: "living_room" },
      original_image_url: "mock/original.jpg",
      generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg", "mock/gen3.jpg", "mock/gen4.jpg"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const projects = pub
      ? [
          { ...base, id: "p1", user_id: "u1", title: "Modern living room", selected_style: "modern", is_public: true },
          { ...base, id: "p2", user_id: "u2", title: "Farmhouse kitchen", selected_style: "farmhouse", is_public: true },
        ]
      : [{ ...base, id: "mock-project-id", user_id: "mock-user", title: "Modern living room", selected_style: "modern", is_public: false }];
    localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
    localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
  }, isPublic);
}

async function expectBadge(badge: Locator, container: Locator) {
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText("✦ AI-generated");
  await expect(badge).toHaveAttribute("aria-label", "AI-generated image");
  await expect(badge).toHaveCSS("background-color", "rgba(0, 0, 0, 0.7)");
  await expect(badge.getByText("✦ AI-generated")).toHaveCSS("color", "rgb(255, 255, 255)");
  const b = (await badge.boundingBox())!;
  const c = (await container.boundingBox())!;
  // Top-left corner of the image
  expect(b.x - c.x).toBeGreaterThanOrEqual(0);
  expect(b.x - c.x).toBeLessThan(24);
  expect(b.y - c.y).toBeGreaterThanOrEqual(0);
  expect(b.y - c.y).toBeLessThan(24);
  // Non-interactive: taps pass through to the image
  expect(await badge.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test.describe("AI-generated label on every AI design image", () => {
  test("Results: badge top-left on each design, clear of the Option pill", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/result/mock-project-id`);
    const card = page.getByTestId("result-design-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await expectBadge(card.getByTestId("result-ai-badge"), card);
    expect(await page.getByTestId("result-ai-badge").count()).toBe(await page.getByTestId("result-design-card").count());
    const badge = (await card.getByTestId("result-ai-badge").boundingBox())!;
    const option = (await card.getByText(/^Option 1$/).boundingBox())!;
    expect(overlaps(badge, option)).toBe(false);
    await page.screenshot({ path: "e2e/screens/ui-ai-badge-results.png", fullPage: false });
  });

  test("detail view: the before/after redesign image is labelled", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/result/mock-project-id`);
    const card = page.getByTestId("result-design-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click({ delay: 900 }); // long-press opens the comparison
    const detail = page.getByTestId("detail-ai-badge");
    await expect(detail).toBeVisible({ timeout: 5000 });
    await expect(detail).toHaveText("✦ AI-generated");
    await expect(detail).toHaveAttribute("aria-label", "AI-generated image");
    // Only the redesign is labelled, never the original photo
    await expect(page.getByTestId("detail-ai-badge")).toHaveCount(1);
    const redesign = page.getByLabel("Redesigned room").first();
    const [b, r] = [(await detail.boundingBox())!, (await redesign.boundingBox())!];
    expect(b.x - r.x).toBeLessThan(20);
    expect(b.y - r.y).toBeLessThan(20);
    expect(b.x).toBeGreaterThanOrEqual(r.x - 1);
    await page.screenshot({ path: "e2e/screens/ui-ai-badge-detail.png", fullPage: false });
  });

  test("project Designs grid: every design card is labelled", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/project/mock-project-id`);
    const card = page.getByTestId("design-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await expectBadge(card.getByTestId("project-ai-badge"), card);
    expect(await page.getByTestId("project-ai-badge").count()).toBe(await page.getByTestId("design-card").count());
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "e2e/screens/ui-ai-badge-project.png", fullPage: false });
  });

  test("Explore: every public design card is labelled, clear of the menu button", async ({ page }) => {
    await seed(page, true);
    await page.goto(`${BASE_URL}/(tabs)/explore`);
    const card = page.getByTestId("explore-design-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await expectBadge(card.getByTestId("explore-ai-badge"), card);
    await expect(page.getByTestId("explore-ai-badge")).toHaveCount(await page.getByTestId("explore-design-card").count());
    const badge = (await card.getByTestId("explore-ai-badge").boundingBox())!;
    const menu = (await card.getByTestId("explore-report-button").boundingBox())!;
    expect(overlaps(badge, menu)).toBe(false);
    await page.screenshot({ path: "e2e/screens/ui-ai-badge-explore.png", fullPage: false });
  });

  test("Home thumbnail and pros hand-off preview: labelled only when they show an AI design", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      const now = new Date().toISOString();
      const base = { user_id: "mock-user", room_analysis: { roomType: "living_room" }, original_image_url: "mock/original.jpg", is_public: false, created_at: now, updated_at: now };
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([
        { ...base, id: "mock-project-id", title: "Chosen design", status: "generated", selected_style: "modern", generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg"], selected_generation_url: "mock/gen1.jpg", lead_info: { projectBrief: "Refresh the living room in a modern style." } },
        { ...base, id: "photo-only", title: "Photo only", status: "analyzed", selected_style: null, generated_image_urls: [] },
      ]));
    });
    await page.goto(BASE_URL);
    const cards = page.getByTestId("home-project-card").locator("visible=true");
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    const chosen = cards.filter({ hasText: "Chosen design" });
    await expectBadge(chosen.getByTestId("home-ai-badge"), chosen);
    // The original room photo is not AI-generated, so no label
    await expect(cards.filter({ hasText: "Photo only" }).getByTestId("home-ai-badge")).toHaveCount(0);

    // Pros hand-off preview (in-app navigation keeps the loaded projects)
    await chosen.click();
    await page.getByTestId("project-brief-waitlist").click();
    await expect(page).toHaveURL(/pros-coming-soon/);
    const pros = page.getByTestId("pros-ai-badge");
    await expect(pros).toBeVisible({ timeout: 15000 });
    await expect(pros).toHaveText("✦ AI-generated");
    await expect(pros).toHaveAttribute("aria-label", "AI-generated image");
  });
});
