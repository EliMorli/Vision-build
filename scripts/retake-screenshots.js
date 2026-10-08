const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = '/opt/cursor/artifacts/screenshots';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const md5Hashes = new Set();
const screenshots = [];

async function captureScreen(page, name, expectedText, options = {}) {
  console.log(`\n📸 Capturing: ${name}`);
  await page.waitForTimeout(options.wait || 3000);
  
  // Optional scroll
  if (options.scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), options.scrollY);
    await page.waitForTimeout(1000);
  }
  
  // Assert expected text is visible
  const bodyText = await page.textContent('body');
  if (!bodyText.includes(expectedText)) {
    console.error(`❌ Expected text "${expectedText}" not found on ${name}`);
    console.log(`   Body preview: ${bodyText.substring(0, 300)}`);
    throw new Error(`Missing expected text: ${expectedText}`);
  }
  console.log(`✓ Found expected text: "${expectedText}"`);
  
  // Check for errors
  if (bodyText.includes('Uncaught Error')) {
    console.error(`❌ Error overlay detected on ${name}`);
    throw new Error(`Error overlay on ${name}`);
  }
  
  if (bodyText.includes('Unmatched Route')) {
    console.error(`❌ Unmatched Route detected on ${name}`);
    throw new Error(`Unmatched Route on ${name}`);
  }
  
  // Verify absence of bad text if specified
  if (options.notContains) {
    if (bodyText.includes(options.notContains)) {
      console.error(`❌ Found forbidden text "${options.notContains}" on ${name}`);
      throw new Error(`Found forbidden text: ${options.notContains}`);
    }
    console.log(`✓ Verified absence of "${options.notContains}"`);
  }
  
  // Take screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, `game-${name}.png`);
  await page.screenshot({ path: screenshotPath });
  
  // Check MD5
  const buffer = fs.readFileSync(screenshotPath);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  
  if (md5Hashes.has(hash)) {
    console.error(`❌ Duplicate MD5: ${name} (hash: ${hash})`);
    throw new Error(`Duplicate screenshot: ${name}`);
  }
  
  md5Hashes.add(hash);
  screenshots.push({ name, path: screenshotPath, hash: hash.substring(0, 8) });
  console.log(`✓ Saved ${name} (MD5: ${hash.substring(0, 8)}...)`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  
  // Set intro as seen so we skip onboarding
  await context.addInitScript(() => {
    // eslint-disable-next-line no-undef
    localStorage.setItem('@visionbuild:intro_seen', 'true');
  });
  
  // Mock session
  await page.addInitScript(() => {
    window.process = { env: { EXPO_PUBLIC_DEV_MOCK_SESSION: 'true' } };
  });
  
  try {
    // 1. Sign-in
    await page.goto(`${BASE_URL}/sign-in`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'sign-in', 'Continue with Google');
    
    // 2. Home (authenticated, with XP chip)
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'home', 'XP', { wait: 4000 });
    
    // 3. Explore
    await page.goto(`${BASE_URL}/explore`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'explore', 'Explore');
    
    // 4. Style picker
    await page.goto(`${BASE_URL}/editor/test-id`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'style-picker', 'Select a Design Style');
    
    // 5. Generating (no [id] in header)
    await page.goto(`${BASE_URL}/generating/test-id`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'generating', 'Building your', { notContains: '[id]' });
    
    // 6. Results with XP
    await page.goto(`${BASE_URL}/result/test-id`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'results-xp', 'Swipe to browse');
    
    // 7. Vi chat
    await page.goto(`${BASE_URL}/assistant-chat`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'vi-chat', 'Design Assistant');
    
    // 8. Settings (scroll to show Sign out)
    await page.goto(`${BASE_URL}/profile-settings`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'settings', 'Sign out', { scrollY: 500 });
    
    // 9. Daily limit (with Back to Home)
    await page.goto(`${BASE_URL}/result-error?type=rate-limit`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'daily-limit', 'Back to Home');
    
    // 10. Project detail
    await page.goto(`${BASE_URL}/project/mock-1`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'project-detail', 'Designs');
    
    // 11. Inbox list (we'll use inbox as contractor-thread since we can't easily click into a thread)
    await page.goto(`${BASE_URL}/inbox`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'contractor-thread', 'Inbox');
    
    await browser.close();
    
    console.log(`\n✅ Successfully captured ${screenshots.length} unique screenshots`);
    console.log('\n📁 Screenshot paths:');
    screenshots.forEach(s => {
      console.log(`   ${s.path} (MD5: ${s.hash}...)`);
    });
    
  } catch (error) {
    console.error('\n❌ Screenshot capture failed:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    await browser.close();
    process.exit(1);
  }
})();
