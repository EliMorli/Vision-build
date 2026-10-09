import { test, expect, type Page } from "@playwright/test";

/**
 * Guard: no raw text outside <Text>.
 *
 * On the web, React Native Web logs "Unexpected text node: … A text node cannot be
 * a child of a <View>." On iOS/Android the same JSX throws "Text strings must be
 * rendered within a <Text> component" and crashes the screen. A common cause is
 * `{someString && <X />}` with an empty string, which renders "" inside a View.
 * Fails on any such console message across the main flow.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:19006";
const BAD_TEXT = /Unexpected text node|Text strings must be rendered within a <Text>/i;

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

function watchTextNodes(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (BAD_TEXT.exec(text)) problems.push(`${new URL(page.url()).pathname}: ${text.slice(0, 160)}`);
  });
  page.on("pageerror", (err) => {
    if (BAD_TEXT.exec(err.message)) problems.push(`${new URL(page.url()).pathname}: ${err.message.slice(0, 160)}`);
  });
  return problems;
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
}

test.describe("No raw text outside <Text>", () => {
  test("create flow: intro, home, capture, style, generating, results, project", async ({ page }) => {
    const problems = watchTextNodes(page);

    // Fresh install: intro first
    await page.goto(`${BASE_URL}/intro`);
    await expect(page.getByText("See the transformation")).toBeVisible({ timeout: 15000 });
    await settle(page);

    // Signed-in, consented user through the whole create loop
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
    await page.goto(BASE_URL);
    await expect(page.getByText("No projects yet")).toBeVisible({ timeout: 15000 });
    await settle(page);

    await page.getByRole("button", { name: /start your first project/i }).click();
    await expect(page.getByText(/take a photo or pick one/i)).toBeVisible();
    await settle(page);

    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /gallery/i }).click(),
    ]);
    await chooser.setFiles("e2e/fixtures/test-room.jpg");
    await expect(page.getByText("Analyze room")).toBeVisible();
    await settle(page);

    await page.getByRole("button", { name: /analyze room/i }).click();
    await expect(page.getByTestId("style-picker-header")).toBeVisible({ timeout: 10000 });
    await page.getByText("Modern", { exact: true }).click();
    await settle(page);

    await page.getByRole("button", { name: /generate 4 designs/i }).click();
    await expect(page.getByTestId("generating-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/swipe to browse/i)).toBeVisible({ timeout: 30000 });
    await settle(page);

    await page.getByText("Option 1").click();
    await page.getByTestId("results-save").click();
    await expect(page.getByText("Original photo")).toBeVisible({ timeout: 10000 });
    await settle(page);

    expect(problems).toEqual([]);
  });

  test("tabs and secondary screens", async ({ page }) => {
    const problems = watchTextNodes(page);
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
    const routes = [
      "/",
      "/camera",
      "/create",
      "/explore",
      "/inbox",
      "/profile",
      "/vi",
      "/profile-settings",
      "/edit-profile",
      "/help-contact",
      "/pros-coming-soon",
      "/handoff-location",
      "/delete-account",
      "/ai-consent",
    ];
    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.locator("#root").waitFor({ timeout: 15000 });
      await settle(page);
    }
    expect(problems).toEqual([]);
  });

  test("signed-out sign-in screen", async ({ page }) => {
    const problems = watchTextNodes(page);
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
    });
    await page.goto(`${BASE_URL}/sign-in`);
    await page.locator("#root").waitFor({ timeout: 15000 });
    await settle(page);
    expect(problems).toEqual([]);
  });
});
