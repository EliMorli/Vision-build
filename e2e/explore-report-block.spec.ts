import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:19006";

test.describe("VisionBuild Explore Report and Block", () => {
  test("report a design and block user - blocked designs disappear", async ({ page }: { page: Page }) => {
    // Seed with intro seen, mock session, and multiple public projects from different users
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", JSON.stringify({
        user: {
          id: "test-user-123",
          email: "viewer@visionbuild.app",
          user_metadata: { full_name: "Test Viewer" }
        },
        access_token: "mock-token"
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
        },
      ];
      localStorage.setItem("@visionbuild:projects", JSON.stringify(projects));
      localStorage.setItem("@visionbuild:blocks", JSON.stringify([]));
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Navigate to Explore tab
    await page.getByRole("button", { name: /Explore/i }).click();
    await page.waitForTimeout(500);

    // Verify we see 3 designs initially
    const initialDesigns = page.locator('[style*="aspectRatio: 1"]');
    await expect(initialDesigns).toHaveCount(3, { timeout: 5000 });

    // Find and click the report button on the first design (from other-user-1)
    const reportButtons = page.getByTestId("explore-report-button");
    await expect(reportButtons.first()).toBeVisible({ timeout: 5000 });
    await reportButtons.first().click();

    // Should see Alert menu with Report and Block options
    await expect(page.getByText("Report or Block")).toBeVisible({ timeout: 3000 });

    // Click "Report this design"
    await page.getByText("Report this design").click();

    // ReportModal should open
    await expect(page.getByText("Report Design")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("What's wrong?")).toBeVisible();

    // Select a reason
    await page.getByText("Inappropriate or offensive content").click();

    // Take screenshot of report modal
    await page.screenshot({ path: "e2e/screens/ui-explore-report.png", fullPage: true });

    // Submit report
    await page.getByRole("button", { name: /Submit Report/i }).click();

    // Should see confirmation
    await expect(page.getByText("Thank You")).toBeVisible({ timeout: 5000 });
    await page.getByText("OK").click();

    // Now test blocking: click report button again
    await reportButtons.first().click();
    await expect(page.getByText("Report or Block")).toBeVisible({ timeout: 3000 });

    // Click "Block this user"
    await page.getByText("Block this user").click();

    // Should see block confirmation
    await expect(page.getByText("User Blocked")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/won't see designs from this user/i)).toBeVisible();
    await page.getByText("OK").click();

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Verify blocked user's designs are gone (should only see 1 design now - from other-user-2)
    await expect(initialDesigns).toHaveCount(1, { timeout: 5000 });

    // Verify the remaining design is from the non-blocked user
    await expect(page.getByText("Farmhouse Kitchen")).toBeVisible();
    await expect(page.getByText("Modern Living Room")).not.toBeVisible();
    await expect(page.getByText("Coastal Bedroom")).not.toBeVisible();

    // Take screenshot of blocked state
    await page.screenshot({ path: "e2e/screens/ui-explore-blocked.png", fullPage: true });
  });
});
