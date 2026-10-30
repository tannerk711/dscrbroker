// Mobile fold gate for /forms/lp-t4/ (FORM-LP-BRIEF.md section 5 + 3b). At 390x844,
// scroll 0: the THIRD `#start .fv3-card` bottom edge must be <= 844px. Also asserts
// exactly one <h1> and that #start is present.
//
//   node tools/lp-fold.mjs
import { launchBrowser, openPage, VIEWPORTS, settle, makeChecker, LP_T4_PATH } from './lp-lib.mjs';

const { check, summary } = makeChecker();
const browser = await launchBrowser(VIEWPORTS.mobile);
const errors = [];
try {
  const page = await openPage(browser, LP_T4_PATH, { vp: VIEWPORTS.mobile, errors });
  await settle(900);

  const result = await page.evaluate((h) => {
    const cards = [...document.querySelectorAll('#start .fv3-card')];
    const third = cards[2]?.getBoundingClientRect();
    const start = document.querySelector('#start');
    const h1s = document.querySelectorAll('h1');
    return {
      cardCount: cards.length,
      thirdCardBottom: third ? Math.round(third.bottom) : null,
      thirdCardInFold: third ? third.bottom <= h : false,
      hasStart: !!start,
      h1Count: h1s.length,
    };
  }, VIEWPORTS.mobile.height);

  console.log(`fold report: ${JSON.stringify(result)}  (viewport height ${VIEWPORTS.mobile.height})`);

  check('#start present', result.hasStart);
  check('exactly one <h1>', result.h1Count === 1, `found ${result.h1Count}`);
  check('at least 3 .fv3-card rendered at step 1', result.cardCount >= 3, `found ${result.cardCount}`);
  check(
    'third option card bottom <= 844px (mobile fold)',
    result.thirdCardInFold === true,
    `bottom=${result.thirdCardBottom}`
  );
  check('zero console/page errors', errors.length === 0, errors.join(' | '));

  await page.close();
} finally {
  await browser.close();
}

const ok = summary();
process.exit(ok ? 0 : 1);
