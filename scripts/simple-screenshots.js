const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = '/opt/cursor/artifacts/screenshots';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const md5Hashes = new Set();

async function captureScreen(page, name, waitForText = null) {
  console.log(`\n📸 Capturing: ${name}`);
  await page.waitForTimeout(2000); // Initial wait
  
  if (waitForText) {
    try {
      await page.waitForSelector(`text=${waitForText}`, { timeout: 15000 });
      console.log(`✓ Found: "${waitForText}"`);
    } catch (e) {
      console.log(`⚠️  Timeout waiting for: "${waitForText}"`);
      console.log(`   Current URL: ${page.url()}`);
      console.log(`   Page title: ${await page.title()}`);
    }
  }
  
  await page.waitForTimeout(2000); // Extra render time
  
  const path_to_save = path.join(SCREENSHOT_DIR, `game-${name}.png`);
  await page.screenshot({ path: path_to_save });
  
  const buffer = fs.readFileSync(path_to_save);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  
  if (md5Hashes.has(hash)) {
    console.error(`❌ Duplicate: ${name} (hash: ${hash})`);
    process.exit(1);
  }
  
  md5Hashes.add(hash);
  console.log(`✓ Saved ${name} (${hash.substring(0, 8)}...)`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  
  // Mock session
  await page.addInitScript(() => {
    window.process = { env: { EXPO_PUBLIC_DEV_MOCK_SESSION: 'true' } };
  });
  
  // 1. Sign-in
  await page.goto(`${BASE_URL}/sign-in`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'sign-in', 'Continue with Google');
  
  // 2. Home
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'home', 'Projects');
  
  // 3. Explore
  await page.goto(`${BASE_URL}/explore`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'explore', 'Explore');
  
  // 4. Style picker
  await page.goto(`${BASE_URL}/editor/mock-id`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'style-picker', 'Modern');
  
  // 5. Generating
  await page.goto(`${BASE_URL}/generating/mock-id`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'generating', 'Building');
  
  // 6. Results
  await page.goto(`${BASE_URL}/result/mock-id`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'results-xp', 'Swipe');
  
  // 7. Vi chat
  await page.goto(`${BASE_URL}/assistant-chat`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'vi-chat', 'Design Assistant');
  
  // 8. Settings
  await page.goto(`${BASE_URL}/profile-settings`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'settings', 'Settings');
  
  // 9. Daily limit
  await page.goto(`${BASE_URL}/result-error?type=rate-limit`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'daily-limit', 'Daily Render');
  
  // 10. Project detail
  await page.goto(`${BASE_URL}/project/mock-id`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'project-detail', 'Designs');
  
  // 11. Inbox (contractor thread)
  await page.goto(`${BASE_URL}/inbox`);
  await page.waitForLoadState('networkidle');
  await captureScreen(page, 'contractor-thread', 'Inbox');
  
  await browser.close();
  console.log(`\n✅ Captured ${md5Hashes.size} unique screenshots`);
})();
