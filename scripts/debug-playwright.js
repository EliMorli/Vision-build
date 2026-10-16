const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  // Log console messages
  page.on('console', msg => {
    const type = msg.type();
    console.log(`[CONSOLE ${type.toUpperCase()}]`, msg.text());
  });
  
  // Log page errors
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
    console.log(err.stack);
  });
  
  // Log failed requests
  page.on('requestfailed', request => {
    console.log('[REQUEST FAILED]', request.url(), request.failure().errorText);
  });
  
  await page.addInitScript(() => {
    window.process = { env: { EXPO_PUBLIC_DEV_MOCK_SESSION: 'true' } };
  });
  
  console.log('Navigating to http://localhost:8080/...');
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(20000);
  
  console.log('\n=== Page Title ===');
  console.log(await page.title());
  
  console.log('\n=== Body Text (first 500 chars) ===');
  const bodyText = await page.textContent('body');
  console.log(bodyText.substring(0, 500));
  
  await page.screenshot({ path: '/tmp/debug-screenshot.png' });
  console.log('\nScreenshot saved to /tmp/debug-screenshot.png');
  
  await browser.close();
})();
