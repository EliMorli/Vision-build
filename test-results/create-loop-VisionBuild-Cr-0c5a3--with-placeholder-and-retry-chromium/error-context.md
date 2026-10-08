# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-loop.spec.ts >> VisionBuild Create Loop >> handles image load failure with placeholder and retry
- Location: e2e/create-loop.spec.ts:247:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('private-image-placeholder').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('private-image-placeholder').first() with timeout 5000ms
  - waiting for getByTestId('private-image-placeholder').first()

```

```yaml
- link "Choose Style, back":
  - /url: /editor/mock-project-1791438054959?__EXPO_ROUTER_key=undefined-_V6YItTCVb9WsCqCXIgr_
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
  211 | 
  212 |     // Navigate back (decline consent)
  213 |     await page.goBack();
  214 | 
  215 |     // Should be back on Home screen now
  216 |     await expect(page.getByText("No projects yet")).toBeInViewport({ timeout: 5000 });
  217 | 
  218 |     // Try to start a project again
  219 |     await page.getByRole("button", { name: /start your first project/i }).click();
  220 | 
  221 |     // Should be on camera screen
  222 |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  223 | 
  224 |     // Upload test image using filechooser pattern
  225 |     const [chooser] = await Promise.all([
  226 |       page.waitForEvent("filechooser"),
  227 |       page.getByRole("button", { name: /gallery/i }).click(),
  228 |     ]);
  229 |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  230 | 
  231 |     // Click Analyze - this should trigger consent check again
  232 |     await page.getByRole("button", { name: /analyze room/i }).click();
  233 | 
  234 |     // Should be on consent screen again
  235 |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
  236 | 
  237 |     // Navigate back again (decline again)
  238 |     await page.goBack();
  239 | 
  240 |     // Should be back on camera screen
  241 |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  242 | 
  243 |     // Verify no analyze or generate requests were made
  244 |     expect(requests).toHaveLength(0);
  245 |   });
  246 | 
  247 |   test("handles image load failure with placeholder and retry", async ({ page }: { page: Page }) => {
  248 |     // Seed intro seen and consent accepted
  249 |     await page.addInitScript(() => {
  250 |       localStorage.setItem("@visionbuild:intro_seen", "true");
  251 |       localStorage.setItem("@visionbuild:ai_consent", "true");
  252 |       localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
  253 |     });
  254 | 
  255 |     // Track all signed URL requests to verify retries
  256 |     const signedUrlRequests: string[] = [];
  257 |     let requestCount = 0;
  258 |     let resolveHold!: () => void;
  259 |     const holdPromise = new Promise<void>((resolve) => { resolveHold = resolve; });
  260 |     
  261 |     // Intercept mock design image URLs
  262 |     // First request: return 403 to trigger error
  263 |     // Retry requests: hold on a promise so we can capture the placeholder state
  264 |     // After release: let requests through to succeed
  265 |     await page.route(/\/__mock__\/design_\d+\.svg/, async (route) => {
  266 |       const url = route.request().url();
  267 |       requestCount++;
  268 |       const reqNum = requestCount;
  269 |       signedUrlRequests.push(url);
  270 |       
  271 |       if (reqNum <= 4) {
  272 |         // First batch: return 403 to trigger handleImageError
  273 |         console.log(`[TEST] Request #${reqNum}: returning 403`);
  274 |         await route.fulfill({ status: 403, body: 'Forbidden' });
  275 |       } else if (reqNum <= 8) {
  276 |         // Retry batch: hold on promise so placeholder shows
  277 |         console.log(`[TEST] Request #${reqNum}: holding on promise`);
  278 |         await holdPromise;
  279 |         console.log(`[TEST] Request #${reqNum}: released, continuing to real file`);
  280 |         await route.continue();
  281 |       } else {
  282 |         // Final retries after placeholder captured: let through
  283 |         console.log(`[TEST] Request #${reqNum}: passing through`);
  284 |         await route.continue();
  285 |       }
  286 |     });
  287 | 
  288 |     await page.goto(BASE_URL);
  289 |     await page.waitForLoadState("networkidle");
  290 |     
  291 |     await page.getByRole("button", { name: /start your first project/i }).click();
  292 |     
  293 |     const [chooser] = await Promise.all([
  294 |       page.waitForEvent("filechooser"),
  295 |       page.getByRole("button", { name: /gallery/i }).click(),
  296 |     ]);
  297 |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  298 |     
  299 |     await page.getByRole("button", { name: /analyze room/i }).click();
  300 |     await page.getByText("Modern", { exact: true }).click();
  301 |     await page.getByRole("button", { name: /generate 4 designs/i }).click();
  302 |     await page.waitForTimeout(4000);
  303 |     await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
  304 | 
  305 |     // Wait for initial 403s to trigger, then wait for retries to be held
  306 |     // The first requests return 403, then retries are held on promise
  307 |     await page.waitForTimeout(2500);
  308 |     
  309 |     // Assert that the clay IsoRoom placeholder is visible (not blank)
  310 |     const placeholder = page.getByTestId("private-image-placeholder").first();
> 311 |     await expect(placeholder).toBeVisible({ timeout: 5000 });
      |                               ^ Error: expect(locator).toBeVisible() failed
  312 |     
  313 |     // Verify placeholder has non-zero bounding box
  314 |     const boundingBox = await placeholder.boundingBox();
  315 |     expect(boundingBox).not.toBeNull();
  316 |     expect(boundingBox!.width).toBeGreaterThan(0);
  317 |     expect(boundingBox!.height).toBeGreaterThan(0);
  318 |     
  319 |     // Take screenshot showing clay placeholder (should show IsoRoom, not blank)
  320 |     await page.screenshot({ path: "e2e/screens/a5-image-expired-placeholder.png", fullPage: true });
  321 |     
  322 |     // Release the hold so retry requests can proceed
  323 |     console.log('[TEST] Releasing hold, allowing retry requests through');
  324 |     resolveHold();
  325 |     
  326 |     // Wait for images to load after retry succeeds
  327 |     await page.waitForFunction(() => {
  328 |       const images = Array.from(document.querySelectorAll('img'));
  329 |       const designImages = images.filter((img: any) => {
  330 |         const src = img.getAttribute('src');
  331 |         return src && src.includes('__mock__/design_');
  332 |       });
  333 |       return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
  334 |     }, { timeout: 10000 });
  335 |     
  336 |     await page.screenshot({ path: "e2e/screens/a5-image-retried.png", fullPage: true });
  337 | 
  338 |     // Verify that retries happened
  339 |     console.log(`[TEST] Total requests: ${signedUrlRequests.length}`);
  340 |     expect(signedUrlRequests.length).toBeGreaterThan(4);
  341 |   });
  342 | });
  343 | 
```