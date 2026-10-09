import { test, expect, type Page } from "@playwright/test";

/**
 * Bottom tab bar everywhere, like Instagram (Elimar's iPhone testing).
 *
 * Each tab (Home, Explore, Vi, Profile) keeps its own stack. In-app detail
 * screens open inside the tab you came from, so the tab bar stays visible and
 * that tab stays highlighted. The bar is hidden only on immersive or blocking
 * screens: the create flow (camera, style picker, generating), the full-screen
 * before/after viewer, AI consent, and onboarding/sign-in.
 *
 * No wall-clock timing assertions: every check waits on visible state.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:19006";
const TABS = ["home", "explore", "vi", "profile"] as const;
type Tab = (typeof TABS)[number];

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

async function seed(page: Page, opts: { consent?: boolean; brief?: boolean } = {}) {
  const { consent = true, brief = false } = opts;
  await page.addInitScript(({ consent, brief }) => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:mock_session", "true");
    if (consent) {
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    }
    const base = {
      status: "generated",
      room_analysis: { roomType: "living_room" },
      original_image_url: "mock/original.jpg",
      generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg", "mock/gen3.jpg", "mock/gen4.jpg"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([
      {
        ...base, id: "mock-project-id", user_id: "mock-user", title: "Modern living room", selected_style: "modern", is_public: false,
        ...(brief ? { lead_info: { projectBrief: "Open up the living room with warm wood and soft light." } } : {}),
      },
      { ...base, id: "p-public", user_id: "u2", title: "Farmhouse kitchen", selected_style: "farmhouse", is_public: true },
    ]));
    localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
  }, { consent, brief });
}

/** The tab bar is on screen, every tab is visible, and `active` is the selected one. */
async function expectTabBar(page: Page, active: Tab) {
  for (const t of TABS) {
    const tab = page.getByTestId(`tab-${t}`);
    await expect(tab).toBeVisible();
    await expect(tab).toHaveAttribute("aria-selected", t === active ? "true" : "false");
  }
  await expect(page.getByTestId("tab-create")).toBeVisible();
  await expectTabBarTappable(page, true);
}

async function expectNoTabBar(page: Page) {
  for (const t of TABS) await expect(page.getByTestId(`tab-${t}`)).toBeHidden();
  await expect(page.getByTestId("tab-create")).toBeHidden();
}

/** Whether a tap in the middle of the Home tab would land on the tab (nothing covers it). */
async function tabBarTappable(page: Page): Promise<boolean> {
  const tab = page.getByTestId("tab-home");
  if (!(await tab.isVisible())) return false;
  const box = (await tab.boundingBox())!;
  return page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return !!el && !!el.closest('[data-testid="tab-home"]');
  }, [box.x + box.width / 2, box.y + box.height / 2]);
}

async function expectTabBarTappable(page: Page, tappable: boolean) {
  await expect.poll(() => tabBarTappable(page)).toBe(tappable);
}

/** The screen's back control: our "Go back" arrow, or the header's "<previous>, back". */
async function goBack(page: Page) {
  const back = page.getByRole("button", { name: /back/i }).or(page.getByRole("link", { name: /, back$/ }));
  await back.filter({ visible: true }).last().click();
}

async function openHomeProject(page: Page) {
  await page.goto(BASE_URL);
  await page.getByTestId("home-project-card").first().click();
  await expect(page.getByTestId("project-screen")).toBeVisible({ timeout: 15000 });
}

