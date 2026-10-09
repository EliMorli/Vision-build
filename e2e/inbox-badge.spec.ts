import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("Inbox hidden while the outreach flag is off (launch default)", () => {
  test("no Inbox tab, and /inbox redirects Home", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      localStorage.setItem("@visionbuild:mock_seed_inbox", JSON.stringify([{ id: "1", is_read: false }]));
    });
    await page.goto(BASE_URL);
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("tab", { name: /home/i }).first()).toBeVisible();
    await expect(page.locator('[href="/inbox"]')).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /inbox/i })).toHaveCount(0);

    await page.goto(`${BASE_URL}/inbox`);
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("inbox-empty")).toHaveCount(0);
    await page.screenshot({ path: "e2e/screens/ui-tabs-no-inbox.png", fullPage: false });
  });
});

test.describe("Inbox Badge (outreach flag on)", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_outreach_enabled", "true");
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
  });

  test("0 unread means badge is hidden", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_seed_inbox", JSON.stringify([]));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // tabBarBadge doesn't have a testID, so check the inbox tab area for badge text
    const inboxTab = page.locator('[href="/inbox"]').first();
    await expect(inboxTab).toBeVisible();
    // No badge text should be present
    await expect(inboxTab.locator('text=/^[0-9]+\\+?$/')).toBeHidden();
  });

  test("3 unread shows '3'", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      const messages = [
        { id: "1", is_read: false },
        { id: "2", is_read: false },
        { id: "3", is_read: false },
      ];
      localStorage.setItem("@visionbuild:mock_seed_inbox", JSON.stringify(messages));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    // tabBarBadge text should be visible on the inbox tab
    const inboxTab = page.locator('[href="/inbox"]').first();
    await expect(inboxTab.getByText("3")).toBeVisible();
    
    await page.screenshot({ path: "e2e/screens/ui-inbox-badge.png", fullPage: false });
  });

  test("12 unread shows '9+'", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      const messages = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, is_read: false }));
      localStorage.setItem("@visionbuild:mock_seed_inbox", JSON.stringify(messages));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    const inboxTab = page.locator('[href="/inbox"]').first();
    await expect(inboxTab.getByText("9+")).toBeVisible();
  });
});
