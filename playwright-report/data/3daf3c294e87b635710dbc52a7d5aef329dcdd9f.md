# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-loop.spec.ts >> VisionBuild Create Loop >> completes full create loop when consented
- Location: e2e/create-loop.spec.ts:55:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - generic:
      - generic:
        - generic:
          - link "Choose Style, back" [ref=e8] [cursor=pointer]:
            - /url: /editor/mock-project-1791435672922?__EXPO_ROUTER_key=undefined-RRlNqooE8whagXmE4ycKx
          - heading "Your Designs" [level=1] [ref=e11]
  - generic [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e16]: 
      - generic [ref=e18]:
        - generic [ref=e19]: Room redesigned!
        - generic [ref=e20]: Quest complete
      - generic [ref=e21]: +50 XP
      - generic "Dismiss" [ref=e22] [cursor=pointer]: 
    - generic [ref=e24]: Swipe to browse. Tap to select your favorite.
    - generic [ref=e25]:
      - generic [ref=e26]: 
      - generic [ref=e27]: AI visualization, not a plan or quote
    - generic [ref=e28]:
      - generic [ref=e29]: 
      - generic [ref=e30]: Long-press any image to compare with original
    - generic [ref=e32]:
      - generic [ref=e34] [cursor=pointer]:
        - generic "Design option 1" [ref=e36]:
          - img "Design option 1" [ref=e38]
        - generic [ref=e39]: Option 1
      - generic [ref=e42] [cursor=pointer]:
        - generic "Design option 2" [ref=e44]:
          - img "Design option 2" [ref=e46]
        - generic [ref=e47]: Option 2
      - generic [ref=e50] [cursor=pointer]:
        - generic "Design option 3" [ref=e52]:
          - img "Design option 3" [ref=e54]
        - generic [ref=e55]: Option 3
      - generic [ref=e58] [cursor=pointer]:
        - generic "Design option 4" [ref=e60]:
          - img "Design option 4" [ref=e62]
        - generic [ref=e63]: Option 4
    - generic [ref=e70]:
      - button "Save Design" [disabled]:
        - generic [ref=e71]: 