test.describe("Tab bar on every in-app screen", () => {
  test("detail screens open inside the tab with the tab bar visible", async ({ page }) => {
    await seed(page, { brief: true });

    // Home → project → results
    await openHomeProject(page);
    await expectTabBar(page, "home");
    await page.screenshot({ path: "e2e/screens/ui-nav-project.png", fullPage: false });

    await page.getByTestId("design-card").first().click();
    await expect(page.getByTestId("results-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "home");
    await page.screenshot({ path: "e2e/screens/ui-nav-results.png", fullPage: false });
    await goBack(page);

    // Project → Vi as a screen (back arrow) and → pros coming soon
    await page.getByRole("button", { name: "Chat with Vi about this room" }).click();
    await expect(page.getByTestId("vi-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "home");
    await page.screenshot({ path: "e2e/screens/ui-nav-vi-screen.png", fullPage: false });
    await goBack(page);
    await page.getByTestId("project-brief-waitlist").click();
    await expect(page.getByTestId("pros-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "home");

    // Profile → settings → edit profile / help & contact
    await page.getByTestId("tab-profile").click();
    await expect(page.getByTestId("profile-projects-section")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "profile");
    await page.getByTestId("profile-settings-button").click();
    await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("settings-about")).toBeVisible();
    await expectTabBar(page, "profile");
    await page.screenshot({ path: "e2e/screens/ui-nav-settings.png", fullPage: false });
    await goBack(page);
    await page.getByRole("button", { name: /Edit Profile/ }).click();
    await expect(page.getByTestId("edit-profile-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "profile");
    await goBack(page);
    await page.getByRole("button", { name: /Help & contact/ }).click();
    await expect(page.getByTestId("help-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "profile");
    await page.screenshot({ path: "e2e/screens/ui-nav-help.png", fullPage: false });

    // Vi tab
    await page.getByTestId("tab-vi").click();
    await expect(page.getByTestId("vi-tab-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "vi");
    await page.screenshot({ path: "e2e/screens/ui-nav-vi-tab.png", fullPage: false });

    // Explore → a design's detail page
    await page.getByTestId("tab-explore").click();
    await page.getByTestId("explore-design-open").first().click();
    await expect(page.getByTestId("explore-detail-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("explore-detail-title")).toHaveText("Farmhouse kitchen");
    await expect(page.getByTestId("explore-detail-ai-badge")).toBeVisible();
    await expectTabBar(page, "explore");
    await page.screenshot({ path: "e2e/screens/ui-nav-explore-detail.png", fullPage: false });
    await goBack(page);
    await expect(page.getByTestId("explore-grid")).toBeVisible();
    await expectTabBar(page, "explore");
  });

  test("old paths still open, now inside the tabs", async ({ page }) => {
    await seed(page);
    const cases: { path: string; screen: string; tab: Tab }[] = [
      { path: "/project/mock-project-id", screen: "project-screen", tab: "home" },
      { path: "/result/mock-project-id", screen: "results-screen", tab: "home" },
      { path: "/profile-settings", screen: "settings-screen", tab: "home" },
      { path: "/settings", screen: "settings-screen", tab: "home" },
      { path: "/help-contact", screen: "help-screen", tab: "home" },
      { path: "/pros-coming-soon", screen: "pros-screen", tab: "home" },
      { path: "/assistant-chat", screen: "vi-screen", tab: "home" },
      { path: "/explore/p-public", screen: "explore-detail-screen", tab: "explore" },
      { path: "/vi", screen: "vi-tab-screen", tab: "vi" },
      { path: "/profile", screen: "profile-projects-section", tab: "profile" },
    ];
    for (const c of cases) {
      await page.goto(`${BASE_URL}${c.path}`);
      await expect(page.getByTestId(c.screen), c.path).toBeVisible({ timeout: 15000 });
      await expectTabBar(page, c.tab);
    }
    // A cold link still has a way back to the tab's root
    await page.goto(`${BASE_URL}/project/mock-project-id`);
    await expect(page.getByTestId("project-screen")).toBeVisible({ timeout: 15000 });
    await goBack(page);
    await expect(page.getByTestId("home-screen")).toBeVisible();
    // Expo Router copies the detail's params onto the tab root it inserts
    // underneath (e.g. "/?id=…"), so check the path only.
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  });
});

test.describe("Tab bar hidden on immersive and blocking screens", () => {
  test("create flow: camera, style picker, generating", async ({ page }) => {
    await seed(page);
    await page.goto(BASE_URL);
    await expectTabBar(page, "home");
    await page.getByTestId("home-start-new-room").click();
    await expect(page.getByTestId("camera-screen")).toBeVisible({ timeout: 10000 });
    await expectNoTabBar(page);
    await page.screenshot({ path: "e2e/screens/ui-nav-camera-no-tabs.png", fullPage: false });

    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");
    await page.getByRole("button", { name: /analyze room/i }).click();
    await expect(page.getByTestId("style-picker-header")).toBeVisible({ timeout: 10000 });
    await expectNoTabBar(page);

    // Generating, opened straight (it stays on the progress screen)
    await page.goto(`${BASE_URL}/generating/mock-project-id`);
    await expect(page.getByTestId("generating-screen")).toBeVisible({ timeout: 10000 });
    await expectNoTabBar(page);
    await page.screenshot({ path: "e2e/screens/ui-nav-generating-no-tabs.png", fullPage: false });
  });

  test("before/after viewer covers the tab bar; + opens the create flow without it", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/result/mock-project-id`);
    const card = page.getByTestId("result-design-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await expectTabBar(page, "home");
    await card.click({ delay: 900 }); // long-press opens the comparison
    await expect(page.getByTestId("detail-ai-badge")).toBeVisible({ timeout: 5000 });
    // Full-screen viewer: the tab bar underneath can't be reached
    await expectTabBarTappable(page, false);
    await page.screenshot({ path: "e2e/screens/ui-nav-viewer-no-tabs.png", fullPage: false });
    await page.getByRole("button", { name: /before and after comparison/i }).click();
    await expect(page.getByTestId("detail-ai-badge")).toHaveCount(0);
    await expectTabBarTappable(page, true);

    await page.getByTestId("tab-create").click();
    await expect(page.getByText("Start your project")).toBeVisible({ timeout: 10000 });
    await expectNoTabBar(page);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("results-screen")).toBeVisible();
    await expectTabBar(page, "home");
  });

  test("onboarding, sign-in and AI consent show no tab bar", async ({ page }) => {
    await page.goto(`${BASE_URL}/intro`);
    await expect(page.getByText("See the transformation")).toBeVisible({ timeout: 15000 });
    await expectNoTabBar(page);

    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_signed_out", "true");
    });
    await page.goto(`${BASE_URL}/sign-in`);
    await expect(page.getByTestId("sign-in-screen")).toBeVisible({ timeout: 15000 });
    await expectNoTabBar(page);

    await page.evaluate(() => localStorage.removeItem("@visionbuild:mock_signed_out"));
    await page.addInitScript(() => localStorage.removeItem("@visionbuild:mock_signed_out"));
    await page.goto(`${BASE_URL}/ai-consent`);
    await expect(page.getByTestId("consent-provider-disclosure")).toBeVisible({ timeout: 15000 });
    await expectNoTabBar(page);
  });
});

test.describe("Per-tab stacks", () => {
  test("tapping the active tab pops back to that tab's root", async ({ page }) => {
    await seed(page);
    await openHomeProject(page);
    await page.getByTestId("design-card").first().click();
    await expect(page.getByTestId("results-screen")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("results-screen")).toBeHidden();
    await expect(page).toHaveURL(/localhost:\d+\/?$/);
    await expectTabBar(page, "home");

    await page.getByTestId("tab-profile").click();
    await page.getByTestId("profile-settings-button").click();
    await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("tab-profile").click();
    await expect(page.getByTestId("profile-projects-section")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("settings-screen")).toBeHidden();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test("switching tabs keeps each tab's place", async ({ page }) => {
    await seed(page);
    await openHomeProject(page);
    await page.getByTestId("tab-profile").click();
    await page.getByTestId("profile-settings-button").click();
    await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("project-screen")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/project\/mock-project-id/);
    await expectTabBar(page, "home");

    await page.getByTestId("tab-profile").click();
    await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "profile");

    // Back still works inside each tab
    await goBack(page);
    await expect(page.getByTestId("profile-projects-section")).toBeVisible();
    await page.getByTestId("tab-home").click();
    await goBack(page);
    await expect(page.getByTestId("home-screen")).toBeVisible();
  });

  test("the same project keeps the tab it was opened from", async ({ page }) => {
    await seed(page);
    // From Home: Home stays highlighted, back returns Home
    await openHomeProject(page);
    await expectTabBar(page, "home");
    await goBack(page);
    await expect(page.getByTestId("home-screen")).toBeVisible();

    // From Profile: Profile stays highlighted, back returns to Profile
    await page.getByTestId("tab-profile").click();
    const row = page.getByTestId("profile-project-row").filter({ hasText: "Modern living room" });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();
    await expect(page.getByTestId("project-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "profile");
    await page.screenshot({ path: "e2e/screens/ui-nav-project-from-profile.png", fullPage: false });
    await page.getByTestId("design-card").first().click();
    await expect(page.getByTestId("results-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "profile");
    await goBack(page);
    await goBack(page);
    await expect(page.getByTestId("profile-projects-section")).toBeVisible();
    await expectTabBar(page, "profile");
    // Home's stack was not touched
    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("home-screen")).toBeVisible();
  });
});

test.describe("Save on Results: no dead end", () => {
  test("create → save shows 'Saved to your project'; View opens the project with the tab bar", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
    await page.goto(BASE_URL);
    await expect(page.getByText("No projects yet")).toBeVisible({ timeout: 15000 });

    // The + button starts the create flow
    await page.getByTestId("tab-create").click();
    await page.getByText("Snap a photo").click();
    await page.getByText("Interior", { exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByTestId("camera-screen")).toBeVisible({ timeout: 10000 });
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");
    await page.getByRole("button", { name: /analyze room/i }).click();
    await expect(page.getByTestId("style-picker-header")).toBeVisible({ timeout: 10000 });
    await page.getByText("Modern", { exact: true }).click();
    await page.getByRole("button", { name: /generate 4 designs/i }).click();
    await expect(page.getByTestId("generating-screen")).toBeVisible({ timeout: 10000 });
    await expectNoTabBar(page);

    // Results open inside Home with the tab bar
    await expect(page.getByTestId("results-screen")).toBeVisible({ timeout: 30000 });
    await expectTabBar(page, "home");
    await expect(page.getByTestId("results-saved-confirmation")).toHaveCount(0);
    await page.getByText("Option 1").click();
    await page.getByTestId("results-save").click();

    const saved = page.getByTestId("results-saved-confirmation");
    await expect(saved).toBeVisible({ timeout: 10000 });
    await expect(saved).toContainText("Saved to your project");
    await expect(page.getByTestId("results-save")).toBeDisabled();
    await expectTabBar(page, "home");
    await page.screenshot({ path: "e2e/screens/ui-nav-results-saved.png", fullPage: false });

    const view = page.getByTestId("results-saved-view");
    await expect(view).toHaveAttribute("aria-label", "View your project");
    await view.click();
    await expect(page.getByTestId("project-screen")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/project\/mock-project-/);
    await expectTabBar(page, "home");
    // The saved design is the project's favorite
    await expect(page.getByTestId("design-card").first()).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-nav-saved-project.png", fullPage: false });

    // Back from the project goes Home, not back into Results
    await goBack(page);
    await expect(page.getByTestId("home-screen")).toBeVisible();
    await expect(page.getByTestId("home-project-card")).toHaveCount(1);
  });

  test("project → results → save → View returns to the same project page", async ({ page }) => {
    await seed(page);
    await openHomeProject(page);
    await page.getByTestId("design-card").first().click();
    await expect(page.getByTestId("results-screen")).toBeVisible({ timeout: 10000 });
    await page.getByText("Option 2").click();
    await page.getByTestId("results-save").click();
    await page.getByTestId("results-saved-view").click();
    await expect(page.getByTestId("project-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "home");
    // Only one project page in the stack: one back goes Home
    await goBack(page);
    await expect(page.getByTestId("home-screen")).toBeVisible();
  });
});

test.describe("Compliance gates in the new structure", () => {
  const viEntries: { name: string; open: (page: Page) => Promise<void> }[] = [
    { name: "Vi tab from Home", open: async (page) => { await page.goto(BASE_URL); await page.getByTestId("tab-vi").click(); } },
    {
      name: "Vi tab from a project page",
      open: async (page) => { await openHomeProject(page); await page.getByTestId("tab-vi").click(); },
    },
    {
      name: "Vi tab from Settings",
      open: async (page) => {
        await page.goto(`${BASE_URL}/profile`);
        await page.getByTestId("profile-settings-button").click();
        await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 10000 });
        await page.getByTestId("tab-vi").click();
      },
    },
    {
      name: "Vi tab from an Explore design",
      open: async (page) => {
        await page.goto(`${BASE_URL}/explore`);
        await page.getByTestId("explore-design-open").first().click();
        await expect(page.getByTestId("explore-detail-screen")).toBeVisible({ timeout: 10000 });
        await page.getByTestId("tab-vi").click();
      },
    },
    {
      name: "Chat with Vi on a project",
      open: async (page) => { await openHomeProject(page); await page.getByRole("button", { name: "Chat with Vi about this room" }).click(); },
    },
    {
      name: "Brainstorm with Vi from +",
      open: async (page) => { await page.goto(BASE_URL); await page.getByTestId("tab-create").click(); await page.getByTestId("create-choice-vi").click(); },
    },
  ];

  test("Vi from any page without AI consent shows the consent screen first", async ({ page }) => {
    await seed(page, { consent: false });
    for (const entry of viEntries) {
      await entry.open(page);
      await expect(page.getByTestId("consent-provider-disclosure"), entry.name).toBeVisible({ timeout: 10000 });
      // Blocking: no chat and no tab bar to skip past it
      await expect(page.getByTestId("vi-input"), entry.name).toHaveCount(0);
      await expectNoTabBar(page);
    }
    await page.screenshot({ path: "e2e/screens/ui-nav-vi-consent.png", fullPage: false });

    // Accepting lands in Vi, still inside the tabs
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByTestId("vi-tab-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("vi-input")).toBeVisible();
    await expectTabBar(page, "vi");
  });

  test("delete-account confirmation can't be bypassed through the tab bar", async ({ page }) => {
    await seed(page);
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_seed_profile", JSON.stringify({
        id: "test-user-123", email: "test@visionbuild.app", display_name: "Test User", photo_url: null,
        created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), xp: 0, level: 1,
      }));
    });
    await page.goto(`${BASE_URL}/profile`);
    await page.getByTestId("profile-settings-button").click();
    await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 10000 });
    await expectTabBar(page, "profile");

    await page.getByTestId("delete-account-button").click();
    const sheet = page.getByTestId("delete-account-confirm");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    // The sheet is modal: the tab bar behind it can't be tapped
    await expectTabBarTappable(page, false);
    await expect(page.getByTestId("tab-home").click({ timeout: 1500 })).rejects.toThrow();
    await expect(sheet).toBeVisible();

    // Even a forced tab switch (e.g. assistive tech) closes the sheet without deleting
    await page.getByTestId("tab-home").dispatchEvent("click");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10000 });
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("delete-account-confirm-confirm")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__VB_MOCK_DELETE_CALLS__ || [])).toHaveLength(0);

    // Back in Profile: still signed in, settings intact, nothing pending
    await page.getByTestId("tab-profile").click();
    await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 10000 });
    await expect(sheet).toBeHidden();
    expect(await page.evaluate(() => (window as any).__VB_MOCK_DELETE_CALLS__ || [])).toHaveLength(0);

    // The confirmation itself still works exactly as before
    await page.getByTestId("delete-account-button").click();
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await page.getByTestId("delete-account-confirm-confirm").click();
    await expect(page.getByTestId("deleted-account-view")).toBeVisible({ timeout: 10000 });
    expect(await page.evaluate(() => (window as any).__VB_MOCK_DELETE_CALLS__ || [])).toHaveLength(1);
    await expectNoTabBar(page);
  });
});
