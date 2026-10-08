const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = '/opt/cursor/artifacts/screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const md5Hashes = new Set();

async function takeScreenshot(page, name, expectedText, skipErrorCheck = false) {
  console.log(`\n📸 Taking screenshot: ${name}`);
  
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Extra wait for React rendering
  
  // Wait for expected text to be visible
  try {
    await page.waitForSelector(`text="${expectedText}"`, { timeout: 10000 });
    console.log(`✓ Found expected text: "${expectedText}"`);
  } catch (e) {
    console.log(`⚠️  Warning: Expected text "${expectedText}" not found`);
    // Try to find it in the page content
    const bodyText = await page.textContent('body');
    if (bodyText.includes(expectedText)) {
      console.log(`✓ Text found in body (but not as visible element)`);
    } else {
      console.log(`Page title: ${await page.title()}`);
    }
  }
  
  if (!skipErrorCheck) {
    // Check for errors
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Uncaught Error') || bodyText.includes('Unmatched Route')) {
      console.error(`❌ Error detected on ${name}`);
      await page.screenshot({ path: `/tmp/error-${name}.png` });
      throw new Error(`Error detected on ${name}`);
    }
  }
  
  // Take screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, `game-${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  // Check MD5
  const buffer = fs.readFileSync(screenshotPath);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  
  if (md5Hashes.has(hash)) {
    console.error(`❌ Duplicate MD5 hash detected for ${name}: ${hash}`);
    await page.screenshot({ path: `/tmp/duplicate-${name}.png` });
    throw new Error(`Duplicate screenshot: ${name}`);
  }
  
  md5Hashes.add(hash);
  console.log(`✓ Screenshot saved: ${screenshotPath} (MD5: ${hash.substring(0, 8)}...)`);
  
  return screenshotPath;
}

async function setupMockData(page) {
  // Inject mock data into the store
  await page.evaluate(() => {
    const mockProfile = {
      id: 'mock-user',
      email: 'demo@visionbuild.app',
      display_name: 'Elimar',
      photo_url: null,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      xp: 120,
      level: 1,
    };
    
    const mockProjects = [
      {
        id: 'project-1',
        user_id: 'mock-user',
        title: 'Kitchen',
        original_image_url: 'https://placehold.co/600x400/1A73E8/FFFFFF?text=Kitchen',
        selected_style: 'modern',
        generated_image_urls: [
          'https://placehold.co/600x400/34A853/FFFFFF?text=Design+1',
          'https://placehold.co/600x400/FBBC04/FFFFFF?text=Design+2',
        ],
        selected_generation_url: 'https://placehold.co/600x400/34A853/FFFFFF?text=Design+1',
        status: 'generated',
        room_analysis: { rawAnalysis: 'Modern kitchen, 180 sq ft', roomType: 'kitchen' },
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'project-2',
        user_id: 'mock-user',
        title: 'Living room',
        original_image_url: 'https://placehold.co/600x400/EA4335/FFFFFF?text=Living',
        selected_style: 'farmhouse',
        generated_image_urls: [],
        selected_generation_url: null,
        status: 'analyzed',
        room_analysis: { rawAnalysis: 'Farmhouse living room, 240 sq ft', roomType: 'living room' },
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    // Set mock auth session
    if (window.useAuthStore) {
      window.useAuthStore.setState({
        session: { user: { id: 'mock-user' } },
        profile: mockProfile,
      });
    }
    
    // Set mock projects
    if (window.useProjectStore) {
      window.useProjectStore.setState({
        projects: mockProjects,
        currentProject: mockProjects[0],
      });
    }
  });
}

(async () => {
  console.log('🚀 Starting VisionBuild Screenshot Capture');
  console.log(`📏 Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  
  try {
    // Set mock session cookie/env
    await context.addInitScript(() => {
      window.process = { env: { EXPO_PUBLIC_DEV_MOCK_SESSION: 'true' } };
    });
    
    // 1. Sign-in screen
    await page.goto(`${BASE_URL}/sign-in`);
    await takeScreenshot(page, 'sign-in', 'Snap Your Space');
    
    // 2. Home screen - navigate directly (mock mode auto-authenticates)
    await page.goto(`${BASE_URL}/`);
    await takeScreenshot(page, 'home', 'Ready to redesign');
    
    // 3. Explore screen
    await page.click('text="Explore"'); // Click tab
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'explore', 'Explore');
    
    // 4. Style picker - navigate to editor
    await page.goto(`${BASE_URL}/editor/test-project`);
    await takeScreenshot(page, 'style-picker', 'Select a Design Style');
    
    // 5. Generating screen
    await page.goto(`${BASE_URL}/generating/test-project`);
    await takeScreenshot(page, 'generating', 'Building your');
    
    // 6. Results with XP
    await page.goto(`${BASE_URL}/result/test-project`);
    await takeScreenshot(page, 'results-xp', 'Swipe to browse');
    
    // 7. Vi chat
    await page.goto(`${BASE_URL}/assistant-chat`);
    await takeScreenshot(page, 'vi-chat', 'Design Assistant');
    
    // 8. Settings (with Sign out) - navigate via profile tab
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForTimeout(1000);
    await page.click('text="Settings"'); // Click settings icon/link
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'settings', 'Settings');
    
    // 9. Daily limit
    await page.goto(`${BASE_URL}/result-error?type=rate-limit`);
    await takeScreenshot(page, 'daily-limit', 'Daily Render Limit');
    
    // 10. Project detail
    await page.goto(`${BASE_URL}/project/test-project`);
    await takeScreenshot(page, 'project-detail', 'Designs');
    
    // 11. Inbox (contractor thread placeholder)
    await page.goto(`${BASE_URL}/inbox`);
    await takeScreenshot(page, 'contractor-thread', 'Inbox');
    
    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Saved to: ${SCREENSHOT_DIR}`);
    console.log(`✓ All MD5 hashes are unique (${md5Hashes.size} screenshots)`);
    
  } catch (error) {
    console.error('\n❌ Screenshot capture failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
