# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: consent-flow.spec.ts >> VisionBuild AI Consent Flow >> generate-design triggers re-consent flow
- Location: e2e/consent-flow.spec.ts:151:7

# Error details

```
Error: expect(locator).toBeInViewport() failed

Locator:  getByText(/building your/i).first()
Expected: in viewport
Received: viewport ratio 0
Timeout:  10000ms

Call log:
  - Expect "toBeInViewport" getByText(/building your/i).first() with timeout 10000ms
  - waiting for getByText(/building your/i).first()
    10 × locator resolved to <div dir="auto" class="css-text-146c3p1 r-color-jwli3a r-fontSize-1x35g6 r-fontWeight-1kfrs79 r-marginBottom-zd98yo r-textAlign-q4m81j">Building your↵modern room</div>
       - unexpected value "viewport ratio 0"
    13 × locator resolved to <div dir="auto" class="css-text-146c3p1 r-color-jwli3a r-fontSize-1x35g6 r-fontWeight-1kfrs79 r-marginBottom-zd98yo r-textAlign-q4m81j">Building your↵modern minimalist style with clean …</div>
       - unexpected value "viewport ratio 0"

```

```yaml
- link "generating/[id], back":
  - /url: /generating/mock-project-1791443776045?__EXPO_ROUTER_key=undefined-veJ0jI38iJr2mER-_lzKT
- heading "Your Designs" [level=1]
- text:  Room redesigned! Quest complete +50 XP  Swipe to browse. Tap to select your favorite.  AI visualization, not a plan or quote  Long-press any image to compare with original
- img "Design option 1"
- text: Option 1
- img "Design option 2"
- text: Option 2
- img "Design option 3"
- text: Option 3
- img "Design option 4"
- text: Option 4
- button "Save Design" [disabled]:  Save Design
```

# Test source

```ts
  94  |     await page.getByRole("button", { name: /continue/i }).click();
  95  | 
  96  |     // Should resume to style picker
  97  |     await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });
  98  |   });
  99  | 
  100 |   test("decline in re-consent returns to project without calling AI", async ({ page }: { page: Page }) => {
  101 |     // Seed with intro seen, outdated consent, and an existing project
  102 |     await page.addInitScript(() => {
  103 |       localStorage.setItem("@visionbuild:intro_seen", "true");
  104 |       localStorage.setItem("@visionbuild:ai_consent", "true");
  105 |       localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-01");
  106 |       localStorage.setItem("@visionbuild:mock_consent_version", "2026-10-01"); // Must be set to trigger check
  107 |     });
  108 | 
  109 |     // Track AI requests to verify none are made after decline
  110 |     const aiRequests: string[] = [];
  111 |     page.on("request", (request) => {
  112 |       const url = request.url();
  113 |       if (url.includes("analyze-room") || url.includes("generate-design")) {
  114 |         aiRequests.push(url);
  115 |       }
  116 |     });
  117 | 
  118 |     await page.goto(BASE_URL);
  119 |     await page.waitForLoadState("networkidle");
  120 | 
  121 |     // Start a project
  122 |     await page.getByRole("button", { name: /start your first project/i }).click();
  123 | 
  124 |     // Upload image
  125 |     const [chooser] = await Promise.all([
  126 |       page.waitForEvent("filechooser"),
  127 |       page.getByRole("button", { name: /gallery/i }).click(),
  128 |     ]);
  129 |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  130 | 
  131 |     // Click Analyze - triggers consent
  132 |     await page.getByRole("button", { name: /analyze room/i }).click();
  133 | 
  134 |     // Wait for consent screen
  135 |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
  136 | 
  137 |     // Click Decline
  138 |     await page.getByRole("button", { name: /decline/i }).click();
  139 | 
  140 |     // Should be back on camera screen (photo still there)
  141 |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport({ timeout: 5000 });
  142 |     await expect(page.getByRole("button", { name: /analyze room/i })).toBeVisible();
  143 |     
  144 |     // Screenshot showing we're back with photo preserved
  145 |     await page.screenshot({ path: "e2e/screens/a7-reconsent-declined-project.png", fullPage: true });
  146 | 
  147 |     // Verify no AI requests were made after decline
  148 |     expect(aiRequests).toHaveLength(0);
  149 |   });
  150 | 
  151 |   test("generate-design triggers re-consent flow", async ({ page }: { page: Page }) => {
  152 |     // Seed with intro seen, consent accepted initially
  153 |     await page.addInitScript(() => {
  154 |       localStorage.setItem("@visionbuild:intro_seen", "true");
  155 |       localStorage.setItem("@visionbuild:ai_consent", "true");
  156 |       localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
  157 |       // Start with current consent (no mock_consent_version key, so consent check is skipped initially)
  158 |     });
  159 | 
  160 |     await page.goto(BASE_URL);
  161 |     await page.waitForLoadState("networkidle");
  162 | 
  163 |     // Start a project
  164 |     await page.getByRole("button", { name: /start your first project/i }).click();
  165 | 
  166 |     // Upload image
  167 |     const [chooser] = await Promise.all([
  168 |       page.waitForEvent("filechooser"),
  169 |       page.getByRole("button", { name: /gallery/i }).click(),
  170 |     ]);
  171 |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  172 | 
  173 |     // Analyze passes (consent check is skipped because mock_consent_version not set)
  174 |     await page.getByRole("button", { name: /analyze room/i }).click();
  175 |     await expect(page.getByText("Select a Design Style")).toBeInViewport({ timeout: 10000 });
  176 | 
  177 |     // Now simulate consent becoming outdated (e.g., policy updated between analyze and generate)
  178 |     await page.evaluate(() => {
  179 |       localStorage.setItem("@visionbuild:mock_consent_version", "2026-10-01"); // Set to old version to trigger outdated check
  180 |     });
  181 | 
  182 |     // Select style and generate
  183 |     await page.getByText("Modern", { exact: true }).click();
  184 |     await page.getByRole("button", { name: /generate 4 designs/i }).click();
  185 | 
  186 |     // Should trigger re-consent (outdated)
  187 |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
  188 |     await expect(page.getByText(/We've updated how your photos are handled/i)).toBeVisible();
  189 | 
  190 |     // Accept
  191 |     await page.getByRole("button", { name: /continue/i }).click();
  192 | 
  193 |     // Should resume to generating screen
> 194 |     await expect(page.getByText(/building your/i).first()).toBeInViewport({ timeout: 10000 });
      |                                                            ^ Error: expect(locator).toBeInViewport() failed
  195 | 
  196 |     // Wait for results
  197 |     await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
  198 |   });
  199 | });
  200 | 
```