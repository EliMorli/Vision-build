# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-loop.spec.ts >> VisionBuild Create Loop >> completes full create loop in mock mode
- Location: e2e/create-loop.spec.ts:11:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.setInputFiles: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="file"]')

```

# Page snapshot

```yaml
- generic [ref=e8]:
  - generic [ref=e9]:
    - generic:
      - generic [aria-hidden]:
        - heading [level=1] [ref=e11]: VisionBuild
        - generic:
          - generic:
            - generic:
              - generic:
                - generic: Hey Elimar
                - generic: Ready to redesign?
              - generic:
                - generic:
                  - generic: 
                  - generic: 120 XP
            - generic:
              - generic: 
              - generic: No projects yet
              - generic: Take a photo of any room to start visualizing your renovation.
              - generic:
                - button [active]:
                  - generic: 
                  - generic: Start Your First Project
    - generic [ref=e12]:
      - heading "camera" [level=1] [ref=e15]
      - generic [ref=e17]:
        - generic [ref=e18]: Take a photo or pick one from your gallery to get started.
        - generic [ref=e20] [cursor=pointer]:
          - generic [ref=e21]: 
          - generic [ref=e23]: Add a Room Photo
          - generic [ref=e24]: Take a photo or choose from your gallery
        - generic [ref=e26]:
          - button "Camera" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: 
          - button "Gallery" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: 
  - tablist [ref=e34]:
    - tab "  Home" [ref=e36] [cursor=pointer]:
      - generic [ref=e37]:
        - generic [ref=e38]: 
        - generic [ref=e40]: 
      - generic [ref=e42]: Home
    - tab "  Explore" [ref=e44] [cursor=pointer]:
      - generic [ref=e45]:
        - generic [ref=e46]: 
        - generic [ref=e48]: 
      - generic [ref=e50]: Explore
    - tab " " [ref=e52] [cursor=pointer]:
      - generic [ref=e53]:
        - generic [ref=e54]: 
        - generic [ref=e58]: 
    - tab "  Inbox" [ref=e63] [cursor=pointer]:
      - generic [ref=e64]:
        - generic [ref=e65]: 
        - generic [ref=e67]: 
      - generic [ref=e69]: Inbox
    - tab "  Profile" [ref=e71] [cursor=pointer]:
      - generic [ref=e72]:
        - generic [ref=e73]: 
        - generic [ref=e75]: 
      - generic [ref=e77]: Profile
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | const BASE_URL = process.env.BASE_URL || "http://localhost:19006";
  4   | 
  5   | test.describe("VisionBuild Create Loop", () => {
  6   |   test.beforeEach(async ({ page }: { page: Page }) => {
  7   |     // Mock mode should be enabled (EXPO_PUBLIC_DEV_MOCK_SESSION=true)
  8   |     await page.goto(BASE_URL);
  9   |   });
  10  | 
  11  |   test("completes full create loop in mock mode", async ({ page }: { page: Page }) => {
  12  |     // Wait for app to load
  13  |     await page.waitForLoadState("networkidle");
  14  | 
  15  |     // Should start on Home (empty state) after intro
  16  |     await expect(page.getByText("No projects yet")).toBeInViewport({ timeout: 10000 });
  17  |     await page.screenshot({ path: "e2e/screens/a5-home-empty.png", fullPage: true });
  18  | 
  19  |     // Click "Start Your First Project"
  20  |     await page.getByRole("button", { name: /start your first project/i }).click();
  21  | 
  22  |     // Should be on camera/create screen
  23  |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  24  |     await page.screenshot({ path: "e2e/screens/a5-capture.png", fullPage: true });
  25  | 
  26  |     // Upload a test image
  27  |     const fileInput = await page.locator('input[type="file"]');
> 28  |     await fileInput.setInputFiles("e2e/fixtures/test-room.jpg");
      |     ^ Error: locator.setInputFiles: Test timeout of 30000ms exceeded.
  29  | 
  30  |     // Wait for image to be selected
  31  |     await expect(page.getByText("Analyze Room")).toBeVisible();
  32  | 
  33  |     // Click "Analyze Room"
  34  |     await page.getByRole("button", { name: /analyze room/i }).click();
  35  | 
  36  |     // Should navigate to consent screen (first time)
  37  |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
  38  |     await page.screenshot({ path: "e2e/screens/a5-consent.png", fullPage: true });
  39  | 
  40  |     // Accept consent
  41  |     await page.getByRole("button", { name: /continue/i }).click();
  42  | 
  43  |     // Should be on style picker
  44  |     await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });
  45  |     await page.screenshot({ path: "e2e/screens/a5-style.png", fullPage: true });
  46  | 
  47  |     // Select a style (e.g., Modern)
  48  |     await page.getByText("Modern", { exact: true }).click();
  49  | 
  50  |     // Click "Generate 4 Designs"
  51  |     await page.getByRole("button", { name: /generate 4 designs/i }).click();
  52  | 
  53  |     // Should be on generating screen
  54  |     await expect(page.getByText(/building your/i)).toBeInViewport({ timeout: 5000 });
  55  |     await page.screenshot({ path: "e2e/screens/a5-generating.png", fullPage: true });
  56  | 
  57  |     // Wait for generation to complete (mock is fast)
  58  |     await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
  59  | 
  60  |     // Should be on results screen
  61  |     await expect(page.getByText("Option 1")).toBeVisible();
  62  |     await page.screenshot({ path: "e2e/screens/a5-results.png", fullPage: true });
  63  | 
  64  |     // Select a design (tap the first one)
  65  |     const firstDesign = page.locator('[role="button"]').filter({ hasText: "Option 1" }).first();
  66  |     await firstDesign.click();
  67  | 
  68  |     // Click "Save Design"
  69  |     await page.getByRole("button", { name: /save design/i }).click();
  70  | 
  71  |     // Should be on project detail
  72  |     await expect(page.getByText("Original Photo")).toBeInViewport({ timeout: 5000 });
  73  |     await page.screenshot({ path: "e2e/screens/a5-project-detail.png", fullPage: true });
  74  | 
  75  |     // Navigate back to Home
  76  |     await page.goBack();
  77  | 
  78  |     // Should see the project in Home list
  79  |     await expect(page.getByText(/renovation/i)).toBeVisible();
  80  |     await page.screenshot({ path: "e2e/screens/a5-home-with-project.png", fullPage: true });
  81  | 
  82  |     // Verify no console errors
  83  |     const errors: string[] = [];
  84  |     page.on("console", (msg) => {
  85  |       if (msg.type() === "error") {
  86  |         errors.push(msg.text());
  87  |       }
  88  |     });
  89  | 
  90  |     expect(errors).toHaveLength(0);
  91  |   });
  92  | 
  93  |   test("handles consent decline correctly", async ({ page }: { page: Page }) => {
  94  |     // Track requests to verify no analyze or generate requests are made
  95  |     const requests: string[] = [];
  96  |     page.on("request", (request) => {
  97  |       const url = request.url();
  98  |       if (url.includes("analyze-room") || url.includes("generate-design")) {
  99  |         requests.push(url);
  100 |       }
  101 |     });
  102 | 
  103 |     // Navigate to camera
  104 |     await page.goto(BASE_URL);
  105 |     await page.waitForLoadState("networkidle");
  106 |     await page.getByRole("button", { name: /start your first project/i }).click();
  107 | 
  108 |     // Upload test image
  109 |     const fileInput = await page.locator('input[type="file"]');
  110 |     await fileInput.setInputFiles("e2e/fixtures/test-room.jpg");
  111 | 
  112 |     // Click Analyze
  113 |     await page.getByRole("button", { name: /analyze room/i }).click();
  114 | 
  115 |     // Should be on consent screen
  116 |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport();
  117 | 
  118 |     // Navigate back (decline consent)
  119 |     await page.goBack();
  120 | 
  121 |     // Should be back on camera screen
  122 |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  123 | 
  124 |     // Verify no analyze or generate requests were made
  125 |     expect(requests).toHaveLength(0);
  126 |   });
  127 | 
  128 |   test("handles image load failure with placeholder", async ({ page }: { page: Page }) => {
```