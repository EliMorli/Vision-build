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

async function captureScreen(page, name, expectedText) {
  console.log(`\n📸 Capturing: ${name}`);
  await page.waitForTimeout(3000); // Wait for rendering
  
  // Assert expected text is visible
  const bodyText = await page.textContent('body');
  if (!bodyText.includes(expectedText)) {
    console.error(`❌ Expected text "${expectedText}" not found on ${name}`);
    console.log(`   Body preview: ${bodyText.substring(0, 200)}`);
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
  const page = await browser.newPage({ viewport: VIEWPORT });
  
  // Mock session
  await page.addInitScript(() => {
    window.process = { env: { EXPO_PUBLIC_DEV_MOCK_SESSION: 'true' } };
  });
  
  try {
    // 1. Sign-in
    await page.goto(`${BASE_URL}/sign-in`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'sign-in', 'Continue with Google');
    
    // 2. Home
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'home', 'AI Redesigns It');
    
    // 3. Explore
    await page.goto(`${BASE_URL}/explore`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'explore', 'Explore');
    
    // 4. Style picker
    await page.goto(`${BASE_URL}/editor/test-id`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'style-picker', 'Select a Design Style');
    
    // 5. Generating
    await page.goto(`${BASE_URL}/generating/test-id`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'generating', 'Building your');
    
    // 6. Results with XP
    await page.goto(`${BASE_URL}/result/test-id`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'results-xp', 'Swipe to browse');
    
    // 7. Vi chat
    await page.goto(`${BASE_URL}/assistant-chat`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'vi-chat', 'Design Assistant');
    
    // 8. Settings (with Sign out)
    await page.goto(`${BASE_URL}/profile-settings`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'settings', 'Sign out');
    
    // 9. Daily limit (with Back to Home)
    await page.goto(`${BASE_URL}/result-error?type=rate-limit`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'daily-limit', 'Back to Home');
    
    // 10. Project detail (with Private/Public switch)
    await page.goto(`${BASE_URL}/project/test-id`);
    await page.waitForLoadState('networkidle');
    await captureScreen(page, 'project-detail', 'Designs');
    
    // 11. Inbox (contractor thread)
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
    await browser.close();
    process.exit(1);
  }
})();
