import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild Explore Report and Block", () => {
  test("report a design - mock call recorded", async ({ page }: { page: Page }) => {
    // Seed test data (guard with sessionStorage to prevent re-seeding on navigation/reload)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("__vb_seeded")) {
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
        localStorage.setItem("@visionbuild:user_settings:mock-user", JSON.stringify({
          push_notifications: true,
          marketing_emails: false,
          public_projects_default: false,
          reduce_motion: true
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
        localStorage.setItem("@visionbuild:reports", JSON.stringify([]));
        sessionStorage.setItem("__vb_seeded", "1");
      }
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

    // Wait for modal to close first
    await expect(page.getByText("What's wrong?")).not.toBeVisible({ timeout: 3000 });

    // Verify success message appears after modal closes
    await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 5000 });

    // Verify report was recorded in localStorage with correct reason
    const reports = await page.evaluate(() => {
      const stored = localStorage.getItem("@visionbuild:reports");
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(reports.length).toBeGreaterThan(0);
    expect(reports[0]).toMatchObject({
      targetType: "design",
      targetId: "project-public-1",
      reason: "inappropriate",
    });
  });

  test("cancel report shows no success message", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("__vb_seeded")) {
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
        localStorage.setItem("@visionbuild:user_settings:mock-user", JSON.stringify({
          push_notifications: true,
          marketing_emails: false,
          public_projects_default: false,
          reduce_motion: true
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
        localStorage.setItem("@visionbuild:reports", JSON.stringify([]));
        sessionStorage.setItem("__vb_seeded", "1");
      }
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

    // Assert no reports were stored (poll over ~1s to catch delayed bugs)
    await expect.poll(async () => {
      const reports = await page.evaluate(() => {
        const stored = localStorage.getItem("@visionbuild:reports");
        return stored ? JSON.parse(stored) : [];
      });
      return reports.length;
    }, { timeout: 1000 }).toBe(0);

    // Should NOT see success message
    await expect(page.getByTestId("success-message")).not.toBeVisible();
  });

  test("block user persists after reload", async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("__vb_seeded")) {
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
        localStorage.setItem("@visionbuild:user_settings:mock-user", JSON.stringify({
          push_notifications: true,
          marketing_emails: false,
          public_projects_default: false,
          reduce_motion: true
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
        sessionStorage.setItem("__vb_seeded", "1");
      }
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

    // Wait for sheet to close
    await expect(page.getByTestId("block-confirm-sheet")).not.toBeVisible({ timeout: 3000 });
    
    // Wait for menu to close too
    await expect(page.getByTestId("report-block-menu")).not.toBeVisible({ timeout: 3000 });

    // Success message should appear after block completes
    await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 10000 });

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

    // Verify block was recorded in localStorage
    const blocks = await page.evaluate(() => {
      const stored = localStorage.getItem("@visionbuild:blocks");
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].blocked_id).toBe("other-user-1");
  });
});
