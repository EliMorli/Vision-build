import { test, expect, type Page } from "@playwright/test";

/**
 * Admin side of Report/Block (App Review 1.2), against the mock data layer.
 * The database rules themselves (RLS, auto-hide trigger, audit log) are
 * covered by scripts/sql-tests/test-admin-moderation.sql.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

type Seed = { admin: boolean; reports?: "default" | "none" };

async function seed(page: Page, { admin, reports = "default" }: Seed) {
  await page.addInitScript(
    ({ admin, reports }) => {
      if (sessionStorage.getItem("__vb_seeded")) return;
      const now = Date.now();
      const ago = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem(
        "@visionbuild:mock_seed_profile",
        JSON.stringify({
          id: "viewer-1",
          email: "viewer@visionbuild.app",
          display_name: "Test Viewer",
          photo_url: null,
          created_at: ago(1),
          last_login_at: ago(1),
          xp: 0,
          level: 1,
        })
      );
      if (admin) localStorage.setItem("@visionbuild:mock_is_admin", "true");
      const base = { status: "generated", original_image_url: "mock/original.jpg", generated_image_urls: ["mock/gen1.jpg"], created_at: ago(48) };
      localStorage.setItem(
        "@visionbuild:mock_seed_projects",
        JSON.stringify([
          { ...base, id: "design-old", user_id: "owner-a", owner_name: "Avery", title: "Sunny kitchen", selected_style: "scandinavian", is_public: true },
          { ...base, id: "design-auto", user_id: "owner-b", owner_name: "Blake", title: "Dark loft", selected_style: "industrial", is_public: true, is_hidden: true },
          { ...base, id: "design-new", user_id: "owner-c", owner_name: "Casey", title: "Garden room", selected_style: "bohemian", is_public: true },
          { ...base, id: "design-c2", user_id: "owner-c", owner_name: "Casey", title: "Blue bath", selected_style: "coastal", is_public: true },
        ])
      );
      const r = (targetId: string, userId: string, reason: string, h: number, note?: string) => ({ targetType: "design", targetId, userId, reason, createdAt: ago(h), note });
      localStorage.setItem(
        "@visionbuild:reports",
        JSON.stringify(
          reports === "none"
            ? []
            : [
                r("design-old", "reporter-secret-1", "spam", 30, "Same ad posted five times"),
                r("design-old", "reporter-secret-2", "copyright", 2),
                r("design-auto", "u1", "inappropriate", 3),
                r("design-auto", "u2", "inappropriate", 2),
                r("design-auto", "u3", "misleading", 1),
                r("design-new", "u4", "quality", 1),
              ]
        )
      );
      localStorage.setItem(
        "@visionbuild:mock_moderation_log",
        JSON.stringify(
          reports === "none"
            ? []
            : [{ id: "log-0", action: "auto_hide_design", targetType: "design", targetId: "design-auto", createdAt: ago(1), byAdmin: false }]
        )
      );
      localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
      sessionStorage.setItem("__vb_seeded", "1");
    },
    { admin, reports }
  );
}

const card = (page: Page, title: string) => page.getByTestId("admin-report-card").filter({ hasText: title });

async function confirm(page: Page) {
  await expect(page.getByTestId("admin-confirm-sheet")).toBeVisible();
  await page.getByTestId("admin-confirm-sheet-confirm").click();
}

async function exploreTitles(page: Page): Promise<string[]> {
  await page.goto(`${BASE_URL}/(tabs)/explore`);
  await expect(page.getByTestId("explore-grid").or(page.getByTestId("explore-empty"))).toBeVisible({ timeout: 15000 });
  return page.getByTestId("explore-card-caption").allInnerTexts();
}

test.describe("Admin moderation queue", () => {
  test("admin sees open reports grouped by design, overdue first", async ({ page }) => {
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await expect(page.getByTestId("admin-moderation-screen")).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId("admin-report-card")).toHaveCount(3);
    await expect(page.getByTestId("admin-open-count")).toHaveText("3");
    await expect(page.getByTestId("admin-overdue-count")).toHaveText("1");

    // Overdue (oldest report past 24h) is first and flagged
    const first = page.getByTestId("admin-report-card").first();
    await expect(first.getByTestId("admin-report-title")).toHaveText("Sunny kitchen");
    await expect(first.getByTestId("admin-report-overdue")).toBeVisible();
    await expect(first.getByTestId("admin-report-count")).toHaveText("2 people reported");
    await expect(first.getByTestId("admin-report-reason")).toHaveText(["Copyright", "Spam"]);
    await expect(first.getByTestId("admin-report-thumbnail")).toBeVisible();
    // Every card shows its age: m/d once past a day, hours or minutes otherwise
    await expect(first.getByTestId("admin-report-age")).toHaveText(/^Reported \d{1,2}\/\d{1,2}$/);
    await expect(card(page, "Dark loft").getByTestId("admin-report-age")).toHaveText(/^Reported \d+h ago$/);
    await expect(card(page, "Garden room").getByTestId("admin-report-age")).toHaveText(/^Reported (\d+m|\d+h) ago$/);

    // Auto-hidden design shows it is pending review
    const auto = card(page, "Dark loft");
    await expect(auto.getByTestId("admin-report-auto-hidden")).toBeVisible();
    await expect(auto.getByTestId("admin-report-count")).toHaveText("3 people reported");
    // Auto-hidden cards offer Keep hidden / Restore instead of Hide / Dismiss
    await expect(auto.getByTestId("admin-keep-hidden-button")).toBeVisible();
    await expect(auto.getByTestId("admin-restore-button")).toBeVisible();
    await expect(auto.getByTestId("admin-hide-button")).toHaveCount(0);
    await expect(auto.getByTestId("admin-dismiss-button")).toHaveCount(0);
    await expect(first.getByTestId("admin-keep-hidden-button")).toHaveCount(0);
    await expect(card(page, "Garden room").getByTestId("admin-report-overdue")).toHaveCount(0);

    await expect(page.getByTestId("admin-log-row")).toHaveText([/Hidden automatically\s*Automatic/]);
    await page.screenshot({ path: "e2e/screens/admin-queue.png", fullPage: true });
  });

  test("hide design unpublishes it right away, logs it and removes it from Explore", async ({ page }) => {
    await page.clock.install();
    await seed(page, { admin: true });
    expect(await exploreTitles(page)).toEqual(expect.arrayContaining([expect.stringContaining("Sunny kitchen")]));

    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Sunny kitchen").getByTestId("admin-hide-button").click();
    await expect(page.getByTestId("admin-confirm-sheet")).toHaveCount(0);

    await expect(page.getByTestId("admin-notice")).toContainText("Design hidden");
    await expect(page.getByTestId("admin-undo-button")).toBeVisible();
    await expect(card(page, "Sunny kitchen")).toHaveCount(0);
    await expect(page.getByTestId("admin-open-count")).toHaveText("2");
    await expect(page.getByTestId("admin-overdue-count")).toHaveText("0");
    await expect(page.getByTestId("admin-log-row").first()).toContainText("Design hidden");
    await expect(page.getByTestId("admin-log-row").first()).toContainText("Moderator");
    await page.screenshot({ path: "e2e/screens/admin-after-hide.png", fullPage: true });

    // Fake clock: the Undo button goes away once the 5s window has passed
    await page.clock.fastForward(5000);
    await expect(page.getByTestId("admin-undo-button")).toHaveCount(0);
    await expect(page.getByTestId("admin-notice")).toContainText("Design hidden");

    const titles = await exploreTitles(page);
    expect(titles.join("|")).not.toContain("Sunny kitchen");
    expect(titles.join("|")).toContain("Garden room");

    const reports = await page.evaluate(() => JSON.parse(localStorage.getItem("@visionbuild:reports") || "[]"));
    expect(reports.filter((r: any) => r.targetId === "design-old").map((r: any) => r.status)).toEqual(["actioned", "actioned"]);
  });

  test("undo right after hide restores the design and puts its reports back", async ({ page }) => {
    await page.clock.install();
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Sunny kitchen").getByTestId("admin-hide-button").click();
    await expect(page.getByTestId("admin-undo-button")).toBeVisible();
    await page.getByTestId("admin-undo-button").click();

    await expect(page.getByTestId("admin-notice")).toContainText("Hide undone");
    await expect(page.getByTestId("admin-undo-button")).toHaveCount(0);
    await expect(card(page, "Sunny kitchen")).toHaveCount(1);
    await expect(card(page, "Sunny kitchen").getByTestId("admin-report-count")).toHaveText("2 people reported");
    await expect(page.getByTestId("admin-log-row").first()).toContainText("Design restored");
    await expect(page.getByTestId("admin-log-row").nth(1)).toContainText("Design hidden");

    expect((await exploreTitles(page)).join("|")).toContain("Sunny kitchen");
    const log = await page.evaluate(() => JSON.parse(localStorage.getItem("@visionbuild:mock_moderation_log") || "[]"));
    expect(log[0]).toMatchObject({ action: "restore_design", targetId: "design-old", details: { undo: true, republished: true } });
  });

  test("Keep hidden closes the reports and the design stays off Explore", async ({ page }) => {
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Dark loft").getByTestId("admin-keep-hidden-button").click();
    await expect(page.getByTestId("admin-notice")).toContainText("Kept hidden");
    await expect(card(page, "Dark loft")).toHaveCount(0);
    await expect(page.getByTestId("admin-log-row").first()).toContainText("Kept hidden");
    await page.screenshot({ path: "e2e/screens/admin-after-keep-hidden.png", fullPage: false });

    expect((await exploreTitles(page)).join("|")).not.toContain("Dark loft");
    const reports = await page.evaluate(() => JSON.parse(localStorage.getItem("@visionbuild:reports") || "[]"));
    expect(reports.filter((r: any) => r.targetId === "design-auto").every((r: any) => r.status === "actioned")).toBe(true);
  });

  test("Restore on an auto-hidden design puts it back on Explore and dismisses its reports", async ({ page }) => {
    await seed(page, { admin: true });
    expect((await exploreTitles(page)).join("|")).not.toContain("Dark loft");

    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Dark loft").getByTestId("admin-restore-button").click();
    await expect(page.getByTestId("admin-notice")).toContainText("Design restored");
    await expect(page.getByTestId("admin-undo-button")).toHaveCount(0);
    await expect(card(page, "Dark loft")).toHaveCount(0);
    await expect(page.getByTestId("admin-log-row").first()).toContainText("Design restored");

    expect((await exploreTitles(page)).join("|")).toContain("Dark loft");
    const reports = await page.evaluate(() => JSON.parse(localStorage.getItem("@visionbuild:reports") || "[]"));
    expect(reports.filter((r: any) => r.targetId === "design-auto").every((r: any) => r.status === "dismissed")).toBe(true);
  });

  test("Dismiss on a visible design keeps it on Explore", async ({ page }) => {
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Garden room").getByTestId("admin-dismiss-button").click();
    await expect(page.getByTestId("admin-notice")).toContainText("Reports dismissed");
    await expect(card(page, "Garden room")).toHaveCount(0);
    await expect(page.getByTestId("admin-log-row").first()).toContainText("Reports dismissed");
    expect((await exploreTitles(page)).join("|")).toContain("Garden room");
  });

  test("ban from publishing takes all of the owner's designs off Explore", async ({ page }) => {
    await seed(page, { admin: true });
    const before = (await exploreTitles(page)).join("|");
    expect(before).toContain("Garden room");
    expect(before).toContain("Blue bath");

    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Garden room").getByTestId("admin-ban-button").click();
    await expect(page.getByTestId("admin-confirm-sheet")).toContainText("Ban Casey from publishing?");
    await expect(page.getByTestId("admin-confirm-sheet")).toContainText("2 public designs will go private.");
    await confirm(page);
    await expect(page.getByTestId("admin-notice")).toContainText("Owner banned from publishing");
    await expect(card(page, "Garden room")).toHaveCount(0);
    await expect(page.getByTestId("admin-log-row").first()).toContainText("Banned from publishing");

    const after = (await exploreTitles(page)).join("|");
    expect(after).not.toContain("Garden room");
    expect(after).not.toContain("Blue bath");
    expect(after).toContain("Sunny kitchen");
  });

  test("each ban popup names the tapped card's owner and their real public count", async ({ page }) => {
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await expect(page.getByTestId("admin-report-card")).toHaveCount(3);
    const sheet = page.getByTestId("admin-confirm-sheet");

    const cases: [string, string, string][] = [
      ["Sunny kitchen", "Ban Avery from publishing?", "1 public design will go private."],
      ["Garden room", "Ban Casey from publishing?", "2 public designs will go private."],
      ["Dark loft", "Ban Blake from publishing?", "1 public design will go private."],
      ["Sunny kitchen", "Ban Avery from publishing?", "1 public design will go private."],
    ];
    for (const [title, heading, count] of cases) {
      await card(page, title).getByTestId("admin-ban-button").click();
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText(heading);
      await expect(sheet).toContainText(count);
      if (title === "Sunny kitchen" && heading.includes("Avery")) {
        // Contact-sheet shot: the tapped card is the first one, at the top of
        // the screen, so its owner line is visible right above the popup.
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(card(page, "Sunny kitchen").getByTestId("admin-report-title")).toBeInViewport();
        await page.screenshot({ path: "e2e/screens/admin-confirm-ban.png", fullPage: false });
      }
      for (const [, other] of cases.filter(([, h]) => h !== heading)) {
        await expect(sheet).not.toContainText(other);
      }
      await page.getByTestId("admin-confirm-sheet-cancel").click();
      await expect(sheet).toHaveCount(0);
    }
    // Cancelling changed nothing
    await expect(page.getByTestId("admin-report-card")).toHaveCount(3);
    expect(await page.evaluate(() => localStorage.getItem("@visionbuild:mock_banned_users"))).toBeNull();
  });

  test("detail screen Hide returns to the queue with the note and a working Undo", async ({ page }) => {
    await page.clock.install();
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Sunny kitchen").getByTestId("admin-report-open").click();
    await expect(page.getByTestId("admin-detail-screen")).toBeVisible({ timeout: 15000 });
    const actions = page.getByTestId("admin-detail-actions");
    await expect(actions.getByTestId("admin-hide-button")).toBeVisible();
    await expect(actions.getByTestId("admin-dismiss-button")).toBeVisible();
    await expect(actions.getByTestId("admin-keep-hidden-button")).toHaveCount(0);
    await actions.getByTestId("admin-hide-button").click();

    await expect(page.getByTestId("admin-moderation-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("admin-notice")).toContainText("Design hidden");
    await expect(card(page, "Sunny kitchen")).toHaveCount(0);
    await page.getByTestId("admin-undo-button").click();
    await expect(page.getByTestId("admin-notice")).toContainText("Hide undone");
    await expect(card(page, "Sunny kitchen")).toHaveCount(1);
  });

  test("detail screen on an auto-hidden design offers Keep hidden / Restore and returns to the queue", async ({ page }) => {
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Dark loft").getByTestId("admin-report-open").click();
    const actions = page.getByTestId("admin-detail-actions");
    await expect(actions.getByTestId("admin-keep-hidden-button")).toBeVisible({ timeout: 15000 });
    await expect(actions.getByTestId("admin-hide-button")).toHaveCount(0);
    await page.screenshot({ path: "e2e/screens/admin-detail-auto-hidden.png", fullPage: true });
    await actions.getByTestId("admin-restore-button").click();

    await expect(page.getByTestId("admin-moderation-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("admin-notice")).toContainText("Design restored");
    await expect(page.getByTestId("admin-undo-button")).toHaveCount(0);
    await expect(card(page, "Dark loft")).toHaveCount(0);
  });

  test("detail screen ban uses the same popup for that owner and returns to the queue", async ({ page }) => {
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Garden room").getByTestId("admin-report-open").click();
    await page.getByTestId("admin-detail-actions").getByTestId("admin-ban-button").click();
    const sheet = page.getByTestId("admin-confirm-sheet");
    await expect(sheet).toContainText("Ban Casey from publishing?");
    await expect(sheet).toContainText("2 public designs will go private.");
    await page.getByTestId("admin-confirm-sheet-confirm").click();

    await expect(page.getByTestId("admin-moderation-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("admin-notice")).toContainText("Owner banned from publishing");
    await expect(card(page, "Garden room")).toHaveCount(0);
  });

  test("report form: optional 200-character note; submits with and without it; note shows in detail", async ({ page }) => {
    await seed(page, { admin: true });
    const report = async (title: string, reason: string, note?: string) => {
      await page.goto(`${BASE_URL}/(tabs)/explore`);
      await page.getByTestId("explore-design-card").filter({ hasText: title }).getByTestId("explore-report-button").click();
      await page.getByTestId("menu-report-option").click();
      await page.getByTestId("report-confirm-sheet-confirm").click();
      const input = page.getByTestId("report-note-input");
      await expect(input).toHaveAttribute("placeholder", "Add details (optional)");
      await page.getByText(reason).click();
      if (note !== undefined) {
        await input.fill("x".repeat(250));
        await expect(input).toHaveValue("x".repeat(200));
        await expect(page.getByTestId("report-note-count")).toHaveText("200/200");
        await input.fill(note);
      }
      await page.getByRole("button", { name: /Submit Report/i }).click();
      await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 5000 });
    };

    // With a note, on a reason other than "Something else"
    await report("Garden room", "Spam or advertising", "Watermark in the corner");
    // Without a note
    await report("Blue bath", "Poor quality or broken");

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("@visionbuild:reports") || "[]"));
    expect(stored.find((r: any) => r.targetId === "design-new" && r.reason === "spam")).toMatchObject({ note: "Watermark in the corner" });
    expect(stored.find((r: any) => r.targetId === "design-c2").note).toBeUndefined();

    await page.goto(`${BASE_URL}/admin/design/design-new`);
    await expect(page.getByTestId("admin-detail-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("admin-detail-note")).toHaveText("“Watermark in the corner”");

    await page.goto(`${BASE_URL}/admin/design/design-c2`);
    await expect(page.getByTestId("admin-detail-report")).toHaveCount(1, { timeout: 15000 });
    await expect(page.getByTestId("admin-detail-note")).toHaveCount(0);
    await expect(page.getByTestId("admin-detail-report")).toContainText("No note");
  });

  test("a third distinct report hides a design from Explore pending review", async ({ page }) => {
    await seed(page, { admin: false, reports: "none" });
    await page.addInitScript(() => {
      if (sessionStorage.getItem("__vb_seeded_reports")) return;
      const at = new Date().toISOString();
      localStorage.setItem(
        "@visionbuild:reports",
        JSON.stringify([
          { targetType: "design", targetId: "design-new", userId: "u1", reason: "spam", createdAt: at },
          { targetType: "design", targetId: "design-new", userId: "u2", reason: "spam", createdAt: at },
        ])
      );
      sessionStorage.setItem("__vb_seeded_reports", "1");
    });
    expect((await exploreTitles(page)).join("|")).toContain("Garden room");

    await page.getByTestId("explore-design-card").filter({ hasText: "Garden room" }).getByTestId("explore-report-button").click();
    await page.getByTestId("menu-report-option").click();
    await page.getByTestId("report-confirm-sheet-confirm").click();
    await page.getByText("Spam or advertising").click();
    await page.getByRole("button", { name: /Submit Report/i }).click();
    await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 5000 });

    const titles = (await exploreTitles(page)).join("|");
    expect(titles).not.toContain("Garden room");
    expect(titles).toContain("Blue bath");
    const log = await page.evaluate(() => JSON.parse(localStorage.getItem("@visionbuild:mock_moderation_log") || "[]"));
    expect(log[0]).toMatchObject({ action: "auto_hide_design", targetId: "design-new", byAdmin: false });
  });

  test("tapping a card opens the design with its reasons and notes, never who reported", async ({ page }) => {
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await card(page, "Sunny kitchen").getByTestId("admin-report-open").click();

    await expect(page.getByTestId("admin-detail-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("admin-detail-title")).toHaveText("Sunny kitchen");
    await expect(page.getByTestId("admin-detail-image")).toBeVisible();
    await expect(page.getByTestId("admin-detail-report")).toHaveCount(2);
    await expect(page.getByTestId("admin-detail-note")).toHaveText("“Same ad posted five times”");
    await expect(page.getByTestId("admin-detail-report").first()).toContainText("Copyright");
    await expect(page.getByTestId("admin-detail-report").first()).toContainText("No note");
    await expect(page.getByTestId("admin-detail-screen")).not.toContainText("reporter-secret");
    await page.screenshot({ path: "e2e/screens/admin-detail.png", fullPage: true });
  });

  test("empty queue shows a clear empty state", async ({ page }) => {
    await seed(page, { admin: true, reports: "none" });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await expect(page.getByTestId("admin-queue-empty")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("admin-open-count")).toHaveText("0");
    await page.screenshot({ path: "e2e/screens/admin-empty.png", fullPage: false });
  });

  test("admins get a Moderation row in Settings that opens the queue", async ({ page }) => {
    await seed(page, { admin: true });
    await page.goto(`${BASE_URL}/profile-settings`);
    await expect(page.getByTestId("settings-moderation-link")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("settings-moderation-link").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "e2e/screens/admin-settings-entry.png", fullPage: false });
    await page.getByTestId("settings-moderation-link").click();
    await expect(page.getByTestId("admin-moderation-screen")).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Admin moderation for non-admins", () => {
  test("non-admin has no Settings entry", async ({ page }) => {
    await seed(page, { admin: false });
    await page.goto(`${BASE_URL}/profile-settings`);
    await expect(page.getByTestId("settings-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("settings-about")).toBeVisible();
    await expect(page.getByTestId("settings-moderation-section")).toHaveCount(0);
  });

  test("non-admin opening the route directly is denied and sees no reports", async ({ page }) => {
    await seed(page, { admin: false });
    await page.goto(`${BASE_URL}/admin/moderation`);
    await expect(page.getByTestId("admin-denied")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Moderators only")).toBeVisible();
    await expect(page.getByTestId("admin-report-card")).toHaveCount(0);
    await expect(page.getByTestId("admin-moderation-screen")).toHaveCount(0);
    await expect(page.getByText("Sunny kitchen")).toHaveCount(0);
    await page.screenshot({ path: "e2e/screens/admin-denied.png", fullPage: false });

    // The detail route is denied too
    await page.goto(`${BASE_URL}/admin/design/design-old`);
    await expect(page.getByTestId("admin-denied")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("admin-detail-screen")).toHaveCount(0);
    await expect(page.getByText("Same ad posted five times")).toHaveCount(0);

    // Nothing changed
    const reports = await page.evaluate(() => JSON.parse(localStorage.getItem("@visionbuild:reports") || "[]"));
    expect(reports.every((r: any) => !r.status)).toBe(true);
  });
});
