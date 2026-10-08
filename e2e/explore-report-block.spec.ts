import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild Explore Report and Block", () => {
  test("report a design - mock call recorded", async ({ page }: { page: Page }) => {
    // Track reports submitted via mock layer
    const reports: any[] = [];
    await page.route("**/functions/v1/submit-report", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      reports.push(postData);
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    // Seed test data
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
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
      ];
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify(projects));
      localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
    });

    await page.goto(`${BASE_URL}/(tabs)/explore`);

    // Click report button
    await page.getByTestId("explore-report-button").first().click();
    await expect(page.getByTestId("report-block-menu")).toBeVisible({ timeout: 3000 });

    // Click "Report this design"
    await page.getByTestId("menu-report-option").click();
    await expect(page.getByTestId("report-confirm-sheet")).toBeVisible({ timeout: 3000 });

    // Confirm report
    await page.getByTestId("report-confirm-sheet-confirm").click();
    await expect(page.getByTestId("report-confirm-sheet")).not.toBeVisible({ timeout: 3000 });

    // Fill out report modal
    await expect(page.getByText("What's wrong?")).toBeVisible({ timeout: 3000 });
    await page.getByText("Inappropriate or offensive content").click();

    // Take screenshot
    await page.screenshot({ path: "e2e/screens/ui-explore-report.png", fullPage: true });

    // Submit report
    await page.getByRole("button", { name: /Submit Report/i }).click();

    // Verify success message
    await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 5000 });

    // Verify report was recorded in mock layer
    await page.waitForTimeout(500);
    expect(reports.length).toBeGreaterThan(0);
    expect(reports[0]).toMatchObject({
      targetType: "design",
      targetId: "project-public-1",
      reason: expect.any(String),
    });
  });

  test("cancel report shows no success message", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
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
      
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([
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
      ]));
      localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
    });

    await page.goto(`${BASE_URL}/(tabs)/explore`);

    // Open report menu
    await page.getByTestId("explore-report-button").first().click();
    await expect(page.getByTestId("report-block-menu")).toBeVisible({ timeout: 3000 });

    // Click Report
    await page.getByTestId("menu-report-option").click();
    await expect(page.getByTestId("report-confirm-sheet")).toBeVisible({ timeout: 3000 });

    // Cancel
    await page.getByTestId("report-confirm-sheet-cancel").click();
    await expect(page.getByTestId("report-confirm-sheet")).not.toBeVisible({ timeout: 3000 });

    // Should NOT see success message
    await expect(page.getByTestId("success-message")).not.toBeVisible();
  });

  test("block user persists after reload", async ({ page }: { page: Page }) => {
    // Track blocks submitted
    const blocks: any[] = [];
    await page.route("**/rest/v1/blocks", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const postData = request.postDataJSON();
        blocks.push(postData);
        await route.fulfill({ 
          status: 201, 
          body: JSON.stringify({ id: "block-123", ...postData }) 
        });
      } else {
        await route.continue();
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
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

    await page.goto(`${BASE_URL}/(tabs)/explore`);

    // Verify 2 designs initially
    const exploreCards = page.locator('[data-testid="explore-design-card"]');
    await expect(exploreCards).toHaveCount(2, { timeout: 5000 });

    // Block first user
    await page.getByTestId("explore-report-button").first().click();
    await expect(page.getByTestId("report-block-menu")).toBeVisible({ timeout: 3000 });
    await page.getByTestId("menu-block-option").click();
    await expect(page.getByTestId("block-confirm-sheet")).toBeVisible({ timeout: 3000 });
    await page.getByTestId("block-confirm-sheet-confirm").click();

    // Wait for block to complete and sheet to close
    await expect(page.getByTestId("block-confirm-sheet")).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 5000 });

    // Verify only 1 design remains
    await expect(exploreCards).toHaveCount(1, { timeout: 5000 });
    await expect(page.getByText("Farmhouse Kitchen")).toBeVisible();
    await expect(page.getByText("Modern Living Room")).not.toBeVisible();

    // Wait for success message to disappear
    await expect(page.getByTestId("success-message")).not.toBeVisible({ timeout: 4000 });

    // Take clean screenshot (no overlays)
    await page.screenshot({ path: "e2e/screens/ui-explore-blocked.png", fullPage: true });

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Blocked user should still be hidden
    await expect(exploreCards).toHaveCount(1, { timeout: 5000 });
    await expect(page.getByText("Farmhouse Kitchen")).toBeVisible();
    await expect(page.getByText("Modern Living Room")).not.toBeVisible();

    // Verify block was recorded
    await page.waitForTimeout(500);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].blocked_id).toBe("other-user-1");
  });
});
