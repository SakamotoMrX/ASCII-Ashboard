import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  
  // Mobile zen_locked
  let context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  let page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);

  // Click Zen toggle
  const zenBtn = await page.$('button[data-testid="zen-toggle"], button:has-text("ZEN"), button:has-text("Zen")');
  if (zenBtn) {
    await zenBtn.click();
    await page.waitForTimeout(1500);
  }
  
  await page.screenshot({ path: 'screenshots/zen_locked-mobile.png' });
  await page.screenshot({ path: 'screenshots/mobile-zen_locked.png' });
  await context.close();

  // Tablet zen_locked
  context = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2 });
  page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  const zenBtnTab = await page.$('button[data-testid="zen-toggle"], button:has-text("ZEN"), button:has-text("Zen")');
  if (zenBtnTab) {
    await zenBtnTab.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: 'screenshots/zen_locked-tablet.png' });
  await page.screenshot({ path: 'screenshots/tablet-zen_locked.png' });
  await context.close();

  // Desktop zen_locked as well with high res
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  const zenBtnDesk = await page.$('button[data-testid="zen-toggle"], button:has-text("ZEN"), button:has-text("Zen")');
  if (zenBtnDesk) {
    await zenBtnDesk.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: 'screenshots/zen_locked-desktop.png' });
  await page.screenshot({ path: 'screenshots/desktop-zen_locked.png' });
  await context.close();

  await browser.close();

  console.log('Mobile zen size:', fs.statSync('screenshots/zen_locked-mobile.png').size);
  console.log('Tablet zen size:', fs.statSync('screenshots/zen_locked-tablet.png').size);
  console.log('Desktop zen size:', fs.statSync('screenshots/zen_locked-desktop.png').size);
})();
