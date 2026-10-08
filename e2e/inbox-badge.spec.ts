import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("Inbox Badge", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
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
    
    await expect(page.getByTestId("inbox-badge")).toBeHidden();
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
    
    await expect(page.getByTestId("inbox-badge")).toBeVisible();
    await expect(page.getByTestId("inbox-badge")).toHaveText("3");
    
    await page.screenshot({ path: "e2e/screens/ui-inbox-badge.png", fullPage: false });
  });

  test("12 unread shows '9+'", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      const messages = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, is_read: false }));
      localStorage.setItem("@visionbuild:mock_seed_inbox", JSON.stringify(messages));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByTestId("inbox-badge")).toBeVisible();
    await expect(page.getByTestId("inbox-badge")).toHaveText("9+");
  });
});
