// Screenshot sweep for /forms/lp-t4/ (FORM-LP-BRIEF.md section 5). One browser per
// viewport (desktop 1440x900 dsf1, mobile 390x844 dsf2 hasTouch, no isMobile).
// Shots: fold, full page after a scroll-through with .cv-auto forced visible,
// mobile sticky at scroll 1800, plus fold + overflow reports.
//
//   CI=true npm run dev          (server on QA_BASE, default http://localhost:4322)
//   node tools/lp-shoot.mjs [desktop|mobile]
import { QA_BASE, VIEWPORTS, launchBrowser, openPage, scrollThrough, overflowReport, withCvAutoVisible, settle, ensureShots, shotPath, LP_T4_PATH } from './lp-lib.mjs';

const only = process.argv[2];
ensureShots();
console.log(`lp-shoot: ${QA_BASE}${LP_T4_PATH}`);

const written = [];
const failures = [];
const errors = [];

async function snap(page, vp, name, full = false) {
  const path = shotPath(vp.name, name);
  if (full) {
    await withCvAutoVisible(page, async () => {
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      const dropDsf = vp.deviceScaleFactor > 1 && h * vp.deviceScaleFactor > 16000;
      const { name: _n, ...viewport } = vp;
      if (dropDsf) await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
      await settle(300);
      await page.screenshot({ path, fullPage: true });
      if (dropDsf) await page.setViewport(viewport);
    });
  } else {
    await page.screenshot({ path });
  }
  written.push(path);
}

async function run(vp, label, fn) {
  try {
    await fn();
  } catch (e) {
    failures.push(`${vp.name} ${label}: ${e.message}`);
    console.log(`  FAIL ${vp.name} ${label}: ${e.message}`);
  }
}

for (const vp of Object.values(VIEWPORTS)) {
  if (only && only !== vp.name) continue;
  console.log(`\n== ${vp.name} ${vp.width}x${vp.height} ==`);
  const browser = await launchBrowser(vp);
  const open = (opts = {}) => openPage(browser, LP_T4_PATH, { vp, errors, ...opts });

  // 1. fold shot, then full page after a scroll-through (reveals + cv-auto paint)
  await run(vp, 'lp-t4 fold + full', async () => {
    const page = await open();
    await settle(900);
    const ov = await overflowReport(page);
    console.log(`  widths client=${ov.clientWidth} scroll=${ov.scrollWidth}${ov.offenders.length ? '\n  overflow offenders:\n    ' + ov.offenders.join('\n    ') : ''}`);
    if (vp.name === 'mobile') {
      const fold = await page.evaluate((h) => {
        const cards = [...document.querySelectorAll('#start .fv3-card')];
        const third = cards[2]?.getBoundingClientRect();
        return {
          cardCount: cards.length,
          thirdCardBottom: third ? Math.round(third.bottom) : null,
          thirdCardInFold: third ? third.bottom <= h : false,
        };
      }, vp.height);
      console.log(`  mobile fold: ${JSON.stringify(fold)} (acceptance: third option card bottom <= ${vp.height})`);
    }
    await snap(page, vp, 'lp-t4-fold');
    await scrollThrough(page);
    await snap(page, vp, 'lp-t4-full', true);
    await page.close();
  });

  // 2. mobile sticky CTA after a 1800px scroll
  if (vp.name === 'mobile') {
    await run(vp, 'lp-t4 sticky', async () => {
      const page = await open();
      await settle(800);
      await page.evaluate(() => window.scrollTo(0, 1800));
      await settle(1000);
      const sticky = await page.evaluate(() => {
        const el = document.querySelector('#sticky-cta');
        if (!el) return 'missing #sticky-cta';
        const r = el.getBoundingClientRect();
        return `hidden=${el.hidden} top=${Math.round(r.top)} height=${Math.round(r.height)}`;
      });
      console.log(`  #sticky-cta at scrollY 1800: ${sticky} (expect hidden=false)`);
      await snap(page, vp, 'lp-t4-sticky');
      await page.close();
    });
  }

  await browser.close();
}

console.log('\nshots written:');
for (const p of written) console.log('  ' + p);
console.log(`\nbrowser errors: ${errors.length ? '\n  ' + errors.join('\n  ') : 'none'}`);
if (failures.length) {
  console.log(`\n${failures.length} shot group(s) FAILED:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\nlp-shoot complete');
