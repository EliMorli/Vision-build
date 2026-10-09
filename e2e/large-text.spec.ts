import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:19006";

/**
 * Largest text size check (Dynamic Type / Android font scale).
 *
 * The app never disables font scaling, so on a phone every <Text> grows with the
 * system setting. React Native Web renders fixed px font sizes, so we simulate
 * the system font scale by zooming every text node (RN-web renders <Text> as an
 * element with dir="auto"). The text grows and re-wraps inside its container,
 * exactly like a scaled font, while padding and fixed boxes keep their size.
 *
 * FONT_SCALE 2.0 = Apple's "Larger Text" accessibility bar (200%), the largest
 * scale a store reviewer checks.
 */
const FONT_SCALE = 2.0;

async function applyLargestText(page: Page) {
  await page.addStyleTag({
    content: [
      `[dir="auto"] { zoom: ${FONT_SCALE}; }`,
      // Nested text inherits the parent's zoom; don't compound it
      `[dir="auto"] [dir="auto"] { zoom: 1 !important; }`,
      // Tab bar labels use allowFontScaling={false}, like a native UITabBar
      `[role="tablist"] [dir="auto"] { zoom: 1 !important; }`,
    ].join("\n"),
  });
  // Start every capture from the top of the screen
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll("*").forEach((el) => {
      if ((el as HTMLElement).scrollTop) (el as HTMLElement).scrollTop = 0;
    });
  });
}

/**
 * Returns visible text elements that are clipped (content larger than the box
 * with hidden overflow) or pushed off the side of the screen.
 */
async function findCutOffText(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    const vw = window.innerWidth;
    const nodes = Array.from(document.querySelectorAll('[dir="auto"]')) as HTMLElement[];
    for (const el of nodes) {
      const text = (el.innerText || "").trim();
      if (!text) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Skip text in screens that are mounted but hidden (inactive tabs/stack screens)
      if (el.closest('[aria-hidden="true"]')) continue;
      if (el.offsetParent === null && style.position !== "fixed") continue;
      // Intentional one/two-line ellipsis (numberOfLines) is allowed
      const clamp = style.webkitLineClamp && style.webkitLineClamp !== "none";
      const ellipsis = style.textOverflow === "ellipsis";
      if (!clamp && !ellipsis) {
        // Clipped: the text box sticks out of an ancestor that hides overflow.
        // (Geometry-based so it stays correct with zoomed text.) Stop at the
        // first scroll container: content there can be scrolled into view.
        for (let a = el.parentElement; a; a = a.parentElement) {
          const cs = getComputedStyle(a);
          const scrolls = ["auto", "scroll"].includes(cs.overflowX) || ["auto", "scroll"].includes(cs.overflowY);
          if (scrolls) break;
          const hides = ["hidden", "clip"].includes(cs.overflowX) || ["hidden", "clip"].includes(cs.overflowY);
          if (!hides) continue;
          const box = a.getBoundingClientRect();
          if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) {
            problems.push(`clipped: "${text.slice(0, 40)}"`);
            break;
          }
        }
      }
      // Items in a horizontal pager/carousel are meant to sit off-screen until swiped to
      let inHorizontalScroller = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox === "auto" || ox === "scroll") {
          inHorizontalScroller = true;
          break;
        }
      }
      if (!inHorizontalScroller && (rect.right > vw + 1 || rect.left < -1)) {
        problems.push(`off-screen: "${text.slice(0, 40)}" (${Math.round(rect.left)}..${Math.round(rect.right)})`);
      }
    }
    return problems;
  });
}

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

test.describe("Largest text size", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("@visionbuild:intro_seen", "true");
      localStorage.setItem("@visionbuild:mock_session", "true");
      localStorage.setItem("@visionbuild:ai_consent", "true");
      localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([
        {
          id: "large-text-1",
          user_id: "mock-user",
          title: "Living room refresh",
          status: "generated",
          selected_style: "modern",
          room_analysis: { roomType: "living_room", currentStyle: "traditional", estimatedSqFt: 200, keyElements: ["sofa"], rawAnalysis: "Bright living room with a sectional sofa and two large windows" },
          original_image_url: null,
          generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg", "mock/gen3.jpg", "mock/gen4.jpg"],
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]));
    });
  });

  test("Home at the largest text size: nothing cut off", async ({ page }: { page: Page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Living room refresh")).toBeVisible({ timeout: 15000 });
    await applyLargestText(page);
    await expect(page.getByTestId("home-start-new-room")).toBeVisible();
    expect(await findCutOffText(page)).toEqual([]);
    await page.screenshot({ path: "e2e/screens/ui-large-text-home.png", fullPage: false });
  });

  test("Results at the largest text size: nothing cut off", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/result/large-text-1`);
    await expect(page.getByText(/your designs/i)).toBeVisible({ timeout: 15000 });
    await applyLargestText(page);
    await expect(page.getByTestId("results-save")).toBeVisible();
    expect(await findCutOffText(page)).toEqual([]);
    await page.screenshot({ path: "e2e/screens/ui-large-text-results.png", fullPage: false });
  });

  test("Delete account at the largest text size: nothing cut off", async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/delete-account`);
    await expect(page.getByRole("button", { name: /send confirmation email/i })).toBeVisible({ timeout: 15000 });
    await applyLargestText(page);
    expect(await findCutOffText(page)).toEqual([]);
    await page.screenshot({ path: "e2e/screens/ui-large-text-delete-account.png", fullPage: false });
  });

  test("Delete account confirmation at the largest text size: nothing cut off", async ({ page }: { page: Page }) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };
    await page.route("**/functions/v1/confirm-account-deletion**", async (route) => {
      const method = route.request().method();
      if (method === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders });
      } else if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: corsHeaders,
          body: JSON.stringify({ valid: true, email: "test@example.com", isAppleUser: false }),
        });
      } else {
        // Never delete anything in this visual check
        await route.abort();
      }
    });
    await page.goto(`${BASE_URL}/delete-account/confirm?token=large-text-token`);
    await expect(page.getByTestId("delete-confirm-button")).toBeVisible({ timeout: 15000 });
    await applyLargestText(page);
    expect(await findCutOffText(page)).toEqual([]);
    await page.screenshot({ path: "e2e/screens/ui-large-text-delete-confirm.png", fullPage: false });
  });
});
