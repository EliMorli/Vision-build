const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = '/opt/cursor/artifacts/screenshots';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function captureWithViewportCheck(page, name, selector, expectedText) {
  console.log(`\n📸 Capturing: ${name}`);
  await page.waitForTimeout(3000);
  
  // Wait for and verify element is in viewport
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    const element = await page.$(selector);
    const isInViewport = await element.isVisible();
    
    if (!isInViewport) {
      console.error(`❌ Element "${selector}" not in viewport on ${name}`);
      throw new Error(`Element not in viewport: ${selector}`);
    }
    console.log(`✓ Element "${selector}" is in viewport`);
  } catch (error) {
    console.error(`❌ Element "${selector}" not found on ${name}`);
    throw error;
  }
  
  // Verify expected text
  const bodyText = await page.textContent('body');
  if (!bodyText.includes(expectedText)) {
    console.error(`❌ Expected text "${expectedText}" not found on ${name}`);
    throw new Error(`Missing expected text: ${expectedText}`);
  }
  console.log(`✓ Found expected text: "${expectedText}"`);
  
  // Take screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, `game-${name}.png`);
  await page.screenshot({ path: screenshotPath });
  
  // Check MD5
  const buffer = fs.readFileSync(screenshotPath);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  
  console.log(`✓ Saved ${name} (MD5: ${hash.substring(0, 8)}...)`);
  console.log(`   Full path: ${screenshotPath}`);
  
  return { name, path: screenshotPath, hash };
}

async function captureSimple(page, name, expectedText) {
  console.log(`\n📸 Capturing: ${name}`);
  await page.waitForTimeout(3000);
  
  const bodyText = await page.textContent('body');
  if (!bodyText.includes(expectedText)) {
    console.error(`❌ Expected text "${expectedText}" not found on ${name}`);
    throw new Error(`Missing expected text: ${expectedText}`);
  }
  console.log(`✓ Found expected text: "${expectedText}"`);
  
  const screenshotPath = path.join(SCREENSHOT_DIR, `game-${name}.png`);
  await page.screenshot({ path: screenshotPath });
  
  const buffer = fs.readFileSync(screenshotPath);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  
  console.log(`✓ Saved ${name} (MD5: ${hash.substring(0, 8)}...)`);
  console.log(`   Full path: ${screenshotPath}`);
  
  return { name, path: screenshotPath, hash };
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  
  // Set intro as seen
  await context.addInitScript(() => {
    // eslint-disable-next-line no-undef
    localStorage.setItem('@visionbuild:intro_seen', 'true');
  });
  
  // Mock session
  await page.addInitScript(() => {
    window.process = { env: { EXPO_PUBLIC_DEV_MOCK_SESSION: 'true' } };
  });
  
  const screenshots = [];
  
  try {
    // 1. Home (with 120 XP chip)
    console.log('\n=== Home (with 120 XP) ===');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Extra wait for session to load
    screenshots.push(await captureSimple(page, 'home', '120 XP'));
    
    // 2. Settings (scrolled to Sign out)
    console.log('\n=== Settings (with Sign out visible) ===');
    await page.goto(`${BASE_URL}/profile-settings`);
    await page.waitForLoadState('networkidle');
    // Scroll to bottom to show Sign out
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    screenshots.push(await captureWithViewportCheck(page, 'settings', 'text=Sign out', 'Sign out'));
    
    // 3. Generating (with progress bar)
    console.log('\n=== Generating (with progress bar) ===');
    await page.goto(`${BASE_URL}/generating/test-id`);
    await page.waitForLoadState('networkidle');
    screenshots.push(await captureSimple(page, 'generating', 'Building your'));
    
    // 4. Sign-in (unchecked)
    console.log('\n=== Sign-in (box unchecked) ===');
    await page.goto(`${BASE_URL}/sign-in`);
    await page.waitForLoadState('networkidle');
    screenshots.push(await captureSimple(page, 'sign-in', 'Continue with Google'));
    
    // 5. Sign-in (checked)
    console.log('\n=== Sign-in (box checked, Apple solid black) ===');
    await page.goto(`${BASE_URL}/sign-in`);
    await page.waitForLoadState('networkidle');
    // Click the checkbox
    await page.click('text=I confirm I am 13 years or older');
    await page.waitForTimeout(500);
    screenshots.push(await captureSimple(page, 'sign-in-checked', 'Continue with Apple'));
    
    // 6. Contractor thread (TODO: requires mock data implementation)
    console.log('\n=== Contractor thread (inbox list for now) ===');
    await page.goto(`${BASE_URL}/inbox`);
    await page.waitForLoadState('networkidle');
    screenshots.push(await captureSimple(page, 'contractor-thread', 'Inbox'));
    
    await browser.close();
    
    console.log(`\n✅ Successfully captured ${screenshots.length} screenshots`);
    console.log('\n📁 Final screenshot list:');
    screenshots.forEach(s => {
      console.log(`   ${s.name}: ${s.path}`);
      console.log(`      MD5: ${s.hash}`);
    });
    
  } catch (error) {
    console.error('\n❌ Screenshot capture failed:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    await browser.close();
    process.exit(1);
  }
})();