```

# Test source

```ts
  24  |     // Assert intro/splash screen first
  25  |     await expect(page.getByText(/welcome/i).or(page.getByText(/visionbuild/i))).toBeInViewport({ timeout: 10000 });
  26  |     
  27  |     // Complete intro (look for continue/get started button)
  28  |     const introButton = page.getByRole("button", { name: /(get started|continue|next)/i }).first();
  29  |     await introButton.click();
  30  | 
  31  |     // After intro, if not signed in, may go to sign-in; in mock mode with session, should reach tabs
  32  |     // Wait for either Home screen or sign-in
  33  |     await page.waitForTimeout(2000);
  34  |     
  35  |     // If on Home, try to start a project - this should trigger consent flow
  36  |     const startButton = page.getByRole("button", { name: /start your first project/i });
  37  |     if (await startButton.isVisible()) {
  38  |       await startButton.click();
  39  |       
  40  |       // Upload image
  41  |       const [chooser] = await Promise.all([
  42  |         page.waitForEvent("filechooser"),
  43  |         page.getByRole("button", { name: /gallery/i }).click(),
  44  |       ]);
  45  |       await chooser.setFiles("e2e/fixtures/test-room.jpg");
  46  |       
  47  |       // Click Analyze
  48  |       await page.getByRole("button", { name: /analyze room/i }).click();
  49  |       
  50  |       // Should see consent screen
  51  |       await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
  52  |     }
  53  |   });
  54  | 
  55  |   test("completes full create loop when consented", async ({ page }: { page: Page }) => {
  56  |     // Seed intro seen and consent accepted
  57  |     await page.addInitScript(() => {
  58  |       localStorage.setItem("@visionbuild:intro_seen", "true");
  59  |       localStorage.setItem("@visionbuild:ai_consent", "true");
  60  |       localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
  61  |     });
  62  | 
  63  |     // Intercept mock design image URLs and serve green pixels
  64  |     await page.route("**/__mock__/design_*.png*", async (route) => {
  65  |       await route.fulfill({
  66  |         status: 200,
  67  |         contentType: "image/png",
  68  |         body: GREEN_PIXEL
  69  |       });
  70  |     });
  71  | 
  72  |     await page.goto(BASE_URL);
  73  |     await page.waitForLoadState("networkidle");
  74  | 
  75  |     // Assert Home screen, then screenshot
  76  |     await expect(page.getByText("No projects yet")).toBeInViewport({ timeout: 10000 });
  77  |     await page.screenshot({ path: "e2e/screens/a5-home-empty.png", fullPage: true });
  78  | 
  79  |     // Click "Start Your First Project"
  80  |     await page.getByRole("button", { name: /start your first project/i }).click();
  81  | 
  82  |     // Assert Camera screen, then screenshot
  83  |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  84  |     await page.screenshot({ path: "e2e/screens/a5-capture.png", fullPage: true });
  85  | 
  86  |     // Upload a test image using Playwright's filechooser pattern
  87  |     const [chooser] = await Promise.all([
  88  |       page.waitForEvent("filechooser"),
  89  |       page.getByRole("button", { name: /gallery/i }).click(),
  90  |     ]);
  91  |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  92  | 
  93  |     // Wait for image to be selected
  94  |     await expect(page.getByText("Analyze Room")).toBeVisible();
  95  | 
  96  |     // Click "Analyze Room"
  97  |     await page.getByRole("button", { name: /analyze room/i }).click();
  98  | 
  99  |     // Assert Style picker, then screenshot
  100 |     await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });
  101 |     await page.screenshot({ path: "e2e/screens/a5-style.png", fullPage: true });
  102 | 
  103 |     // Select a style (e.g., Modern)
  104 |     await page.getByText("Modern", { exact: true }).click();
  105 | 
  106 |     // Click "Generate 4 Designs"
  107 |     await page.getByRole("button", { name: /generate 4 designs/i }).click();
  108 | 
  109 |     // Wait a moment for navigation to generating screen
  110 |     await page.waitForTimeout(500);
  111 | 
  112 |     // Assert Generating screen (with countdown text), then screenshot
  113 |     await expect(page.getByText(/building your/i)).toBeInViewport({ timeout: 10000 });
  114 |     await expect(page.getByText(/sec left/i)).toBeVisible({ timeout: 2000 });
  115 |     await page.screenshot({ path: "e2e/screens/a5-generating.png", fullPage: true });
  116 | 
  117 |     // Wait for generation to complete - look for results screen
  118 |     await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
  119 | 
  120 |     // Assert Results screen with loaded design images
  121 |     await expect(page.getByText("Option 1")).toBeVisible();
  122 |     
  123 |     // Wait for at least one design image to actually load (naturalWidth > 0)
