const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  console.log('Navigating to http://localhost:5173...');
  const response = await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  const status = response ? response.status() : 0;
  console.log('HTTP Status:', status);

  // Allow boot animation / mount sequence to finish
  await page.waitForTimeout(2500);

  // Verify interactive hydration by clicking the fastfetch widget button or a tab
  const buttons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()));
  console.log('Available buttons count:', buttons.length);

  // Click Fastfetch trigger if exists
  const fastfetchButton = await page.$('button[title*="Fastfetch"], button:has-text("FASTFETCH"), button:has-text("Telemetry")');
  if (fastfetchButton) {
    console.log('Clicking Fastfetch toggle button...');
    await fastfetchButton.click();
    await page.waitForTimeout(800);
  } else {
    console.log('Fastfetch button not found by selector, looking for sliders or tabs');
    const firstTab = await page.$('button');
    if (firstTab) {
      await firstTab.click();
      await page.waitForTimeout(500);
    }
  }

  // Adjust a slider if available
  const slider = await page.$('input[type="range"]');
  if (slider) {
    console.log('Adjusting range slider for exposure/saturation...');
    await slider.fill('20');
    await page.dispatchEvent('input[type="range"]', 'input');
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: 'screenshots/verification-live.png' });
  const stats = fs.statSync('screenshots/verification-live.png');
  console.log('Screenshot size bytes:', stats.size);

  const evaluation = await page.evaluate(() => {
    return {
      elementCount: document.querySelectorAll('*').length,
      visibleTextLength: document.body.innerText.trim().length,
      bodyTextSnippet: document.body.innerText.slice(0, 300),
      hasSliders: document.querySelectorAll('input[type="range"]').length,
    };
  });

  console.log('Evaluation:', evaluation);
  console.log('Runtime console errors:', consoleErrors);

  await browser.close();
})();
