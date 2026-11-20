// Site-wide tracking + nav QA against a local or preview base URL: deferred
// gtag/Hotjar, page_view, the hero form island, mobile nav, scroll reveals, the
// thank-you Ads conversion and its ?demo=1 suppression. (Form funnel events and
// the lead payload are lp:events' job, not this script's.)
// Every Google/Hotjar beacon is BLOCKED at the network layer (CDP setBlockedURLs),
// so nothing reaches GA4 or the Ads account; we only record what gtag TRIED to send.
//   npm run qa:tracking                 (serves the BUILT output in-process; build first)
//   node tools/qa-tracking.mjs <baseUrl> [vercelBypassSecret]   (a preview deploy)
// Run before every push that touches layouts, tracking, forms or the header.
import puppeteer from 'puppeteer-core';
import { CHROME_PATH } from './lp-lib.mjs';
import { startServer } from './serve-dist.mjs';

const srv = process.argv[2] ? null : await startServer(Number(process.env.QA_PORT || 4396), { quiet: true });
const base = (process.argv[2] || srv.url).replace(/\/$/, '');
const bypass = process.argv[3];
const BLOCK = ['*google-analytics.com*', '*analytics.google.com*', '*doubleclick.net*', '*googleadservices.com*',
  '*google.com/pagead*', '*google.com/ccm*', '*google.com/rmkt*', '*googlesyndication*', '*hotjar*', '*/g/collect*'];
const LABEL = 'zIc1COzC6ekcEPurxM1E';
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });

async function openPage(storage) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  if (bypass) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' });
  // Since 2026-11-04 the site never loads gtag or Hotjar for declared automation
  // (navigator.webdriver). This script's whole job is to watch those libraries
  // load and try to send, so it presents as a normal browser; every beacon is
  // still blocked below, so nothing reaches GA4, Ads or Hotjar.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true });
  });
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: BLOCK });
  const reqs = [];
  cdp.on('Network.requestWillBeSent', (e) => reqs.push({ url: e.request.url + ' ' + (e.request.postData || ''), t: e.timestamp }));
  if (storage) await page.evaluateOnNewDocument((s) => { sessionStorage.setItem('dscrbroker_submission', s); }, storage);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, reqs, errors };
}

