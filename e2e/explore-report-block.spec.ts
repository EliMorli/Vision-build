import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild Explore Report and Block", () => {
  test("report a design and block user - blocked designs disappear", async ({ page }: { page: Page }) => {
    // Seed with intro seen, mock session, profile, and public projects from different users
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", JSON.stringify({
        user: {
          id: "test-user-123",
          email: "viewer@visionbuild.app"
        },
        access_token: "mock-token"
      }));
      
      localStorage.setItem("@visionbuild:mock_seed_profile", JSON.stringify({
        id: "test-user-123",
        email: "viewer@visionbuild.app",
        display_name: "Test Viewer",
        photo_url: null,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        xp: 0,
        level: 1
      }));
      
      // Seed public projects from two different users
      const projects = [
        {
          id: "project-public-1",
          user_id: "other-user-1",
          title: "Modern Living Room",
          selected_style: "modern",
          is_public: true,
          status: "generated",
          original_image_url: "mock/original.jpg",
          created_at: new Date().toISOString(),
          generated_image_urls: ["mock/gen1.jpg"]
        },
        {
          id: "project-public-2",
          user_id: "other-user-1",
          title: "Coastal Bedroom",
          selected_style: "coastal",
          is_public: true,
          status: "generated",
          original_image_url: "mock/original2.jpg",
          created_at: new Date().toISOString(),
          generated_image_urls: ["mock/gen2.jpg"]
        },
        {
          id: "project-public-3",
          user_id: "other-user-2",
          title: "Farmhouse Kitchen",
          selected_style: "farmhouse",
          is_public: true,
          status: "generated",
          original_image_url: "mock/original3.jpg",
          created_at: new Date().toISOString(),
          generated_image_urls: ["mock/gen3.jpg"]
        },
      ];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
      localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
    });

    await page.goto(BASE_URL);

    // Navigate to Explore tab by URL
    await page.goto(`${BASE_URL}/(tabs)/explore`);

    // Verify we see 3 designs initially
    const exploreCards = page.locator('[data-testid="explore-design-card"]');
    await expect(exploreCards).toHaveCount(3, { timeout: 5000 });

    // Find and click the report button on the first design (from other-user-1)
    const reportButtons = page.getByTestId("explore-report-button");
    await expect(reportButtons.first()).toBeVisible({ timeout: 5000 });
    await reportButtons.first().click();

    // Should see menu with Report and Block options
    await expect(page.getByTestId("report-block-menu")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Report or Block")).toBeVisible();

    // Click "Report this design"
    await page.getByTestId("menu-report-option").click();

    // Should see confirmation sheet
    await expect(page.getByTestId("report-confirm-sheet")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Report this design for inappropriate content?")).toBeVisible();

    // Confirm report
    await page.getByTestId("report-confirm-sheet-confirm").click();

    // ReportModal should open
    await expect(page.getByText("Report Design")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("What's wrong?")).toBeVisible();

    // Select a reason
    await page.getByText("Inappropriate or offensive content").click();

    // Take screenshot of report modal
    await page.screenshot({ path: "e2e/screens/ui-explore-report.png", fullPage: true });

    // Submit report
    await page.getByRole("button", { name: /Submit Report/i }).click();

    // Should see success message
    await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 5000 });

    // Now test blocking: click report button again
    await reportButtons.first().click();
    await expect(page.getByTestId("report-block-menu")).toBeVisible({ timeout: 3000 });

    // Click "Block this user"
    await page.getByTestId("menu-block-option").click();

    // Should see block confirmation
    await expect(page.getByTestId("block-confirm-sheet")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/Block this user\? You won't see their designs/i)).toBeVisible();

    // Confirm block
    await page.getByTestId("block-confirm-sheet-confirm").click();

    // Should see success message
    await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/User blocked/i)).toBeVisible();

    // Verify blocked user's designs are gone (should only see 1 design now - from other-user-2)
    await expect(exploreCards).toHaveCount(1, { timeout: 5000 });

    // Verify the remaining design is from the non-blocked user
    await expect(page.getByText("Farmhouse Kitchen")).toBeVisible();
    await expect(page.getByText("Modern Living Room")).not.toBeVisible();
    await expect(page.getByText("Coastal Bedroom")).not.toBeVisible();

    // Take screenshot of blocked state
    await page.screenshot({ path: "e2e/screens/ui-explore-blocked.png", fullPage: true });
  });
});
