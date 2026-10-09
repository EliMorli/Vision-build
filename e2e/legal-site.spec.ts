import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";
import path from "path";
import { pathToFileURL } from "url";

/**
 * Renders the static legal website built by `npm run legal:build`
 * (web-legal/dist) and checks what the app links to: versioned policies,
 * the delete-account page and the searchable, grouped licenses page.
 */
const DIST = path.join(__dirname, "..", "web-legal", "dist");
const pageUrl = (p: string) => pathToFileURL(path.join(DIST, p, "index.html")).href;

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("Hosted legal website", () => {
  test.beforeAll(() => {
    execFileSync(process.execPath, [path.join(__dirname, "..", "scripts", "build-legal-site.js")], { stdio: "inherit" });
  });

  test("privacy page shows its version and effective date, keeps v1 online and links to delete-account", async ({ page }) => {
    await page.goto(pageUrl("privacy"));
    // v2 (legal/v2) is current and matches PRIVACY_POLICY_VERSION recorded at consent
    await expect(page.locator('meta[name="policy-version"]')).toHaveAttribute("content", "2");
    await expect(page.getByTestId("policy-version")).toHaveText("Version 2");
    await expect(page.getByTestId("policy-effective-date")).toHaveText(/^Effective \S/);
    // v2 corrections are live
    await expect(page.locator("article")).toContainText("not saved");
    await expect(page.locator("article")).toContainText("profile photo if you upload one");
    await expect(page.locator("article")).not.toContainText("Likes, saves, and remixes of public designs");
    await expect(page.locator("article")).not.toContainText("I confirm I am 13 years or older");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("VisionBuild Privacy Policy");
    // Brand header in Nunito
    await expect(page.locator(".site-header")).toHaveCSS("background-color", "rgb(26, 115, 232)");
    const font = await page.evaluate(async () => {
      await document.fonts.ready;
      return { family: getComputedStyle(document.body).fontFamily, loaded: document.fonts.check('16px "Nunito"') };
    });
    expect(font.family).toContain("Nunito");
    expect(font.loaded).toBe(true);

    const deleteLink = page.getByRole("link", { name: "Delete your VisionBuild account" });
    await expect(deleteLink).toHaveAttribute("href", "../delete-account/");
    await expect(page.getByRole("link", { name: /Version 1, effective/ })).toHaveAttribute("href", "../privacy/v1/");
    await expect(page.getByRole("link", { name: /Version 2, effective/ })).toHaveAttribute("href", "../privacy/v2/");

    await page.screenshot({ path: "e2e/screens/ui-legal-web-privacy.png", fullPage: false });

    // The latest is also at /privacy/v2, and v1 stays online at its versioned path
    await page.goto(pageUrl("privacy/v2"));
    await expect(page.locator('meta[name="policy-version"]')).toHaveAttribute("content", "2");
    await page.goto(pageUrl("privacy/v1"));
    await expect(page.locator('meta[name="policy-version"]')).toHaveAttribute("content", "1");
    await expect(page.getByRole("note")).toContainText("earlier version");
    await expect(page.locator("article")).toContainText("Likes, saves, and remixes of public designs");
    // Privacy v2 no longer mentions remixes anywhere (sections 4, 6 and 7)
    await page.goto(pageUrl("privacy"));
    await expect(page.locator("article")).not.toContainText(/remix/i);
  });

  test("terms page is v2 without remix rules and keeps v1 online", async ({ page }) => {
    await page.goto(pageUrl("terms"));
    await expect(page.locator('meta[name="policy-version"]')).toHaveAttribute("content", "2");
    await expect(page.getByTestId("policy-version")).toHaveText("Version 2");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("VisionBuild Terms of Service");
    await expect(page.locator("article")).not.toContainText(/remix/i);
    await expect(page.locator("article")).not.toContainText(/\blike, save\b/i);
    await expect(page.locator("article")).toContainText("license to view its designs");
    // Commercial use stays an open attorney question
    await expect(page.locator("article")).toContainText("Decide whether users may use their own designs for commercial purposes");
    // Copyright (DMCA) section; the agent email is a recognized blank until filled in
    await expect(page.getByRole("heading", { name: "Copyright complaints (DMCA)" })).toBeAttached();
    await expect(page.locator("article")).toContainText("designated agent at [dmca-agent@yourdomain.com]");
    await expect(page.getByRole("link", { name: /Version 1, effective/ })).toHaveAttribute("href", "../terms/v1/");
    await page.screenshot({ path: "e2e/screens/ui-legal-web-terms.png", fullPage: false });

    await page.goto(pageUrl("terms/v2"));
    await expect(page.locator('meta[name="policy-version"]')).toHaveAttribute("content", "2");
    await page.goto(pageUrl("terms/v1"));
    await expect(page.locator('meta[name="policy-version"]')).toHaveAttribute("content", "1");
    await expect(page.getByRole("note")).toContainText("earlier version");
    await expect(page.locator("article")).toContainText("Remix rules");
  });

  test("delete-account page explains in-app and email deletion and what is kept", async ({ page }) => {
    await page.goto(pageUrl("delete-account"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Delete your VisionBuild account");
    await expect(page.getByRole("heading", { name: /In the app/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /By email/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What we delete" })).toBeAttached();
    await expect(page.getByRole("heading", { name: /What we keep/ })).toBeAttached();
    // Retention table copied from Privacy Policy section 6
    await expect(page.locator("table")).toContainText("Backups");
    await expect(page.locator("main")).not.toContainText(/remix/i);
    await expect(page.getByRole("link", { name: "Privacy Policy" }).first()).toHaveAttribute("href", /privacy\/#6-/);
    await page.screenshot({ path: "e2e/screens/ui-legal-web-delete-account.png", fullPage: false });

    // Support page (Apple Support URL) links back to the policies
    await page.goto(pageUrl("support"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("VisionBuild support");
    await expect(page.getByRole("link", { name: "Delete your account" }).first()).toHaveAttribute("href", "../delete-account/");
  });

  test("licenses page groups versions, collapses texts and searches", async ({ page }) => {
    await page.goto(pageUrl("licenses"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Open-source licenses");
    const count = page.locator("#result-count");
    await expect(count).toHaveText(/^\d+ packages$/);

    const search = page.getByRole("searchbox", { name: "Search packages" });
    await search.fill("@babel/code-frame");
    await expect(count).toHaveText(/^Showing 1 of \d+ packages$/);
    const row = page.locator("[data-package]:visible");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("versions 7.10.4, 7.29.7");
    const details = row.locator("details");
    await expect(details).not.toHaveAttribute("open", "");
    await row.locator("summary").click();
    await expect(details).toHaveAttribute("open", "");
    await expect(row.locator(".license-text").first()).toContainText("Permission is hereby granted");

    await search.fill("zzzz-no-such-package");
    await expect(page.getByText("No packages match your search.")).toBeVisible();

    await search.fill("react");
    await expect(count).toHaveText(/^Showing \d+ of \d+ packages$/);
    await page.locator("[data-package]:visible summary").filter({ hasText: /^react\s*MIT/ }).first().click();
    await page.screenshot({ path: "e2e/screens/ui-legal-web-licenses.png", fullPage: false });
  });
});
