// Screenshot pass for /qualify/ (the restored form-only page): desktop + iPhone
// SE at step 1, a mid-form step, and the contact step, plus overflow + fold
// reads. Serves the BUILT output in-process.
//   node tools/qualify-shoot.mjs
import { launchBrowser, settle, ensureShots } from './lp-lib.mjs';
import { startServer } from './serve-dist.mjs';

const srv = await startServer(Number(process.env.SHOOT_PORT || 4397), { quiet: true });
const out = ensureShots('qualify-classic');
const VPS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  se: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const waitStep = async (page, n) => {
  await page.waitForFunction(
    (t) => (document.querySelector('#lead-form')?.textContent || '').includes(t),
    { timeout: 15000 },
    `Step ${n} of`,
  );
  await settle(800);
};
const firstRadio = (page) =>
  page.evaluate(() => document.querySelector('#lead-form [role="radio"]:not([disabled])').click());
const clickBtn = (page, label) =>
  page.evaluate((t) => {
    [...document.querySelectorAll('button')]
      .find((b) => (b.textContent || '').trim().toUpperCase().includes(t) && !b.disabled)
      .click();
  }, label);

let fail = 0;
for (const [name, vp] of Object.entries(VPS)) {
  const browser = await launchBrowser(vp);
  const page = await browser.newPage();
  await page.setViewport(vp);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${srv.url}/qualify/?demo=1`, { waitUntil: 'networkidle0' });
  await waitStep(page, 1);
  await page.screenshot({ path: `${out}${name}-1-step1.png` });
  await page.screenshot({ path: `${out}${name}-1-step1-full.png`, fullPage: true });

  const read = await page.evaluate(() => {
    const card = document.querySelector('#lead-form').getBoundingClientRect();
    const radios = [...document.querySelectorAll('#lead-form [role="radio"]')].map((r) => Math.round(r.getBoundingClientRect().bottom));
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      cardTop: Math.round(card.top),
      cardBottom: Math.round(card.bottom),
      radioBottoms: radios,
      vh: window.innerHeight,
      font: getComputedStyle(document.querySelector('h1')).fontFamily,
      sections: document.querySelectorAll('main section').length,
    };
  });
  console.log(name, JSON.stringify(read));
  if (read.overflowX > 0) { fail++; console.log(`FAIL ${name}: horizontal overflow ${read.overflowX}px`); }
  if (read.sections !== 1) { fail++; console.log(`FAIL ${name}: expected 1 section, got ${read.sections}`); }
  if (!/Roboto/.test(read.font)) { fail++; console.log(`FAIL ${name}: font is ${read.font}`); }

  await firstRadio(page); await waitStep(page, 2);
  await firstRadio(page); await waitStep(page, 3);
  await page.screenshot({ path: `${out}${name}-2-state.png` });
  await page.select('select[aria-label="Select state"]', 'TX'); await waitStep(page, 4);
  await page.screenshot({ path: `${out}${name}-3-slider.png` });
  await clickBtn(page, 'CONTINUE'); await waitStep(page, 5);
  await firstRadio(page); await waitStep(page, 6);
  await firstRadio(page); await waitStep(page, 7);
  await firstRadio(page); await waitStep(page, 8);
  await firstRadio(page); await waitStep(page, 9);
  await firstRadio(page); await waitStep(page, 10);
  await page.screenshot({ path: `${out}${name}-4-contact-full.png`, fullPage: true });
  if (errors.length) { fail++; console.log(`FAIL ${name}: page errors`, errors.slice(0, 3)); }
  await browser.close();
}
await srv.close();
console.log(fail ? `${fail} FAILED` : `shots written to ${out}`);
process.exit(fail ? 1 : 0);
