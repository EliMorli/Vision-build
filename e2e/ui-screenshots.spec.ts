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
    await expect(page.getByTestId("style-picker-header")).toBeVisible({ timeout: 10000 });
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

    // 7. Project detail - seed the project with designs first
    await page.evaluate(() => {
      const projectWithDesigns = {
        id: "mock-project-id",
        user_id: "mock-user",
        title: "Modern Living Room",
        status: "generated",
        selected_style: "modern",
        room_analysis: { roomType: "living_room" },
        original_image_url: "mock/original.jpg",
        generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg", "mock/gen3.jpg", "mock/gen4.jpg"],
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([projectWithDesigns]));
    });
    
    await page.goto(`${BASE_URL}/project/mock-project-id`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/original photo/i)).toBeVisible({ timeout: 10000 });
    
    // Verify designs are shown
    await expect(page.getByText(/designs \([1-9]\d*\)/i)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="design-card"]').first()).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: "e2e/screens/ui-project-detail.png", fullPage: false });

    // 8. Home with project - seed a project now for this screenshot
    await page.evaluate(() => {
      // Seed a mock project - use clay IsoRoom by omitting image URLs
      const mockProject = {
        id: "mock-project-1",
        user_id: "mock-user",
        title: "Living room refresh",
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
    await expect(page.getByText("Living room refresh")).toBeVisible();
    
    // XP should reflect the profile (0 XP from initial state)
    await expect(page.getByText("0 XP")).toBeVisible();
    
    await page.screenshot({ path: "e2e/screens/ui-home-with-project.png", fullPage: false });
    
    // 9. Profile - seed a project to show badges/stats
    await page.goto(`${BASE_URL}/(tabs)/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/level \d+ · rookie designer/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-profile.png", fullPage: false });
    
    // 10. Explore empty state
    await page.goto(`${BASE_URL}/(tabs)/explore`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("No shared designs yet")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screens/ui-explore-empty.png", fullPage: false });
  });

  test("project detail with brief screenshot", async ({ page }: { page: Page }) => {
    // Set up authenticated mock state
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      
      const mockProjectWithBrief = {
        id: "mock-project-brief",
        user_id: "mock-user",
        title: "Kitchen remodel",
        status: "generated",
        selected_style: "modern",
        room_analysis: {
          roomType: "kitchen",
          currentStyle: "traditional",
          estimatedSqFt: 150,
          keyElements: ["oak cabinets"],
          rawAnalysis: "Traditional kitchen",
        },
        generated_image_urls: ["mock-1.jpg", "mock-2.jpg"],
        selected_generation_url: null,
        original_image_url: null,
        is_public: false,
        lead_info: {
          budgetRange: "$10,000 – $25,000",
          zipCode: "90210",
          projectBrief: "Modern kitchen remodel with new fixtures and updated appliances. Budget conscious approach.",
          matchedContractorIds: [],
          submittedAt: null,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([mockProjectWithBrief]));
    });
    
    await page.goto(`${BASE_URL}/project/mock-project-brief`);
    await page.waitForLoadState("networkidle");
    
    // Scroll to the brief section and verify it's visible
    const briefSection = page.getByTestId("project-brief");
    await briefSection.scrollIntoViewIfNeeded();
    await expect(briefSection).toBeVisible({ timeout: 10000 });
    
    // Verify the seeded brief text is present
    await expect(page.getByText(/modern kitchen remodel with new fixtures/i)).toBeVisible();
    
    // Verify the waitlist button
    const waitlistButton = page.getByTestId("project-brief-waitlist");
    await expect(waitlistButton).toBeVisible();
    
    await page.screenshot({ path: "e2e/screens/ui-project-brief.png", fullPage: true });
    
    // Click the button and verify navigation
    await waitlistButton.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/pros-coming-soon\?projectId=mock-project-brief/);
    await expect(page.getByText("Local pros are coming soon", { exact: true })).toBeVisible();
  });
});