// ---------- 1. Homepage: deferred gtag, page_view, form hydration, nav, reveals
{
  const { page, reqs, errors } = await openPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 4000));
  const gtagReq = reqs.find((r) => r.url.includes('googletagmanager.com/gtag/js?id=G-W92EXVZW3P'));
  const docReq = reqs[0];
  const loadMs = await page.evaluate(() => performance.getEntriesByType('navigation')[0].loadEventStart);
  const fcpMs = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? Infinity);
  const gateMs = Math.max(loadMs, fcpMs);
  const gtagMs = gtagReq ? Math.round((gtagReq.t - docReq.t) * 1000) : -1;
  check('gtag.js requested after window load AND first contentful paint', !!gtagReq && gtagMs >= gateMs - 5, `gtag at ${gtagMs}ms, load at ${Math.round(loadMs)}ms, FCP at ${Math.round(fcpMs)}ms`);
  const pv = reqs.find((r) => /\/g\/collect/.test(r.url) && r.url.includes('tid=G-W92EXVZW3P') && r.url.includes('en=page_view'));
  check('GA4 page_view hit attempted (blocked)', !!pv);
  check('Ads container (AW-18416211451) loaded by config', reqs.some((r) => r.url.includes('gtag/js?id=AW-18416211451')));
  const dl = await page.evaluate(() => JSON.stringify(window.dataLayer.map((a) => Array.from(a))));
  check('dataLayer queued both configs', dl.includes('"config","G-W92EXVZW3P"') && dl.includes('"config","AW-18416211451"'));
  const hj = reqs.find((r) => r.url.includes('static.hotjar.com'));
  check('Hotjar requested after load AND first contentful paint (idle)', !!hj && Math.round((hj.t - docReq.t) * 1000) >= gateMs - 5, hj ? `at ${Math.round((hj.t - docReq.t) * 1000)}ms` : 'not requested (dev build?)');
  const formHydrated = await page.evaluate(() => {
    const isl = [...document.querySelectorAll('astro-island')].find((i) => i.getAttribute('component-url').includes('DSCRForm'));
    return isl ? !isl.hasAttribute('ssr') : false;
  });
  check('Hero DSCRForm hydrated (client:load)', formHydrated);
  const fontOk = await page.evaluate(() => ![...document.querySelectorAll('link')].some((l) => l.href.includes('fonts.googleapis')));
  check('No Google Fonts links', fontOk);

  // Mobile nav
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('[data-mobile-nav-toggle]');
  await new Promise((r) => setTimeout(r, 400));
  const open = await page.evaluate(() => ({
    exp: document.querySelector('[data-mobile-nav-toggle]').getAttribute('aria-expanded'),
    panel: document.querySelector('[data-mobile-nav-panel]').getBoundingClientRect().left < window.innerWidth,
    overlay: getComputedStyle(document.querySelector('[data-mobile-nav-overlay]')).display !== 'none',
    lock: document.body.style.overflow,
  }));
  check('Mobile nav opens', open.exp === 'true' && open.panel && open.overlay && open.lock === 'hidden', JSON.stringify(open));
  await page.mouse.click(20, 400); // overlay (left of the 288px panel)
  await new Promise((r) => setTimeout(r, 400));
  const closed = await page.evaluate(() => ({
    exp: document.querySelector('[data-mobile-nav-toggle]').getAttribute('aria-expanded'),
    panel: document.querySelector('[data-mobile-nav-panel]').getBoundingClientRect().left >= window.innerWidth - 1,
    lock: document.body.style.overflow,
  }));
  check('Mobile nav closes on overlay tap', closed.exp === 'false' && closed.panel && closed.lock === '', JSON.stringify(closed));

  // Scroll reveals still play below the fold
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  });
  await new Promise((r) => setTimeout(r, 1500));
  const stuck = await page.evaluate(() => [...document.querySelectorAll('[data-gsap]')].filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).map((el) => el.getAttribute('data-gsap')));
  check('No reveal stuck hidden after full scroll', stuck.length === 0, stuck.join(','));
  // The hero H1 + form card are static, never GSAP-hidden; the hydrated
  // DSCRForm (its step-1 radio options) must be present inside #lead-form.
  const heroOpacity = await page.evaluate(() => {
    const els = ['#hero-h1', '#lead-form'].map((s) => document.querySelector(s));
    if (els.some((el) => !el)) return 'missing';
    if (!document.querySelector('#lead-form [role="radio"]')) return 'no-form';
    return els.map((el) => getComputedStyle(el).opacity).join(',');
  });
  check('Hero elements fully visible (static)', heroOpacity !== 'missing' && heroOpacity !== 'no-form' && heroOpacity.split(',').every((o) => o === '1'), heroOpacity);
  check('No page errors on homepage', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 2. Thank-you, real submission shape: conversion must be sent (blocked here)
const submission = JSON.stringify({ loanGoal: 'purchase', state: 'TX', propertyType: 'single_family', firstName: 'QA', matchedBroker: 'broker_a' });
{
  const { page, reqs, errors } = await openPage(submission);
  await page.goto(base + '/thank-you/', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 5000));
  const dl = await page.evaluate(() => JSON.stringify(window.dataLayer.map((a) => Array.from(a))));
  check('Thank-you: conversion event queued in dataLayer', dl.includes(`AW-18416211451/${LABEL}`));
  const conv = reqs.filter((r) => r.url.includes(LABEL));
  check('Thank-you: AW conversion hit attempted with New Lead label (blocked)', conv.length > 0, conv.map((r) => r.url.split('?')[0]).join(', '));
  check('No page errors on thank-you', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 3. Thank-you ?demo=1: suppression holds
{
  const { page, reqs } = await openPage();
  await page.goto(base + '/thank-you/?demo=1', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 5000));
  const dl = await page.evaluate(() => JSON.stringify(window.dataLayer.map((a) => Array.from(a))));
  check('?demo=1: no conversion in dataLayer', !dl.includes(LABEL));
  check('?demo=1: no conversion hit attempted', !reqs.some((r) => r.url.includes(LABEL)));
  await page.close();
}

// ---------- 4. Texas: nav + no hydration islands at load, gtag deferred
{
  const { page, reqs, errors } = await openPage();
  await page.goto(base + '/states/texas/', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 6000));
  check('Texas: GA4 page_view attempted (blocked)', reqs.some((r) => /\/g\/collect/.test(r.url) && r.url.includes('en=page_view')));
  check('Texas: React runtime not fetched before load', !reqs.some((r) => /\/_astro\/client\.[\w-]+\.js/.test(r.url) && (r.t - reqs[0].t) * 1000 < 300));
  await page.click('[data-mobile-nav-toggle]');
  await new Promise((r) => setTimeout(r, 400));
  check('Texas: mobile nav opens', await page.evaluate(() => document.querySelector('[data-mobile-nav-toggle]').getAttribute('aria-expanded') === 'true'));
  check('No page errors on Texas', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
if (srv) await srv.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
