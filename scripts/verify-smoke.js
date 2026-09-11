import { chromium } from "playwright";
import fs from "fs";

async function main() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
  });

  console.log("Navigating to http://localhost:3000...");
  const response = await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  const status = response ? response.status() : 0;
  console.log(`HTTP Status: ${status}`);

  // Wait for initial animation & rendering
  await page.waitForTimeout(1000);

  // Check key elements
  const headerExists = (await page.locator("header").count()) > 0;
  const canvasExists = (await page.locator("canvas").count()) > 0;
  const mainExists = (await page.locator("main").count()) > 0;
  const telemetryExists = (await page.locator("text=TELEMETRY").count()) > 0 || (await page.locator("text=FPS").count()) > 0;

  console.log({ headerExists, canvasExists, mainExists, telemetryExists });

  // Active interaction: click scene buttons or tabs
  console.log("Performing interactions to prove active hydration...");
  const buttons = await page.locator("button").all();
  console.log(`Found ${buttons.length} buttons on page.`);

  // Click on a scene button if available (e.g. Cube, Sphere, Blackhole, etc.)
  const cubeBtn = page.locator("button:has-text('cube')").or(page.locator("button:has-text('Cube')")).first();
  if (await cubeBtn.count() > 0) {
    await cubeBtn.click();
    console.log("Clicked Cube button");
  }

  // Click on another charset or color mode button if available
  const matrixBtn = page.locator("button:has-text('amber')").or(page.locator("button:has-text('Amber')")).first();
  if (await matrixBtn.count() > 0) {
    await matrixBtn.click();
    console.log("Clicked Amber color button");
  }

  await page.waitForTimeout(500);

  // Capture screenshot
  const screenshotPath = "screenshots/verification-live.png";
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const stats = fs.statSync(screenshotPath);
  console.log(`Screenshot saved: ${screenshotPath} (${stats.size} bytes)`);

  const domStats = await page.evaluate(() => {
    return {
      elementCount: document.querySelectorAll("*").length,
      visibleTextLength: document.body.innerText.trim().length,
      title: document.title,
    };
  });

  console.log("DOM Stats:", domStats);
  console.log("Console Errors:", consoleErrors);

  await browser.close();

  return {
    status,
    screenshotPath,
    screenshotBytes: stats.size,
    domStats,
    consoleErrors,
    elementsPresent: { headerExists, canvasExists, mainExists, telemetryExists }
  };
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
