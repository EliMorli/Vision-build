import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

test.describe("UI Screenshots", () => {
  test("verifies Nunito font loading", async ({ page }: { page: Page }) => {
    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });

    // Test font loading on Home screen
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/ready to redesign/i)).toBeVisible();

    // Wait for fonts to be ready
    await page.waitForFunction(() => document.fonts.ready);

    // Check that Nunito fonts are loaded by inspecting document.fonts
    const nunitoFontsLoaded = await page.evaluate(() => {
      const loadedFonts = Array.from(document.fonts as unknown as Iterable<FontFace>);
      return loadedFonts.some((font: FontFace) => 
        font.family.includes('Nunito') || 
        font.family.includes('nunito')
      );
    });
    expect(nunitoFontsLoaded).toBe(true);

    // Verify computed font family includes Nunito on heading elements
    const headingFontFamily = await page.evaluate(() => {
      const heading = document.evaluate(
        "//*[contains(text(), 'Ready to redesign')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue as HTMLElement;
      if (heading) {
        return window.getComputedStyle(heading).fontFamily;
      }
      return '';
    });
    expect(headingFontFamily.toLowerCase()).toContain('nunito');

    // Test font loading on consent screen (without editing its layout)
    await page.goto(`${BASE_URL}/ai-consent`);
    await page.waitForLoadState("networkidle");
    
    // Wait for fonts to be ready again
    await page.waitForFunction(() => document.fonts.ready);
    
    // Verify Nunito fonts are still loaded on consent screen
    const consentNunitoLoaded = await page.evaluate(() => {
      const loadedFonts = Array.from(document.fonts as unknown as Iterable<FontFace>);
      return loadedFonts.some((font: FontFace) => 
        font.family.includes('Nunito') || 
        font.family.includes('nunito')
      );
    });
    expect(consentNunitoLoaded).toBe(true);
  });

  test("captures all screens at 390x844", async ({ page }: { page: Page }) => {
    // Verify viewport
    const viewport = page.viewportSize();
    expect(viewport).toEqual({ width: 390, height: 844 });

    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });

    // 1. Intro
    await page.goto(`${BASE_URL}/intro`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/see the transformation/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-intro.png", fullPage: false });

    // 2. Home empty
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/ready to redesign/i)).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-home-empty.png", fullPage: false });

    // 3. Camera
    await page.goto(`${BASE_URL}/(tabs)/camera`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/take a photo or pick one/i)).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-camera.png", fullPage: false });

    // 4. Style picker - navigate to editor with mock project
    await page.goto(`${BASE_URL}/editor/mock-project-id`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/select a design style/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-style-picker.png", fullPage: false });

    // 5. Generating
    await page.goto(`${BASE_URL}/generating/mock-project-id`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/building your/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-generating.png", fullPage: false });

    // 6. Results
    await page.goto(`${BASE_URL}/result/mock-project-id`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/your designs/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-results.png", fullPage: false });

    // 7. Project detail
    await page.goto(`${BASE_URL}/project/mock-project-id`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/original photo/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-project-detail.png", fullPage: false });

    // 8. Home with project - go back to home
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/ready to redesign/i)).toBeVisible();
    await page.screenshot({ path: "e2e/screens/ui-home-with-project.png", fullPage: false });
  });
});