> 124 |     await page.waitForFunction(() => {
      |                ^ Error: page.waitForFunction: Test timeout of 30000ms exceeded.
  125 |       const images = Array.from(document.querySelectorAll('img[data-testid="private-image-loaded"]'));
  126 |       return images.some((img: any) => img.naturalWidth > 0);
  127 |     }, { timeout: 5000 });
  128 |     
  129 |     await page.screenshot({ path: "e2e/screens/a5-results.png", fullPage: true });
  130 | 
  131 |     // Select a design (click near the text "Option 1")
  132 |     await page.getByText("Option 1").click();
  133 | 
  134 |     // Click "Save Design"
  135 |     await page.getByRole("button", { name: /save design/i }).click();
  136 | 
  137 |     // Assert Project Detail screen, then screenshot
  138 |     await expect(page.getByText("Original Photo")).toBeInViewport({ timeout: 5000 });
  139 |     
  140 |     // Wait for design images in the grid to load
  141 |     await page.waitForFunction(() => {
  142 |       const images = Array.from(document.querySelectorAll('img[data-testid="private-image-loaded"]'));
  143 |       return images.some((img: any) => img.naturalWidth > 0);
  144 |     }, { timeout: 5000 });
  145 |     
  146 |     await page.screenshot({ path: "e2e/screens/a5-project-detail.png", fullPage: true });
  147 |     
  148 |     // Assert the original photo is NOT a design mock image (should be the uploaded test-room.jpg)
  149 |     // The original should have a file:// URI or blob: URI, not the mock design URL
  150 |     const originalImage = page.locator('img').first();
  151 |     const originalSrc = await originalImage.getAttribute('src');
  152 |     expect(originalSrc).toBeTruthy();
  153 |     expect(originalSrc).not.toContain('__mock__/design_'); // Not a generated design
  154 |     expect(originalSrc).not.toContain('Mock+Room+Design'); // Not the placeholder
  155 | 
  156 |     // Use browser back to return (likely to results, not home)
  157 |     await page.goBack();
  158 | 
  159 |     // Should be back on results screen, go back again
  160 |     await page.goBack();
  161 | 
  162 |     // Should be on editor/style screen, go back again
  163 |     await page.goBack();
  164 | 
  165 |     // Should be on camera screen, go back again
  166 |     await page.goBack();
  167 | 
  168 |     // Assert Home with project, then screenshot
  169 |     await expect(page.getByText(/renovation/i)).toBeVisible({ timeout: 5000 });
  170 |     
  171 |     // Wait for the project card image to load
  172 |     await page.waitForFunction(() => {
  173 |       const images = Array.from(document.querySelectorAll('img[data-testid="private-image-loaded"]'));
  174 |       return images.some((img: any) => img.naturalWidth > 0);
  175 |     }, { timeout: 5000 });
  176 |     
  177 |     await page.screenshot({ path: "e2e/screens/a5-home-with-project.png", fullPage: true });
  178 | 
  179 |     // Verify no console errors
  180 |     const errors: string[] = [];
  181 |     page.on("console", (msg) => {
  182 |       if (msg.type() === "error") {
  183 |         errors.push(msg.text());
  184 |       }
  185 |     });
  186 | 
  187 |     expect(errors).toHaveLength(0);
  188 |   });
  189 | 
  190 |   test("handles consent decline correctly", async ({ page }: { page: Page }) => {
  191 |     // Seed intro seen but NOT consented
  192 |     await page.addInitScript(() => {
  193 |       localStorage.setItem("@visionbuild:intro_seen", "true");
  194 |     });
  195 | 
  196 |     // Track requests to verify no analyze or generate requests are made
  197 |     const requests: string[] = [];
  198 |     page.on("request", (request) => {
  199 |       const url = request.url();
  200 |       if (url.includes("analyze-room") || url.includes("generate-design")) {
  201 |         requests.push(url);
  202 |       }
  203 |     });
  204 | 
  205 |     await page.goto(BASE_URL);
  206 |     await page.waitForLoadState("networkidle");
  207 | 
  208 |     // With intro seen but no consent, and mock session enabled,
  209 |     // app will navigate to Home -> AI consent check triggers -> consent screen
  210 |     // So we should land on consent screen directly
  211 |     // Assert consent screen visible, then screenshot
  212 |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 10000 });
  213 |     await page.screenshot({ path: "e2e/screens/a5-consent.png", fullPage: true });
  214 | 
  215 |     // Navigate back (decline consent)
  216 |     await page.goBack();
  217 | 
  218 |     // Should be back on Home screen now
  219 |     await expect(page.getByText("No projects yet")).toBeInViewport({ timeout: 5000 });
  220 | 
  221 |     // Try to start a project again
  222 |     await page.getByRole("button", { name: /start your first project/i }).click();
  223 | 
  224 |     // Should be on camera screen
```