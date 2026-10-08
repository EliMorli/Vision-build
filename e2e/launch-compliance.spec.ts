import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

test.describe("Launch Compliance Tests", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Set up authenticated mock state
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    });
  });

  test("intro slider: Before and After labels visible separately at start", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/intro`);
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByText(/see the transformation/i)).toBeVisible({ timeout: 10000 });
    
    // Both labels should be visible at start (slider centered)
    const beforeLabel = page.getByTestId("intro-label-before");
    const afterLabel = page.getByTestId("intro-label-after");
    
    await expect(beforeLabel).toBeVisible();
    await expect(afterLabel).toBeVisible();
    
    // Check they don't overlap by verifying they have separate bounding boxes
    const beforeBox = await beforeLabel.boundingBox();
    const afterBox = await afterLabel.boundingBox();
    
    expect(beforeBox).not.toBeNull();
    expect(afterBox).not.toBeNull();
    
    // Labels shouldn't overlap - before is on left, after is on right
    if (beforeBox && afterBox) {
      expect(beforeBox.x + beforeBox.width).toBeLessThan(afterBox.x);
    }
    
    await page.screenshot({ path: "e2e/screens/ui-intro-labels.png", fullPage: false });
  });

  test("home empty state: Start button above waitlist card", async ({ page }: { page: Page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByText(/ready to redesign/i)).toBeVisible();
    await expect(page.getByText("No projects yet")).toBeVisible();
    
    const startButton = page.getByRole("button", { name: /start your first project/i });
    const waitlistCard = page.getByTestId("pros-teaser");
    
    await expect(startButton).toBeVisible();
    await expect(waitlistCard).toBeVisible();
    
    // Verify order: start button should be above waitlist card
    const startBox = await startButton.boundingBox();
    const waitlistBox = await waitlistCard.boundingBox();
    
    expect(startBox).not.toBeNull();
    expect(waitlistBox).not.toBeNull();
    
    if (startBox && waitlistBox) {
      expect(startBox.y).toBeLessThan(waitlistBox.y);
    }
    
    await page.screenshot({ path: "e2e/screens/ui-home-empty-order.png", fullPage: false });
  });

  test("home with projects: waitlist card below project list", async ({ page }: { page: Page }) => {
    // Seed a project
    await page.addInitScript(() => {
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
          keyElements: ["sectional sofa"],
          rawAnalysis: "Spacious living room",
        },
        generated_image_urls: ["mock-1.jpg"],
        selected_generation_url: null,
        original_image_url: null,
        is_public: false,
        lead_info: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([mockProject]));
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByText(/ready to redesign/i)).toBeVisible();
    
    const projectCard = page.getByTestId("home-project-card");
    const waitlistCard = page.getByTestId("pros-teaser");
    
    await expect(projectCard).toBeVisible();
    await expect(waitlistCard).toBeVisible();
    
    // Verify order: project card should be above waitlist card
    const projectBox = await projectCard.boundingBox();
    const waitlistBox = await waitlistCard.boundingBox();
    
    expect(projectBox).not.toBeNull();
    expect(waitlistBox).not.toBeNull();
    
    if (projectBox && waitlistBox) {
      expect(projectBox.y).toBeLessThan(waitlistBox.y);
    }
  });

  test("style picker header is sentence case", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/editor/mock-project-id`);
    await page.waitForLoadState("networkidle");
    
    // Should say "Pick a style" not "Select a Design Style"
    await expect(page.getByTestId("style-picker-header")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("style-picker-header")).toHaveText("Pick a style");
    
    await page.screenshot({ path: "e2e/screens/ui-style-picker-header.png", fullPage: false });
  });

  test("project page with no brief: section absent", async ({ page }: { page: Page }) => {
    // Seed a project without lead_info
    await page.addInitScript(() => {
      const mockProject = {
        id: "test-project-no-brief",
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
        generated_image_urls: ["mock-1.jpg"],
        selected_generation_url: null,
        original_image_url: null,
        is_public: false,
        lead_info: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([mockProject]));
    });
    
    await page.goto(`${BASE_URL}/project/test-project-no-brief`);
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByText(/original photo/i)).toBeVisible({ timeout: 10000 });
    
    // Project Brief section should not be visible
    await expect(page.getByTestId("project-brief")).not.toBeVisible();
    
    await page.screenshot({ path: "e2e/screens/ui-project-no-brief.png", fullPage: false });
  });

  test("project page with brief: shows real brief and waitlist button", async ({ page }: { page: Page }) => {
    // Seed a project with lead_info
    await page.addInitScript(() => {
      const mockProject = {
        id: "test-project-with-brief",
        user_id: "mock-user",
        title: "Bathroom update",
        status: "generated",
        selected_style: "modern",
        room_analysis: {
          roomType: "bathroom",
          currentStyle: "dated",
          estimatedSqFt: 80,
          keyElements: ["tile floor"],
          rawAnalysis: "Small bathroom",
        },
        generated_image_urls: ["mock-1.jpg"],
        selected_generation_url: null,
        original_image_url: null,
        is_public: false,
        lead_info: {
          budgetRange: "$10,000 – $25,000",
          zipCode: "90210",
          projectBrief: "Modern bathroom remodel with new fixtures and tiling. Budget conscious approach.",
          matchedContractorIds: [],
          submittedAt: null,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([mockProject]));
    });
    
    await page.goto(`${BASE_URL}/project/test-project-with-brief`);
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByText(/original photo/i)).toBeVisible({ timeout: 10000 });
    
    // Project Brief section should be visible
    await expect(page.getByTestId("project-brief")).toBeVisible();
    
    // Should show the real brief text
    await expect(page.getByText(/modern bathroom remodel/i)).toBeVisible();
    
    // Button should say "Join the pros waitlist" not "Get quotes"
    await expect(page.getByTestId("project-brief-waitlist")).toBeVisible();
    await expect(page.getByTestId("project-brief-waitlist")).toContainText("Join the pros waitlist");
    
    await page.screenshot({ path: "e2e/screens/ui-project-brief-waitlist.png", fullPage: false });
  });

  test("profile badges: locked badge with lock icon and hint", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/(tabs)/profile`);
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByText(/level \d+ · rookie designer/i)).toBeVisible({ timeout: 10000 });
    
    // Should show badges section
    await expect(page.getByTestId("profile-badges-section")).toBeVisible();
    
    // Should show locked badges with hints (e.g., "Redesign your first room.")
    await expect(page.getByText(/redesign your first room/i)).toBeVisible();
    
    await page.screenshot({ path: "e2e/screens/ui-profile.png", fullPage: false });
  });

  test("profile stats: Designs count, no Quotes stat", async ({ page }: { page: Page }) => {
    // Seed a project with designs
    await page.addInitScript(() => {
      const mockProject = {
        id: "mock-project-1",
        user_id: "mock-user",
        title: "Living room",
        status: "generated",
        selected_style: "modern",
        room_analysis: {
          roomType: "living_room",
          currentStyle: "traditional",
          estimatedSqFt: 200,
          keyElements: ["sofa"],
          rawAnalysis: "Living room",
        },
        generated_image_urls: ["mock-1.jpg", "mock-2.jpg"],
        selected_generation_url: null,
        original_image_url: null,
        is_public: false,
        lead_info: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([mockProject]));
    });
    
    await page.goto(`${BASE_URL}/(tabs)/profile`);
    await page.waitForLoadState("networkidle");
    
    // Should show Rooms stat
    await expect(page.getByTestId("profile-stat-rooms")).toBeVisible();
    
    // Should show Designs stat
    await expect(page.getByTestId("profile-stat-designs")).toBeVisible();
    
    // Should show Badges stat instead of Quotes
    await expect(page.getByTestId("profile-stat-badges")).toBeVisible();
    
    // Should NOT show Quotes stat
    await expect(page.getByText("Quotes", { exact: true })).not.toBeVisible();
  });

  test("explore empty state: shows clay room and start button", async ({ page }: { page: Page }) => {
    // Seed empty projects list
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([]));
    });
    
    await page.goto(`${BASE_URL}/(tabs)/explore`);
    await page.waitForLoadState("networkidle");
    
    // Should show empty state
    await expect(page.getByText("No shared designs yet")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/make a project public/i)).toBeVisible();
    
    // Should have a "Start a new room" button
    await expect(page.getByRole("button", { name: /start a new room/i })).toBeVisible();
    
    await page.screenshot({ path: "e2e/screens/ui-explore-empty.png", fullPage: false });
  });

  test("handoff screen redirects to pros-coming-soon when flag is off", async ({ page }: { page: Page }) => {
    // Navigate to handoff-location
    await page.goto(`${BASE_URL}/handoff-location?id=test-project`);
    await page.waitForLoadState("networkidle");
    
    // Should redirect to pros-coming-soon
    await expect(page).toHaveURL(/pros-coming-soon/, { timeout: 10000 });
    
    // Should show coming soon message
    await expect(page.getByText("Local pros are coming soon", { exact: true })).toBeVisible();
  });
});
