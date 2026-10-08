# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-loop.spec.ts >> VisionBuild Create Loop >> handles image load failure with placeholder and retry
- Location: e2e/create-loop.spec.ts:250:7

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
  - /url: /editor/mock-project-1791435678288?__EXPO_ROUTER_key=undefined-Gx6c7-JGN-Rbg2UMhpP_l
- heading "Your Designs" [level=1]
- text:  Room redesigned! Quest complete +50 XP  Swipe to browse. Tap to select your favorite.  AI visualization, not a plan or quote  Long-press any image to compare with original Option 1 Option 2 Option 3 Option 4
- button "Save Design" [disabled]:  Save Design
```

# Test source

```ts
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
  225 |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  226 | 
  227 |     // Upload test image using filechooser pattern
  228 |     const [chooser] = await Promise.all([
  229 |       page.waitForEvent("filechooser"),
  230 |       page.getByRole("button", { name: /gallery/i }).click(),
  231 |     ]);
  232 |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  233 | 
  234 |     // Click Analyze - this should trigger consent check again
  235 |     await page.getByRole("button", { name: /analyze room/i }).click();
  236 | 
  237 |     // Should be on consent screen again
  238 |     await expect(page.getByText("AI-Powered Designs")).toBeInViewport({ timeout: 5000 });
  239 | 
  240 |     // Navigate back again (decline again)
  241 |     await page.goBack();
  242 | 
  243 |     // Should be back on camera screen
  244 |     await expect(page.getByText(/take a photo or pick one/i)).toBeInViewport();
  245 | 
  246 |     // Verify no analyze or generate requests were made
  247 |     expect(requests).toHaveLength(0);
  248 |   });
  249 | 
  250 |   test("handles image load failure with placeholder and retry", async ({ page }: { page: Page }) => {
  251 |     // Seed intro seen and consent accepted
  252 |     await page.addInitScript(() => {
  253 |       localStorage.setItem("@visionbuild:intro_seen", "true");
  254 |       localStorage.setItem("@visionbuild:ai_consent", "true");
  255 |       localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
  256 |     });
  257 | 
  258 |     // Track all signed URL requests to verify retries
  259 |     const signedUrlRequests: string[] = [];
  260 |     let interceptFailures = true;
  261 |     
  262 |     // Intercept mock design image URLs that PrivateImage will request
  263 |     // Initially return 403 to trigger retry, then succeed after we verify placeholder
  264 |     await page.route("**/__mock__/design_*.png*", async (route) => {
  265 |       const url = route.request().url();
  266 |       signedUrlRequests.push(url);
  267 |       
  268 |       if (interceptFailures) {
  269 |         // Return 403 to trigger retry and placeholder display
  270 |         await route.fulfill({ 
  271 |           status: 403, 
  272 |           body: "Forbidden",
  273 |           contentType: "text/plain"
  274 |         });
  275 |       } else {
  276 |         // Let the request go through to the actual file
  277 |         await route.continue();
  278 |       }
  279 |     });
  280 | 
  281 |     await page.goto(BASE_URL);
  282 |     await page.waitForLoadState("networkidle");
  283 |     
  284 |     await page.getByRole("button", { name: /start your first project/i }).click();
  285 |     
  286 |     // Upload test image using filechooser pattern
  287 |     const [chooser] = await Promise.all([
  288 |       page.waitForEvent("filechooser"),
  289 |       page.getByRole("button", { name: /gallery/i }).click(),
  290 |     ]);
  291 |     await chooser.setFiles("e2e/fixtures/test-room.jpg");
  292 |     
  293 |     await page.getByRole("button", { name: /analyze room/i }).click();
  294 |     
  295 |     await page.getByText("Modern", { exact: true }).click();
  296 |     await page.getByRole("button", { name: /generate 4 designs/i }).click();
  297 |     
  298 |     // Wait for generating screen to pass
  299 |     await page.waitForTimeout(4000);
  300 |     
  301 |     // Wait for results screen
  302 |     await expect(page.getByText(/swipe to browse/i)).toBeInViewport({ timeout: 30000 });
  303 | 
  304 |     // Wait for initial image load attempts to fail and show placeholder
  305 |     // PrivateImage retries after 500ms, then 1500ms, so wait enough time
  306 |     await page.waitForTimeout(2500);
  307 |     
  308 |     // Assert that placeholder is visible (the IsoRoom clay placeholder)
> 309 |     await expect(page.getByTestId("private-image-placeholder")).toBeVisible({ timeout: 2000 });
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  310 |     
  311 |     // Verify that multiple signed URL requests were made (initial + retries)
  312 |     const initialRequestCount = signedUrlRequests.length;
  313 |     expect(initialRequestCount).toBeGreaterThan(1); // At least one retry happened
  314 |     
  315 |     await page.screenshot({ path: "e2e/screens/a5-image-expired-placeholder.png", fullPage: true });
  316 |     
  317 |     // Now allow subsequent requests to succeed
  318 |     interceptFailures = false;
  319 |     
  320 |     // The retry logic should eventually request a fresh signed URL (v=2, v=3, etc.)
  321 |     // Wait for the component to make another retry attempt
  322 |     await page.waitForTimeout(2000);
  323 |     
  324 |     // Assert that the image eventually loads after retry
  325 |     await expect(page.getByTestId("private-image-loaded")).toBeVisible({ timeout: 3000 });
  326 |     
  327 |     // Verify image actually loaded with non-zero dimensions
  328 |     await page.waitForFunction(() => {
  329 |       const img = document.querySelector('img[data-testid="private-image-loaded"]') as HTMLImageElement;
  330 |       return img && img.naturalWidth > 0;
  331 |     }, { timeout: 3000 });
  332 |     
  333 |     await page.screenshot({ path: "e2e/screens/a5-image-retried.png", fullPage: true });
  334 | 
  335 |     // Verify that additional signed URL requests were made (for the retry)
  336 |     expect(signedUrlRequests.length).toBeGreaterThan(initialRequestCount);
  337 |   });
  338 | });
  339 | 
```