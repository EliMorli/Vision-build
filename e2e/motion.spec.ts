import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Motion pass (PR #17): press feedback, drag-to-dismiss sheets, intro slider,
 * Generating pulse and haptic moments. No wall-clock asserts: everything
 * waits on state (expect.poll), never on how long something took.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

async function seed(page: Page, opts: { projects?: "none" | "own" | "public"; reduce?: boolean } = {}) {
  const { projects = "none", reduce = false } = opts;
  await page.addInitScript(({ projects, reduce }) => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:mock_session", "true");
    localStorage.setItem("@visionbuild:ai_consent", "true");
    localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    localStorage.setItem("@visionbuild:blocks", "[]");
    localStorage.setItem("@visionbuild:reports", "[]");
    localStorage.setItem("@visionbuild:user_settings:mock-user", JSON.stringify({ reduceMotion: reduce }));
    const now = new Date().toISOString();
    const p = (id: string, user: string, isPublic: boolean) => ({
      id, user_id: user, title: "Living room", status: "generated", selected_style: "modern", is_public: isPublic,
      room_analysis: { roomType: "living_room" }, original_image_url: "mock/original.jpg",
      generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg"], selected_generation_url: "mock/gen1.jpg",
      created_at: now, updated_at: now,
    });
    if (projects === "own") localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([p("mock-project-id", "mock-user", false)]));
    if (projects === "public") localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([p("pub-1", "other-user-1", true)]));
  }, { projects, reduce });
}

/** Computed transform scale and translateY, and opacity, of an element */
async function visual(loc: Locator) {
  return loc.evaluate((el) => {
    const cs = getComputedStyle(el);
    const m = cs.transform === "none" ? new DOMMatrix() : new DOMMatrix(cs.transform);
    return { scale: Math.hypot(m.a, m.b), ty: m.f, opacity: parseFloat(cs.opacity) };
  });
}

async function layoutBox(loc: Locator) {
  // Layout position, ignoring transforms (offset*), plus the rendered box
  return loc.evaluate((el) => {
    const h = el as HTMLElement;
    return { top: h.offsetTop, left: h.offsetLeft, width: h.offsetWidth, height: h.offsetHeight };
  });
}

/** Page settled: network idle, fonts loaded, and the element's layout no longer changing */
async function settled(page: Page, loc: Locator) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => true));
  let last = "";
  await expect
    .poll(async () => {
      const now = JSON.stringify(await layoutBox(loc));
      const same = now === last;
      last = now;
      return same;
    })
    .toBe(true);
}

async function pressAndHold(page: Page, loc: Locator) {
  const b = (await loc.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
}

test.describe("Press feedback", () => {
  test.use({ reducedMotion: "no-preference" });

  test("press scales (transform only): no layout shift for the button or its siblings", async ({ page }) => {
    await seed(page);
    await page.goto(BASE_URL);
    const button = page.getByRole("button", { name: /start your first project/i }).first();
    await expect(button).toBeVisible({ timeout: 10000 });
    await settled(page, button);
    const sibling = page.getByText("No projects yet", { exact: true });
    const [sibBefore, btnBefore, btnLayoutBefore] = [await sibling.boundingBox(), await button.boundingBox(), await layoutBox(button)];

    await pressAndHold(page, button);
    await expect.poll(async () => (await visual(button)).scale).toBeLessThan(0.99);
    const pressed = await visual(button);
    expect(pressed.scale).toBeGreaterThanOrEqual(0.97 - 1e-3);
    expect(pressed.opacity).toBe(1);
    expect(await sibling.boundingBox()).toEqual(sibBefore);
    expect(await layoutBox(button)).toEqual(btnLayoutBefore);
    // Nothing below moved either: the next block keeps its place
    await page.screenshot({ path: "e2e/screens/motion-press-scale.png", fullPage: false });
    await page.mouse.move(5, 5);
    await page.mouse.up();
    // Released: settles back exactly where it was (sub-pixel rounding aside)
    const round = (b: { x: number; y: number; width: number; height: number } | null) =>
      b && { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, w: Math.round(b.width * 100) / 100, h: Math.round(b.height * 100) / 100 };
    await expect.poll(async () => round(await button.boundingBox())).toEqual(round(btnBefore));
  });
});

test.describe("Press feedback with Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no movement, press still shows as a dim", async ({ page }) => {
    await seed(page);
    await page.goto(BASE_URL);
    const button = page.getByRole("button", { name: /start your first project/i }).first();
    await expect(button).toBeVisible({ timeout: 10000 });
    await settled(page, button);
    const layoutBefore = await layoutBox(button);
    await pressAndHold(page, button);
    await expect.poll(async () => (await visual(button)).opacity).toBeLessThan(0.9);
    const v = await visual(button);
    expect(v.opacity).toBeGreaterThanOrEqual(0.85 - 1e-3);
    expect(v.scale).toBe(1);
    expect(v.ty).toBe(0);
    expect(await layoutBox(button)).toEqual(layoutBefore);
    await page.mouse.move(5, 5);
    await page.mouse.up();
    await expect.poll(async () => (await visual(button)).opacity).toBe(1);
  });
});

