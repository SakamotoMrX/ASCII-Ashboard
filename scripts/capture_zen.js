const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  
  // Mobile zen_locked
  let context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  let page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2500);

  // In zen mode, let's make sure the canvas or ASCII art is active so it's not a plain black box under 10KB
  // Find zen button or trigger zen
  const zenBtn = await page.$('button[data-testid="zen-toggle"], button[aria-label*="Zen"], button:has-text("ZEN"), button:has-text("Zen")');
  if (zenBtn) {
    await zenBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'screenshots/zen_locked-mobile.png' });
  await page.screenshot({ path: 'screenshots/mobile-zen_locked.png' });
  await context.close();

  // Tablet zen_locked
  context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2500);
  const zenBtnTab = await page.$('button[data-testid="zen-toggle"], button[aria-label*="Zen"], button:has-text("ZEN"), button:has-text("Zen")');
  if (zenBtnTab) {
    await zenBtnTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'screenshots/zen_locked-tablet.png' });
  await page.screenshot({ path: 'screenshots/tablet-zen_locked.png' });
  await context.close();

  await browser.close();

  console.log('Mobile zen size:', fs.statSync('screenshots/zen_locked-mobile.png').size);
  console.log('Tablet zen size:', fs.statSync('screenshots/zen_locked-tablet.png').size);
})();
