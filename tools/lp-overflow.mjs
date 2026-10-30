// Horizontal-overflow gate for /forms/lp-t4/ at 390 and 320 widths, after a
// scroll-through (so lazy/reveal content mounts). FORM-LP-BRIEF.md section 5.
//
//   node tools/lp-overflow.mjs
import { launchBrowser, openPage, scrollThrough, overflowReport, VIEWPORTS, settle, makeChecker, LP_T4_PATH } from './lp-lib.mjs';

const { check, summary } = makeChecker();
const WIDTHS = [390, 320];
const errors = [];

const browser = await launchBrowser(VIEWPORTS.mobile);
try {
  for (const width of WIDTHS) {
    const vp = { name: `w${width}`, width, height: 844, deviceScaleFactor: 1, hasTouch: true };
    const page = await openPage(browser, LP_T4_PATH, { vp, errors });
    await settle(600);
    await scrollThrough(page);
    const r = await overflowReport(page);
    console.log(`\n${width}px: clientWidth=${r.clientWidth} scrollWidth=${r.scrollWidth}`);
    if (r.offenders.length) console.log('  offenders:\n    ' + r.offenders.join('\n    '));
    check(`no horizontal overflow at ${width}px`, r.scrollWidth <= r.clientWidth, `sw=${r.scrollWidth} cw=${r.clientWidth}`);
    await page.close();
  }
  check('zero console/page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

const ok = summary();
process.exit(ok ? 0 : 1);