async function dragDown(page: Page, handle: Locator, dy: number, opts: { settle: boolean }) {
  const b = (await handle.boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 12 });
  if (opts.settle) {
    // Hold still so the release carries no flick velocity
    for (let i = 0; i < 6; i++) await page.mouse.move(x, y + dy);
    await page.waitForTimeout(250);
    await page.mouse.move(x, y + dy);
  }
  await page.mouse.up();
}

test.describe("Drag-to-dismiss sheets", () => {
  test.use({ reducedMotion: "no-preference" });

  test("menu sheet follows the finger, springs home on a short drag, closes on a long one", async ({ page }) => {
    await seed(page, { projects: "public" });
    await page.goto(`${BASE_URL}/(tabs)/explore`);
    await page.getByTestId("explore-report-button").first().click();
    const sheet = page.getByTestId("report-block-menu");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect.poll(async () => Math.abs((await visual(sheet)).ty)).toBeLessThan(1);
    const grabber = page.getByTestId("report-block-menu-grabber");

    // Mid-drag the sheet is under the finger
    const g = (await grabber.boundingBox())!;
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 60, { steps: 8 });
    await expect.poll(async () => (await visual(sheet)).ty).toBeGreaterThan(40);
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    for (let i = 0; i < 6; i++) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.waitForTimeout(250);
    await page.mouse.up();
    await expect.poll(async () => Math.abs((await visual(sheet)).ty)).toBeLessThan(1);
    await expect(sheet).toBeVisible();

    // Short slow drag: springs back
    await dragDown(page, grabber, 20, { settle: true });
    await expect.poll(async () => Math.abs((await visual(sheet)).ty)).toBeLessThan(1);
    await expect(sheet).toBeVisible();

    // Long drag: closes
    const h = (await sheet.boundingBox())!.height;
    await dragDown(page, grabber, Math.round(h * 0.7), { settle: true });
    await expect(sheet).toHaveCount(0);
  });

  // Flick velocity deciding the close is unit tested on the release math
  // (lib/__tests__/sheet-physics.test.ts): in a browser, the measured velocity
  // depends on event timing under load, which would make this e2e flaky.

  test("Make public sheet drags to dismiss and keeps the project private", async ({ page }) => {
    await seed(page, { projects: "own" });
    await page.goto(`${BASE_URL}/project/mock-project-id`);
    await page.getByRole("switch", { name: /make project public/i }).click();
    const sheet = page.getByTestId("make-public-sheet");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    const h = (await sheet.boundingBox())!.height;
    await dragDown(page, page.getByTestId("make-public-sheet-grabber"), Math.round(h * 0.6), { settle: true });
    await expect(sheet).toHaveCount(0);
    // Still private: the switch still offers "Make project public"
    await expect(page.getByRole("switch", { name: "Make project public" })).toBeVisible();
  });

  test("Report sheet drags to dismiss from its header", async ({ page }) => {
    await seed(page, { projects: "public" });
    await page.goto(`${BASE_URL}/explore/pub-1`);
    await page.getByTestId("explore-detail-report").click();
    const sheet = page.getByTestId("report-sheet");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("What's wrong?")).toBeVisible();
    await page.screenshot({ path: "e2e/screens/motion-report-sheet.png", fullPage: false });
    const h = (await sheet.boundingBox())!.height;
    await dragDown(page, page.getByTestId("report-sheet-grabber"), Math.round(h * 0.6), { settle: true });
    await expect(sheet).toHaveCount(0);
  });
});

test.describe("Sheets with Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("Make public sheet appears in place at full opacity (no slide), like the other sheets", async ({ page }) => {
    await seed(page, { projects: "own", reduce: true });
    await page.goto(`${BASE_URL}/project/mock-project-id`);
    await page.getByRole("switch", { name: /make project public/i }).click();
    const sheet = page.getByTestId("make-public-sheet");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    const v = await visual(sheet);
    expect(v.opacity).toBe(1);
    expect(Math.abs(v.ty)).toBeLessThan(1);
    await page.screenshot({ path: "e2e/screens/motion-make-public-reduced.png", fullPage: false });
    await page.getByTestId("make-public-backdrop").click({ position: { x: 20, y: 20 } });
    await expect(sheet).toHaveCount(0);
  });
});

