// Motion-spine gate for /forms/lp-t4/, desktop + mobile (FORM-LP-BRIEF.md section 5).
// Two runs per device: normal, and prefers-reduced-motion. Boot is load + 1200ms +
// a dynamic gsap import Vite cold-transforms on first request, hence an 8s timeout
// waiting for html.motion-ready.
//
//   node tools/lp-motion-check.mjs
import { launchBrowser, openPage, scrollThrough, VIEWPORTS, settle, makeChecker, LP_T4_PATH } from './lp-lib.mjs';

const { check, summary } = makeChecker();

async function sampleH1AndStart(page) {
  return page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const start = document.querySelector('#start');
    const read = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, transform: cs.transform };
    };
    return { h1: read(h1), start: read(start) };
  });
}

async function runDevice(vpName) {
  const vp = VIEWPORTS[vpName];
  const errors = [];

  // --- normal motion run ---
  const browser = await launchBrowser(vp);
  try {
    const page = await openPage(browser, LP_T4_PATH, { vp, errors });

    try {
      await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'), { timeout: 8000 });
      check(`${vpName}: html.motion-ready appears within 8s`, true);
    } catch {
      check(`${vpName}: html.motion-ready appears within 8s`, false, 'timed out');
    }

    const s0 = await sampleH1AndStart(page);
    await settle(500);
    const s500 = await sampleH1AndStart(page);
    await settle(2000);
    const s2500 = await sampleH1AndStart(page);

    for (const [label, s] of [['t=0ms(+)', s0], ['t=500ms(+)', s500], ['t=2500ms(+)', s2500]]) {
      check(
        `${vpName} ${label}: H1 opacity=1 transform=none`,
        s.h1 && s.h1.opacity === '1' && s.h1.transform === 'none',
        s.h1 ? JSON.stringify(s.h1) : 'no <h1>'
      );
      check(
        `${vpName} ${label}: #start transform=none`,
        s.start && s.start.transform === 'none',
        s.start ? JSON.stringify(s.start) : 'no #start'
      );
    }

    const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    check(`${vpName}: html scroll-behavior is auto`, scrollBehavior === 'auto', `got ${scrollBehavior}`);

    await scrollThrough(page);
    const revealState = await page.evaluate(() => {
      const els = [...document.querySelectorAll('[data-reveal], [data-child]')];
      const notVisible = els.filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99);
      return { total: els.length, notVisible: notVisible.length, samples: notVisible.slice(0, 5).map((el) => el.tagName + '.' + String(el.className).slice(0, 40)) };
    });
    check(
      `${vpName}: all [data-reveal]/[data-child] end at opacity 1 after scroll-through`,
      revealState.notVisible === 0,
      `${revealState.notVisible}/${revealState.total} not at opacity 1: ${revealState.samples.join(', ')}`
    );

    check(`${vpName}: zero console/page errors (normal run)`, errors.length === 0, errors.join(' | '));
    await page.close();
  } finally {
    await browser.close();
  }

  // --- reduced-motion run ---
  const errors2 = [];
  const browser2 = await launchBrowser(vp);
  try {
    const page2 = await browser2.newPage();
    const { name, ...viewport } = vp;
    await page2.setViewport(viewport);
    await page2.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    if (errors2) {
      page2.on('console', (m) => {
        if (m.type() !== 'error') return;
        // Same dev-only exemption as lp-lib attachErrorLog: the Astro dev toolbar
        // entrypoint 504s after Vite re-optimizes gsap + lenis; it never ships.
        if (/Outdated Optimize Dep/.test(m.text())) return;
        errors2.push(`[console.error ${vpName}-reduced] ${m.text()}`);
      });
      page2.on('pageerror', (e) => errors2.push(`[pageerror ${vpName}-reduced] ${e.message}`));
    }
    const { QA_BASE } = await import('./lp-lib.mjs');
    await page2.goto(QA_BASE + LP_T4_PATH, { waitUntil: 'networkidle0', timeout: 45000 });
    await settle(2000);
    await scrollThrough(page2);

    const reduced = await page2.evaluate(() => {
      const els = [...document.querySelectorAll('[data-reveal]')];
      const belowOne = els.filter((el) => parseFloat(getComputedStyle(el).opacity) < 1);
      return {
        total: els.length,
        belowOne: belowOne.length,
        motionReady: document.documentElement.classList.contains('motion-ready'),
      };
    });
    check(
      'reduced-motion: no [data-reveal] element ever has opacity < 1',
      reduced.belowOne === 0,
      `${reduced.belowOne}/${reduced.total} below opacity 1`
    );
    check('reduced-motion: html.motion-ready is absent', reduced.motionReady === false, `motion-ready=${reduced.motionReady}`);
    check(`${vpName}: zero console/page errors (reduced-motion run)`, errors2.length === 0, errors2.join(' | '));
    await page2.close();
  } finally {
    await browser2.close();
  }
}

for (const vpName of ['desktop', 'mobile']) {
  console.log(`\n== ${vpName} ==`);
  await runDevice(vpName);
}

const ok = summary();
process.exit(ok ? 0 : 1);
