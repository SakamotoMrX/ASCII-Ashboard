import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 }
];

const STATES = [
  { id: "default", scene: "donut", rawText: false },
  { id: "scene_donut", scene: "donut", rawText: false },
  { id: "scene_sphere", scene: "sphere", rawText: false },
  { id: "scene_cube", scene: "cube", rawText: false },
  { id: "scene_planet", scene: "planet", rawText: false },
  { id: "scene_black_hole", scene: "blackhole", rawText: false },
  { id: "mode_text", scene: "donut", rawText: true }
];

async function captureMatrixAndAuditContrast() {
  console.log("=== Starting Phase 4 Matrix Capture & Contrast Audit ===");
  
  if (!fs.existsSync("screenshots")) {
    fs.mkdirSync("screenshots", { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const capturedScreenshots = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Capturing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const page = await context.newPage();

    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(600); // Allow initial animation & canvas rendering

    for (const st of STATES) {
      console.log(`Setting state: ${st.id} (scene: ${st.scene}, rawText: ${st.rawText})...`);
      
      // Select 3D tab first if not selected
      const procTab = page.locator("button:has-text('3D Procedural')").first();
      if (await procTab.count() > 0) {
        await procTab.click();
        await page.waitForTimeout(150);
      }

      // Handle Scene Selection
      const sceneSelect = page.locator("aside select").first();
      if (await sceneSelect.count() > 0) {
        await sceneSelect.selectOption(st.scene);
        await page.waitForTimeout(350); // allow canvas animation loop to render frames
      }

      // Handle Raw Text toggle
      // Look for button with title containing Monospace / GPU Canvas or text Raw ASCII / Canvas
      const rawTextBtn = page.locator("button[title*='Monospace'], button[title*='Canvas'], button:has-text('Raw ASCII'), button:has-text('Canvas')").first();
      
      const isRawTextActive = (await page.locator("pre.ascii-viewport").count()) > 0;
      if (st.rawText && !isRawTextActive) {
        if (await rawTextBtn.count() > 0) {
          await rawTextBtn.click();
          await page.waitForTimeout(250);
        }
      } else if (!st.rawText && isRawTextActive) {
        if (await rawTextBtn.count() > 0) {
          await rawTextBtn.click();
          await page.waitForTimeout(250);
        }
      }

      await page.waitForTimeout(300); // Extra settle time

      const fileName = `screenshots/${vp.name}-${st.id}.png`;
      await page.screenshot({ path: fileName, fullPage: false });
      const stats = fs.statSync(fileName);
      console.log(`  -> Saved ${fileName} (${stats.size} bytes)`);

      if (stats.size < 10240) {
        throw new Error(`Screenshot ${fileName} is too small: ${stats.size} bytes (<10KB)`);
      }

      capturedScreenshots.push(fileName);
    }

    await context.close();
  }

  // --- Programmatic WCAG Contrast Audit ---
  console.log("\n--- Running Programmatic DOM WCAG Contrast Audit ---");
  const auditContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const auditPage = await auditContext.newPage();
  await auditPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await auditPage.waitForTimeout(500);

  const contrastResults = await auditPage.evaluate(() => {
    function parseRgb(colorStr) {
      if (!colorStr || colorStr === "transparent" || colorStr === "rgba(0, 0, 0, 0)") {
        return null;
      }
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return {
          r: parseInt(match[1], 10),
          g: parseInt(match[2], 10),
          b: parseInt(match[3], 10),
          a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
        };
      }
      return null;
    }

    function getLuminance(r, g, b) {
      const [rs, gs, bs] = [r, g, b].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function getContrastRatio(fgRgb, bgRgb) {
      const l1 = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
      const l2 = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function getEffectiveBgColor(element) {
      let current = element;
      while (current && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        const bg = parseRgb(style.backgroundColor);
        if (bg && bg.a > 0.1) {
          return bg;
        }
        current = current.parentElement;
      }
      return { r: 10, g: 10, b: 15, a: 1.0 }; // Root deep dark #0a0a0f
    }

    const selectors = [
      { id: "brand_title", selector: "h1" },
      { id: "sandbox_badge", selector: "header span.font-mono" },
      { id: "nav_active_tab", selector: "nav button" },
      { id: "hardware_pill_text", selector: "header div.font-mono span" },
      { id: "sidebar_section_title", selector: "aside label" },
      { id: "sidebar_select_input", selector: "aside select" },
      { id: "sidebar_muted_label", selector: "aside label span" },
      { id: "sidebar_export_btn", selector: "aside button" },
      { id: "telemetry_drawer_stat", selector: "div.border-t.border-\\[\\#262638\\] span" }
    ];

    const samples = [];

    for (const item of selectors) {
      const el = document.querySelector(item.selector);
      if (el) {
        const style = window.getComputedStyle(el);
        const fg = parseRgb(style.color) || { r: 240, g: 240, b: 245, a: 1 };
        const bg = getEffectiveBgColor(el);
        const ratio = Math.round(getContrastRatio(fg, bg) * 100) / 100;
        const fontSize = parseFloat(style.fontSize) || 12;
        const isBold = parseInt(style.fontWeight, 10) >= 600 || style.fontWeight === "bold";
        const minRequired = fontSize >= 18 || (fontSize >= 14 && isBold) ? 3.0 : 4.5;
        const passes = ratio >= minRequired;

        samples.push({
          id: item.id,
          element: el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ').slice(0, 2).join('.')}` : ''),
          text_snippet: el.textContent ? el.textContent.trim().slice(0, 40) : '',
          fg_color: style.color,
          bg_color: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
          contrast_ratio: ratio,
          minimum_required: minRequired,
          passes_wcag_aa: passes
        });
      }
    }

    const allPassed = samples.every((s) => s.passes_wcag_aa);

    return {
      wcag_version: "WCAG 2.1 AA",
      total_samples: samples.length,
      all_passed: allPassed,
      samples
    };
  });

  console.log("Contrast Audit Result:", JSON.stringify(contrastResults, null, 2));

  await browser.close();

  // Write contrast reports
  const contrastReport = {
    timestamp: new Date().toISOString(),
    audit_target: "http://localhost:3000",
    wcag_standard: "WCAG 2.1 Level AA",
    formula: "(L1 + 0.05) / (L2 + 0.05)",
    summary: {
      total_tested: contrastResults.total_samples,
      passed: contrastResults.samples.filter(s => s.passes_wcag_aa).length,
      failed: contrastResults.samples.filter(s => !s.passes_wcag_aa).length,
      wcag_compliant: contrastResults.all_passed
    },
    samples: contrastResults.samples
  };

  fs.mkdirSync(".antigravity/artifacts", { recursive: true });
  fs.mkdirSync(".opencode/artifacts", { recursive: true });

  fs.writeFileSync(".antigravity/artifacts/phase-4-contrast-report.json", JSON.stringify(contrastReport, null, 2));
  fs.writeFileSync(".opencode/artifacts/phase-4-contrast-report.json", JSON.stringify(contrastReport, null, 2));

  console.log("\nContrast report written to .antigravity/artifacts/phase-4-contrast-report.json and .opencode/artifacts/phase-4-contrast-report.json");

  return capturedScreenshots;
}

captureMatrixAndAuditContrast()
  .then((screenshots) => {
    console.log(`\nSuccessfully captured all ${screenshots.length} screenshots (>10KB each).`);
  })
  .catch((err) => {
    console.error("Execution failed:", err);
    process.exit(1);
  });
