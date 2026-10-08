# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-loop.spec.ts >> VisionBuild Create Loop >> handles image load failure with placeholder and retry
- Location: e2e/create-loop.spec.ts:262:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('private-image-placeholder')
Expected: visible
Timeout: 2000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('private-image-placeholder') with timeout 2000ms
  - waiting for getByTestId('private-image-placeholder')

```

```yaml
- link "Choose Style, back":
  - /url: /editor/mock-project-1791436124936?__EXPO_ROUTER_key=undefined-ieDx5j-CWzgHZW-ZTDMll
- heading "Your Designs" [level=1]
- text:  Room redesigned! Quest complete +50 XP  Swipe to browse. Tap to select your favorite.  AI visualization, not a plan or quote  Long-press any image to compare with original Option 1 Option 2 Option 3 Option 4
- button "Save Design" [disabled]:  Save Design
```

# Test source

```ts
  222 |     // So we should land on consent screen directly
  223 |     // Assert consent screen visible, then screenshot
  224 |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 10000 });
  225 |     await page.screenshot({ path: "e2e/screens/a5-consent.png", fullPage: true });
  226 | 
  227 |     // Navigate back (decline consent)
  228 |     await page.goBack();
  229 | 
  230 |     // Should be back on Home screen now
  231 |     await expect(page.getByText("No projects yet")).toBeInViewport({ timeout: 5000 });
  232 | 
  233 |     // Try to start a project again
  234 |     await page.getByRole("button", { name: /start your first project/i }).click();
  235 | 
  236 |     // Should be on camera screen
  237 |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  238 | 
  239 |     // Upload test image using filechooser pattern
  240 |     const [chooser] = await Promise.all([
  241 |       page.waitForEvent("filechooser"),
  242 |       page.getByRole("button", { name: /gallery/i }).click(),
  243 |     ]);
  244 |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  245 | 
  246 |     // Click Analyze - this should trigger consent check again
  247 |     await page.getByRole("button", { name: /analyze room/i }).click();
  248 | 
  249 |     // Should be on consent screen again
  250 |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
  251 | 
  252 |     // Navigate back again (decline again)
  253 |     await page.goBack();
  254 | 
  255 |     // Should be back on camera screen
  256 |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  257 | 
  258 |     // Verify no analyze or generate requests were made
  259 |     expect(requests).toHaveLength(0);
  260 |   });
  261 | 
  262 |   test("handles image load failure with placeholder and retry", async ({ page }: { page: Page }) => {
  263 |     // Seed intro seen and consent accepted
  264 |     await page.addInitScript(() => {
  265 |       localStorage.setItem("@visionbuild:intro_seen", "true");
  266 |       localStorage.setItem("@visionbuild:ai_consent", "true");
  267 |       localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
  268 |     });
  269 | 
  270 |     // Track all signed URL requests to verify retries
  271 |     const signedUrlRequests: string[] = [];
  272 |     let interceptFailures = true;
  273 |     
  274 |     // Intercept mock design image URLs that PrivateImage will request
  275 |     // Initially return 403 to trigger retry, then succeed after we verify placeholder
  276 |     await page.route(/\/__mock__\/design_\d+\.png/, async (route) => {
  277 |       const url = route.request().url();
  278 |       signedUrlRequests.push(url);
  279 |       
  280 |       if (interceptFailures) {
  281 |         // Abort the request to trigger retry and placeholder display
  282 |         // Note: abort() triggers onError more reliably than fulfill({status: 403})
  283 |         await route.abort('failed');
  284 |       } else {
  285 |         // Return a green image
  286 |         await route.fulfill({
  287 |           status: 200,
  288 |           contentType: "image/svg+xml",
  289 |           body: GREEN_IMAGE
  290 |         });
  291 |       }
  292 |     });
  293 | 
  294 |     await page.goto(BASE_URL);
  295 |     await page.waitForLoadState("networkidle");
  296 |     
  297 |     await page.getByRole("button", { name: /start your first project/i }).click();
  298 |     
  299 |     // Upload test image using filechooser pattern
  300 |     const [chooser] = await Promise.all([
  301 |       page.waitForEvent("filechooser"),
  302 |       page.getByRole("button", { name: /gallery/i }).click(),
  303 |     ]);
  304 |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  305 |     
  306 |     await page.getByRole("button", { name: /analyze room/i }).click();
  307 |     
  308 |     await page.getByText("Modern", { exact: true }).click();
  309 |     await page.getByRole("button", { name: /generate 4 designs/i }).click();
  310 |     
  311 |     // Wait for generating screen to pass
  312 |     await page.waitForTimeout(4000);
  313 |     
  314 |     // Wait for results screen
  315 |     await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
  316 | 
  317 |     // Wait for initial image load attempts to fail and show placeholder
  318 |     // PrivateImage retries after 500ms, then 1500ms, so wait enough time
  319 |     await page.waitForTimeout(2500);
  320 |     
  321 |     // Assert that placeholder is visible (the IsoRoom clay placeholder)
> 322 |     await expect(page.getByTestId("private-image-placeholder")).toBeVisible({ timeout: 2000 });
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  323 |     
  324 |     // Verify that multiple signed URL requests were made (initial + retries)
  325 |     const initialRequestCount = signedUrlRequests.length;
  326 |     expect(initialRequestCount).toBeGreaterThan(1); // At least one retry happened
  327 |     
  328 |     await page.screenshot({ path: "e2e/screens/a5-image-expired-placeholder.png", fullPage: true });
  329 |     
  330 |     // Now allow subsequent requests to succeed
  331 |     interceptFailures = false;
  332 |     
  333 |     // The retry logic should eventually request a fresh signed URL (v=2, v=3, etc.)
  334 |     // Wait for the component to make another retry attempt
  335 |     await page.waitForTimeout(2000);
  336 |     
  337 |     // Assert that design images eventually load after retry
  338 |     await page.waitForFunction(() => {
  339 |       const images = Array.from(document.querySelectorAll('img'));
  340 |       const designImages = images.filter((img: any) => {
  341 |         const src = img.getAttribute('src');
  342 |         return src && src.includes('__mock__/design_');
  343 |       });
  344 |       return designImages.length > 0 && designImages.some((img: any) => img.naturalWidth > 0);
  345 |     }, { timeout: 5000 });
  346 |     
  347 |     await page.screenshot({ path: "e2e/screens/a5-image-retried.png", fullPage: true });
  348 | 
  349 |     // Verify that additional signed URL requests were made (for the retry)
  350 |     expect(signedUrlRequests.length).toBeGreaterThan(initialRequestCount);
  351 |   });
  352 | });
  353 | 
```