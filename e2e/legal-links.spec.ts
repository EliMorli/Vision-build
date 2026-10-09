import { test, expect, type Page } from "@playwright/test";

/**
 * Legal pages are hosted (web-legal/) and opened with expo-web-browser
 * openBrowserAsync, which calls window.open on web. A recorder replaces
 * window.open so each test can assert exactly which URL was opened.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:19006";
const LEGAL_BASE = (process.env.EXPO_PUBLIC_LEGAL_BASE_URL || "https://visionbuild.app/legal").replace(/\/+$/, "");
const URLS = {
  terms: `${LEGAL_BASE}/terms`,
  privacy: `${LEGAL_BASE}/privacy`,
  licenses: `${LEGAL_BASE}/licenses`,
};

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

async function installRecorder(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __opened: { url: string; target: string }[] };
    w.__opened = [];
    window.open = ((url?: string | URL, target?: string) => {
      w.__opened.push({ url: String(url), target: String(target) });
      return null;
    }) as typeof window.open;
  });
}

async function opened(page: Page): Promise<{ url: string; target: string }[]> {
  return page.evaluate(() => (window as unknown as { __opened: { url: string; target: string }[] }).__opened);
}

async function expectOpened(page: Page, url: string, count: number) {
  await expect.poll(async () => (await opened(page)).length).toBe(count);
  const last = (await opened(page))[count - 1];
  expect(last).toEqual({ url, target: "_blank" });
}

test.describe("Legal links open the hosted pages in the in-app browser", () => {
  test("Settings About rows open Terms, Privacy and Licenses and show the app version", async ({ page }) => {
    await installRecorder(page);
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
    await page.goto(`${BASE_URL}/profile-settings`);

    const about = page.getByTestId("settings-about");
    await expect(about).toBeVisible({ timeout: 15000 });
    await expect(about.getByRole("heading", { name: "About" })).toBeVisible();

    // About is the last section in Settings
    const isLast = await about.evaluate((el) => {
      const parent = el.parentElement;
      if (!parent) return false;
      const sections = Array.from(parent.children).filter((c) => (c as HTMLElement).offsetHeight > 0);
      return sections[sections.length - 1] === el;
    });
    expect(isLast).toBe(true);

    // No in-app legal text or old Legal section
    await expect(page.getByText("Legal", { exact: true })).toHaveCount(0);

    const rows = [
      { testId: "settings-about-terms", name: "Terms of Service", url: URLS.terms },
      { testId: "settings-about-privacy", name: "Privacy Policy", url: URLS.privacy },
      { testId: "settings-about-licenses", name: "Open-source licenses", url: URLS.licenses },
    ];
    for (const [i, row] of rows.entries()) {
      const link = page.getByRole("link", { name: row.name });
      await expect(link).toHaveAttribute("data-testid", row.testId);
      await link.click();
      await expectOpened(page, row.url, i + 1);
    }
    // Still on Settings: nothing navigated inside the app
    await expect(page).toHaveURL(/profile-settings/);

    const version = page.getByTestId("settings-app-version");
    await expect(version).toHaveText(/^VisionBuild version \d+\.\d+\.\d+$/);
    const style = await version.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { size: parseFloat(cs.fontSize), color: cs.color };
    });
    expect(style.size).toBeLessThanOrEqual(13);
    expect(style.color).toBe("rgb(95, 99, 104)");

    await about.scrollIntoViewIfNeeded();
    await page.getByTestId("settings-app-version").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "e2e/screens/ui-settings-about.png", fullPage: false });
  });

  test("Help & contact legal rows open the hosted pages", async ({ page }) => {
    await installRecorder(page);
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
    });
    await page.goto(`${BASE_URL}/help-contact`);
    await page.getByTestId("help-legal-terms").click();
    await expectOpened(page, URLS.terms, 1);
    await page.getByTestId("help-legal-privacy").click();
    await expectOpened(page, URLS.privacy, 2);
    await page.getByTestId("help-legal-licenses").click();
    await expectOpened(page, URLS.licenses, 3);
    await expect(page).toHaveURL(/help-contact/);
  });

  test("sign-in shows Terms and Privacy links next to the 13+ checkbox before agreeing", async ({ page }) => {
    await installRecorder(page);
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_signed_out", "true");
    });
    await page.goto(`${BASE_URL}/(tabs)/explore`);
    await expect(page.getByTestId("sign-in-screen")).toBeVisible({ timeout: 15000 });

    const terms = page.getByTestId("sign-in-terms-link");
    const privacy = page.getByTestId("sign-in-privacy-link");
    await expect(terms).toBeInViewport();
    await expect(privacy).toBeInViewport();
    await expect(terms).toHaveAttribute("role", "link");
    await expect(privacy).toHaveAttribute("role", "link");

    // Links work before the 13+ box is checked
    await terms.click();
    await expectOpened(page, URLS.terms, 1);
    await privacy.click();
    await expectOpened(page, URLS.privacy, 2);
    await expect(page.getByTestId("sign-in-screen")).toBeVisible();

    await page.screenshot({ path: "e2e/screens/ui-sign-in-legal-links.png", fullPage: false });
  });
});
