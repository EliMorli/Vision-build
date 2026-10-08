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

    // Set up authenticated state (no project seed yet - will add after home-empty screenshot)
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

    // 2. Home empty - no seed, should show empty state
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/ready to redesign/i)).toBeVisible();
    await expect(page.getByText("No projects yet")).toBeVisible();
    // Verify no project cards are present
    await expect(page.getByTestId("home-project-card")).toHaveCount(0);
    await page.screenshot({ path: "e2e/screens/ui-home-empty.png", fullPage: false });

    // 3. Camera
    await page.goto(`${BASE_URL}/(tabs)/camera`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("New design")).toBeVisible();
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

    // 8. Home with project - seed a project now for this screenshot
    await page.evaluate(() => {
      // Seed a mock project - use clay IsoRoom by omitting image URLs
      const mockProject = {
        id: "mock-project-1",
        user_id: "mock-user",
        title: "Living Room Refresh",
        status: "generated",
        selected_style: "modern",
        room_analysis: {
          roomType: "living_room",
          currentStyle: "traditional",
          estimatedSqFt: 200,
          keyElements: ["sectional sofa", "large windows", "hardwood floors"],
          rawAnalysis: "Spacious living room with natural light and modern potential",
        },
        generated_image_urls: ["mock-gen-1.jpg", "mock-gen-2.jpg", "mock-gen-3.jpg", "mock-gen-4.jpg"],
        selected_generation_url: null,
        original_image_url: null,
        is_public: false,
        lead_info: null,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      };
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([mockProject]));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/ready to redesign/i)).toBeVisible();
    
    // Assert project card is visible with the seeded project
    await expect(page.getByTestId("home-project-card")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Living Room Refresh")).toBeVisible();
    
    // XP should reflect the project activity (120 XP from initial seed)
    await expect(page.getByText("120 XP")).toBeVisible();
    
    await page.screenshot({ path: "e2e/screens/ui-home-with-project.png", fullPage: false });
  });

  test("mock create loop saves to Home", async ({ page }: { page: Page }) => {
    // Set up authenticated state - same as screenshot test
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });

    // Start at home
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/ready to redesign/i)).toBeVisible({ timeout: 10000 });

    // Tap Camera tab
    await page.getByTestId("tab-camera").click();
    await expect(page.getByText("New design")).toBeVisible({ timeout: 5000 });

    // Tap "Select from gallery" button
    await page.getByTestId("camera-gallery-button").click();
    await expect(page.getByTestId("gallery-mock-image")).toBeVisible({ timeout: 5000 });

    // Select mock image
    await page.getByTestId("gallery-mock-image").click();

    // Wait for style picker
    await expect(page.getByText(/select a design style/i)).toBeVisible({ timeout: 5000 });

    // Select first style
    await page.getByTestId("style-card").first().click();

    // Wait for generating state
    await expect(page.getByText(/building your/i)).toBeVisible({ timeout: 5000 });

    // Wait for results (mock mode completes instantly)
    await expect(page.getByText(/your designs/i)).toBeVisible({ timeout: 8000 });

    // Pick first design
    await page.getByTestId("result-card").first().click();

    // Wait for project detail screen
    await expect(page.getByText(/original photo/i)).toBeVisible({ timeout: 5000 });

    // Click "Save to my project"
    const saveButton = page.getByTestId("save-project-button");
    await expect(saveButton).toBeVisible({ timeout: 3000 });
    await saveButton.click();

    // Wait for save to complete (should show "Saved" state)
    await expect(saveButton).toContainText("Saved", { timeout: 3000 });

    // Tap Home tab (preserves in-memory state)
    await page.getByTestId("tab-home").click();

    // Assert project card appears
    await expect(page.getByTestId("home-project-card")).toHaveCount(1, { timeout: 5000 });
  });
});
