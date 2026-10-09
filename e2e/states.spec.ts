import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

test.describe("Loading, Empty, and Error States", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Set up authenticated mock state
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
  });

  test("explore: loading state shows skeleton", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ explore: "loading" }));
    });

    await page.goto(`${BASE_URL}/(tabs)/explore`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("explore-loading")).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: "e2e/screens/ui-explore-loading.png", fullPage: false });
  });

  test("explore: empty state shows message and start button", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ explore: "empty" }));
    });

    await page.goto(`${BASE_URL}/(tabs)/explore`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("explore-empty")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("No shared designs yet")).toBeVisible();

    await page.screenshot({ path: "e2e/screens/ui-explore-empty.png", fullPage: false });
  });

  test("home: error state shows safe message, try again button, and hides raw errors", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ home: "error" }));
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("home-error")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();

    // Verify raw error is never exposed
    const content = await page.content();
    expect(content).not.toContain("RAW_SECRET_ERROR");

    await page.screenshot({ path: "e2e/screens/ui-home-error.png", fullPage: false });

    // Clear override and tap Try again to recover
    await page.evaluate(() => {
      localStorage.removeItem("@visionbuild:mock_state_override");
    });

    await page.getByRole("button", { name: /try again/i }).click();
    await page.waitForLoadState("networkidle");

    // Should show content after recovery
    await expect(page.getByText(/ready to redesign/i)).toBeVisible({ timeout: 10000 });
  });

  test("inbox: loading state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ inbox: "loading" }));
    });

    await page.goto(`${BASE_URL}/(tabs)/inbox`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("inbox-loading")).toBeVisible({ timeout: 10000 });
  });

  test("inbox: error state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ inbox: "error" }));
    });

    await page.goto(`${BASE_URL}/(tabs)/inbox`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("inbox-error")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Something went wrong")).toBeVisible();

    // Verify raw error is hidden
    const content = await page.content();
    expect(content).not.toContain("RAW_SECRET_ERROR");
  });

  test("profile: loading state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ profile: "loading" }));
    });

    await page.goto(`${BASE_URL}/(tabs)/profile`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("profile-loading")).toBeVisible({ timeout: 10000 });
  });

  test("profile: error state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ profile: "error" }));
    });

    await page.goto(`${BASE_URL}/(tabs)/profile`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("profile-error")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Something went wrong")).toBeVisible();

    const content = await page.content();
    expect(content).not.toContain("RAW_SECRET_ERROR");
  });

  test("project: loading state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ project: "loading" }));
    });

    await page.goto(`${BASE_URL}/project/mock-project-id`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("project-loading")).toBeVisible({ timeout: 10000 });
  });

  test("project: error state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ project: "error" }));
    });

    await page.goto(`${BASE_URL}/project/mock-project-id`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("project-error")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Something went wrong")).toBeVisible();

    const content = await page.content();
    expect(content).not.toContain("RAW_SECRET_ERROR");
  });

  test("results: loading state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ results: "loading" }));
    });

    await page.goto(`${BASE_URL}/result/mock-project-id`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("results-loading")).toBeVisible({ timeout: 10000 });
  });

  test("results: error state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ results: "error" }));
    });

    await page.goto(`${BASE_URL}/result/mock-project-id`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("results-error")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Something went wrong")).toBeVisible();

    const content = await page.content();
    expect(content).not.toContain("RAW_SECRET_ERROR");
  });

  test("editor: loading state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ editor: "loading" }));
    });

    await page.goto(`${BASE_URL}/editor/mock-project-id`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("editor-loading")).toBeVisible({ timeout: 10000 });
  });

  test("editor: error state works", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_state_override", JSON.stringify({ editor: "error" }));
    });

    await page.goto(`${BASE_URL}/editor/mock-project-id`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("editor-error")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Something went wrong")).toBeVisible();

    const content = await page.content();
    expect(content).not.toContain("RAW_SECRET_ERROR");
  });
});
