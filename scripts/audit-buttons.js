const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:8080';

const results = {
  screens: {},
  deadButtons: [],
  errors: [],
  summary: {
    totalScreens: 0,
    totalButtons: 0,
    workingButtons: 0,
    deadButtons: 0,
    errors: 0
  }
};

async function auditScreen(page, screenName, url) {
  console.log(`\n=== Auditing: ${screenName} ===`);
  
  const screen = {
    url,
    buttons: [],
    consoleErrors: [],
    timestamp: new Date().toISOString()
  };
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      screen.consoleErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    screen.consoleErrors.push(err.message);
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Find all pressable elements
    const buttons = await page.$$('button, [role="button"], [role="link"], [role="tab"], [role="switch"]');
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      
      try {
        // Get button info
        const label = await button.innerText().catch(() => '');
        const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
        const tagName = await button.evaluate(el => el.tagName);
        const role = await button.getAttribute('role');
        
        const buttonInfo = {
          index: i,
          label: label || ariaLabel || `${tagName}[${role}]`,
          type: role || tagName.toLowerCase()
        };
        
        // Check if visible and enabled
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        if (!isVisible || !isEnabled) {
          buttonInfo.result = 'disabled/hidden';
          screen.buttons.push(buttonInfo);
          continue;
        }
        
        // Record current URL
        const beforeUrl = page.url();
        
        // Click and observe
        await button.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(500);
        
        const afterUrl = page.url();
        
        // Check what happened
        if (afterUrl !== beforeUrl) {
          buttonInfo.result = `navigated to ${afterUrl.replace(BASE_URL, '')}`;
        } else {
          // Check for modals, overlays, or state changes
          const hasModal = await page.$('text=/Modal|Dialog|Sheet/i').catch(() => null);
          if (hasModal) {
            buttonInfo.result = 'opened modal/sheet';
            // Close modal
            await page.keyboard.press('Escape').catch(() => {});
            await page.waitForTimeout(300);
          } else {
            // Check if URL changed back (tab navigation)
            await page.waitForTimeout(200);
            const finalUrl = page.url();
            if (finalUrl !== afterUrl) {
              buttonInfo.result = `tab navigation (${finalUrl.replace(BASE_URL, '')})`;
            } else {
              buttonInfo.result = 'state change or no-op';
            }
          }
        }
        
        // Go back if navigated
        if (page.url() !== beforeUrl && !page.url().includes('/sign-in')) {
          await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
          await page.waitForTimeout(500);
        }
        
        screen.buttons.push(buttonInfo);
        
      } catch (error) {
        screen.buttons.push({
          index: i,
          label: 'error',
          result: `error: ${error.message}`,
          error: error.message
        });
      }
    }
    
  } catch (error) {
    screen.error = error.message;
    results.errors.push({ screen: screenName, error: error.message });
  }
  
  results.screens[screenName] = screen;
  results.summary.totalButtons += screen.buttons.length;
  
  // Count dead buttons
  const dead = screen.buttons.filter(b => 
    b.result === 'state change or no-op' || 
    b.result === 'disabled/hidden' ||
    (b.result && b.result.includes('error'))
  );
  
  dead.forEach(b => {
    results.deadButtons.push({
      screen: screenName,
      label: b.label,
      result: b.result
    });
  });
  
  results.summary.workingButtons += screen.buttons.length - dead.length;
  results.summary.deadButtons += dead.length;
  results.summary.errors += screen.consoleErrors.length;
  
  console.log(`  Buttons: ${screen.buttons.length}, Dead: ${dead.length}, Errors: ${screen.consoleErrors.length}`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  
  // Setup
  await context.addInitScript(() => {
    // eslint-disable-next-line no-undef
    localStorage.setItem('@visionbuild:intro_seen', 'true');
  });
  
  await page.addInitScript(() => {
    window.process = { env: { EXPO_PUBLIC_DEV_MOCK_SESSION: 'true' } };
  });
  
  console.log('Starting MVP Readiness Button Audit...\n');
  
  // Routes to audit
  const routes = [
    { name: 'intro', url: '/intro' },
    { name: 'sign-in', url: '/sign-in' },
    { name: 'home', url: '/' },
    { name: 'explore', url: '/explore' },
    { name: 'inbox', url: '/inbox' },
    { name: 'profile', url: '/profile' },
    { name: 'editor-style', url: '/editor/test-id' },
    { name: 'generating', url: '/generating/test-id' },
    { name: 'result', url: '/result/test-id' },
    { name: 'project-detail', url: '/project/mock-1' },
    { name: 'assistant-chat', url: '/assistant-chat' },
    { name: 'profile-settings', url: '/profile-settings' },
    { name: 'handoff', url: '/handoff/test-id' },
    { name: 'result-error-rate-limit', url: '/result-error?type=rate-limit' },
  ];
  
  for (const route of routes) {
    await auditScreen(page, route.name, BASE_URL + route.url);
  }
  
  await browser.close();
  
  results.summary.totalScreens = Object.keys(results.screens).length;
  
  // Write report
  const reportPath = '/workspace/audit-buttons.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Screens: ${results.summary.totalScreens}`);
  console.log(`Total Buttons: ${results.summary.totalButtons}`);
  console.log(`Working: ${results.summary.workingButtons}`);
  console.log(`Dead/No-op: ${results.summary.deadButtons}`);
  console.log(`Console Errors: ${results.summary.errors}`);
  console.log('\nFull report saved to:', reportPath);
  
  if (results.deadButtons.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('DEAD BUTTONS (sample):');
    console.log('='.repeat(60));
    results.deadButtons.slice(0, 10).forEach(b => {
      console.log(`  [${b.screen}] "${b.label}" → ${b.result}`);
    });
    if (results.deadButtons.length > 10) {
      console.log(`  ... and ${results.deadButtons.length - 10} more`);
    }
  }
})();