test.describe("Intro before/after slider", () => {
  test.use({ reducedMotion: "no-preference" });

  test("drag moves the divider on the UI thread: no React render per move", async ({ page }) => {
    await page.goto(`${BASE_URL}/intro`);
    const slider = page.getByTestId("intro-slider");
    await expect(slider).toBeVisible({ timeout: 10000 });
    const divider = page.getByTestId("intro-slider-divider");
    const s = (await slider.boundingBox())!;
    const startX = (await divider.boundingBox())!.x;
    const rendersBefore = await page.evaluate(() => (window as any).__renderCounts?.introSlider ?? 0);
    expect(rendersBefore).toBeGreaterThan(0);

    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + s.width * 0.2, s.y + s.height / 2, { steps: 20 });
    await expect.poll(async () => (await divider.boundingBox())!.x).toBeLessThan(startX - 40);
    await page.mouse.up();

    const rendersAfter = await page.evaluate(() => (window as any).__renderCounts?.introSlider ?? 0);
    expect(rendersAfter).toBe(rendersBefore);
    // The drag stayed on the slider page (the pager did not take it)
    await expect(page.getByText("See the transformation")).toBeInViewport();
  });

  test("past the edge the divider resists (rubber band) and springs back", async ({ page }) => {
    await page.goto(`${BASE_URL}/intro`);
    const slider = page.getByTestId("intro-slider");
    await expect(slider).toBeVisible({ timeout: 10000 });
    const divider = page.getByTestId("intro-slider-divider");
    const s = (await slider.boundingBox())!;
    const imageWidth = 390 * 0.8;
    const start = (await divider.boundingBox())!.x;
    const rightEdge = start + imageWidth / 2;
    const over = 150;

    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + s.width / 2 + imageWidth / 2 + over, s.y + s.height / 2, { steps: 20 });
    await expect.poll(async () => (await divider.boundingBox())!.x).toBeGreaterThan(rightEdge + 1);
    const atMax = (await divider.boundingBox())!.x;
    expect(atMax - rightEdge).toBeLessThan(over * 0.8); // resisted, not 1:1
    await page.mouse.up();
    await expect.poll(async () => (await divider.boundingBox())!.x).toBeLessThanOrEqual(rightEdge + 0.5);
  });
});

test.describe("Generating room pulse", () => {
  test.use({ reducedMotion: "no-preference" });

  test("pulses within opacity 0.85-1 and scale 0.97-1, never fading out", async ({ page }) => {
    await seed(page);
    await page.goto(BASE_URL);
    await page.getByRole("button", { name: /start your first project/i }).first().click();
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /gallery/i }).click()]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");
    await page.getByRole("button", { name: /analyze/i }).click();
    await page.getByText("Modern", { exact: true }).click();
    await page.getByRole("button", { name: /generate 4 designs/i }).click();
    const room = page.getByTestId("generating-room");
    await expect(room).toBeVisible({ timeout: 10000 });

    const samples: { scale: number; opacity: number }[] = [];
    await expect
      .poll(async () => {
        if (!(await room.count())) return "gone";
        const v = await visual(room);
        samples.push(v);
        return v.opacity < 0.995 ? "pulsing" : "steady";
      })
      .toBe("pulsing");
    for (const v of samples) {
      expect(v.opacity).toBeGreaterThanOrEqual(0.85 - 1e-3);
      expect(v.opacity).toBeLessThanOrEqual(1);
      expect(v.scale).toBeGreaterThanOrEqual(0.97 - 1e-3);
      expect(v.scale).toBeLessThanOrEqual(1 + 1e-3);
    }
  });
});

test.describe("Haptic moments (recorded in dev mock mode; haptics are a no-op on web)", () => {
  test("XP earned and Save fire one light tap each, at the moment they happen", async ({ page }) => {
    await seed(page);
    await page.goto(BASE_URL);
    await page.getByRole("button", { name: /start your first project/i }).first().click();
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /gallery/i }).click()]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");
    await page.getByRole("button", { name: /analyze/i }).click();
    await page.getByText("Modern", { exact: true }).click();
    await page.getByRole("button", { name: /generate 4 designs/i }).click();
    await expect(page.getByTestId("result-design-card").first()).toBeVisible({ timeout: 20000 });
    const log = () => page.evaluate(() => ((window as any).__hapticsLog ?? []) as string[]);
    await expect.poll(log).toContain("xpEarned");
    expect((await log()).filter((e) => e === "saved")).toHaveLength(0);
    await page.getByTestId("result-design-card").first().click();
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByTestId("results-saved-view")).toBeVisible();
    await expect.poll(async () => (await log()).filter((e) => e === "saved").length).toBe(1);
    expect((await log()).filter((e) => e === "xpEarned")).toHaveLength(1);
  });

  test("Delete my account fires the warning once", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/profile-settings`);
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-account-confirm-confirm").click();
    await expect.poll(() => page.evaluate(() => (window as any).__hapticsLog ?? [])).toContain("deleteAccount");
    expect((await page.evaluate(() => (window as any).__hapticsLog as string[])).filter((e) => e === "deleteAccount")).toHaveLength(1);
  });
});
