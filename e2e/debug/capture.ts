import { chromium } from "@playwright/test";
import fs from "fs";

const BASE_URL = "http://localhost:19006";

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs: string[] = [];
  const errors: string[] = [];

  // Capture console messages
  page.on("console", (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log(text);
  });

  // Capture page errors
  page.on("pageerror", (error) => {
    const text = `[PAGE ERROR] ${error.message}\n${error.stack}`;
    errors.push(text);
    console.error(text);
  });

  // Capture request failures
  page.on("requestfailed", (request) => {
    const text = `[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`;
    consoleLogs.push(text);
    console.log(text);
  });

  try {
    console.log("Navigating to", BASE_URL);
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    
    console.log("Page loaded, waiting 5 seconds...");
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    console.log("Final URL:", finalUrl);
    
    // Take screenshot
    await page.screenshot({ path: "e2e/debug/web-root.png", fullPage: true });
    console.log("Screenshot saved to e2e/debug/web-root.png");
    
    // Get page content
    const content = await page.content();
    fs.writeFileSync("e2e/debug/page-content.html", content);
    console.log("Page content saved to e2e/debug/page-content.html");
    
    // Check what's visible
    const bodyText = await page.locator("body").innerText();
    console.log("\n=== VISIBLE TEXT ON PAGE ===");
    console.log(bodyText);
    
    // Save console logs
    const logContent = [
      `Final URL: ${finalUrl}`,
      `\n=== CONSOLE LOGS ===`,
      ...consoleLogs,
      `\n=== ERRORS ===`,
      ...errors,
      `\n=== VISIBLE TEXT ===`,
      bodyText
    ].join("\n");
    
    fs.writeFileSync("e2e/debug/console.log", logContent);
    console.log("\nLogs saved to e2e/debug/console.log");
    
  } catch (error) {
    console.error("Error during debug:", error);
    await page.screenshot({ path: "e2e/debug/web-root-error.png" });
    
    fs.writeFileSync("e2e/debug/console.log", [
      `Error: ${error}`,
      `\n=== CONSOLE LOGS ===`,
      ...consoleLogs,
      `\n=== ERRORS ===`,
      ...errors
    ].join("\n"));
  }

  await browser.close();
}

debug().catch(console.error);
