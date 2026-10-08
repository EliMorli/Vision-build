# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-loop.spec.ts >> VisionBuild Create Loop >> handles consent decline correctly
- Location: e2e/create-loop.spec.ts:93:7

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
- generic [ref=f1e8]:
  - generic [ref=f1e9]:
    - generic:
      - generic [aria-hidden]:
        - heading [level=1] [ref=f1e11]: VisionBuild
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
    - generic [ref=f1e12]:
      - heading "camera" [level=1] [ref=f1e15]
      - generic [ref=f1e17]:
        - generic [ref=f1e18]: Take a photo or pick one from your gallery to get started.
        - generic [ref=f1e20] [cursor=pointer]:
          - generic [ref=f1e21]: 
          - generic [ref=f1e23]: Add a Room Photo
          - generic [ref=f1e24]: Take a photo or choose from your gallery
        - generic [ref=f1e26]:
          - button "Camera" [ref=f1e27] [cursor=pointer]:
            - generic [ref=f1e28]: 
          - button "Gallery" [ref=f1e30] [cursor=pointer]:
            - generic [ref=f1e31]: 
  - tablist [ref=f1e34]:
    - tab "  Home" [ref=f1e36] [cursor=pointer]:
      - generic [ref=f1e37]:
        - generic [ref=f1e38]: 
        - generic [ref=f1e40]: 
      - generic [ref=f1e42]: Home
    - tab "  Explore" [ref=f1e44] [cursor=pointer]:
      - generic [ref=f1e45]:
        - generic [ref=f1e46]: 
        - generic [ref=f1e48]: 
      - generic [ref=f1e50]: Explore
    - tab " " [ref=f1e52] [cursor=pointer]:
      - generic [ref=f1e53]:
        - generic [ref=f1e54]: 
        - generic [ref=f1e58]: 
    - tab "  Inbox" [ref=f1e63] [cursor=pointer]:
      - generic [ref=f1e64]:
        - generic [ref=f1e65]: 
        - generic [ref=f1e67]: 
      - generic [ref=f1e69]: Inbox
    - tab "  Profile" [ref=f1e71] [cursor=pointer]:
      - generic [ref=f1e72]:
        - generic [ref=f1e73]: 
        - generic [ref=f1e75]: 
      - generic [ref=f1e77]: Profile
```

# Test source

```ts
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
  28  |     await fileInput.setInputFiles("e2e/fixtures/test-room.jpg");
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
> 110 |     await fileInput.setInputFiles("e2e/fixtures/test-room.jpg");
      |     ^ Error: locator.setInputFiles: Test timeout of 30000ms exceeded.
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
  129 |     // Intercept first image request and return 403
  130 |     let requestCount = 0;
  131 |     await page.route("**/room-photos/**", (route) => {
  132 |       requestCount++;
  133 |       if (requestCount === 1) {
  134 |         // First request: return 403 (expired link)
  135 |         route.fulfill({ status: 403, body: "Forbidden" });
  136 |       } else {
  137 |         // Subsequent requests: continue normally
  138 |         route.continue();
  139 |       }
  140 |     });
  141 | 
  142 |     // Navigate through the flow to results
  143 |     await page.goto(BASE_URL);
  144 |     await page.waitForLoadState("networkidle");
  145 |     await page.getByRole("button", { name: /start your first project/i }).click();
  146 |     
  147 |     const fileInput = await page.locator('input[type="file"]');
  148 |     await fileInput.setInputFiles("e2e/fixtures/test-room.jpg");
  149 |     
  150 |     await page.getByRole("button", { name: /analyze room/i }).click();
  151 |     await page.getByRole("button", { name: /continue/i }).click();
  152 |     
  153 |     await page.getByText("Modern", { exact: true }).click();
  154 |     await page.getByRole("button", { name: /generate 4 designs/i }).click();
  155 |     
  156 |     // Wait for results
  157 |     await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
  158 | 
  159 |     // Wait for placeholder to appear (IsoRoom)
  160 |     await page.waitForTimeout(1000); // Give time for retry logic
  161 | 
  162 |     // Verify placeholder is visible (check for IsoRoom SVG element or container)
  163 |     const placeholder = page.locator('[data-testid*="iso-room"]').or(page.locator('svg')).first();
  164 |     await expect(placeholder).toBeInViewport({ timeout: 5000 });
  165 | 
  166 |     await page.screenshot({ path: "e2e/screens/a5-image-expired-placeholder.png", fullPage: true });
  167 | 
  168 |     // Verify that a retry was attempted (requestCount > 1)
  169 |     expect(requestCount).toBeGreaterThan(1);
  170 |   });
  171 | });
  172 | 
```