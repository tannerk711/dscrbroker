// Live-delivery proof for /forms/lp-t4/ (session 2026-09-09, Part 2 gates).
// Walks the buy path in a real browser with the standing QA lead (QA / Test
// DeleteMe / tanner+qa@creloanpro.com / 303-555-0123), the LP loaded with
// ?demo=1 plus a Campaign-B style utm/gclid set, then asserts the outcome:
//
//   --state="Texas"        expects the POST, a 200 with assignedBroker, the
//                          sessionStorage handoff, and /thank-you/?demo=1 rendering
//                          that broker's specialist (name read from the page)
//   --state="New York"     expects the excluded-state kick-out and NO POST
//   --consent400           node POSTs the walk payload minus `consent` to the dev
//                          API and expects 400 CONSENT_REQUIRED (never reaches a Zap)
//
// The production WEBHOOK_BROKER_A..E are Vercel "Sensitive" secrets and cannot be
// pulled locally, so with --proxy=https://dscrbroker.com the page's same-origin
// POST to /api/lead is intercepted in puppeteer and forwarded from node to the
// production route (identical api/lead.ts, the real Zaps); the production response
// is handed back to the page unchanged. gtag / GA hosts are blocked so a localhost
// walk never registers a session in GA4.
//
//   node tools/lp-live.mjs --state="Texas" --tag=john --proxy=https://dscrbroker.com
//   node tools/lp-live.mjs --state="New York" --tag=excluded
//   node tools/lp-live.mjs --consent400
import { writeFileSync } from 'node:fs';
import { launchBrowser, VIEWPORTS, settle, attachErrorLog, ensureShots, QA_BASE, LP_T4_PATH } from './lp-lib.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt = null) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).replace(/^"|"$/g, '') : dflt;
};
const STATE = arg('state', 'Texas');
const TAG = arg('tag', STATE.toLowerCase().replace(/[^a-z]+/g, '-'));
const PROXY = arg('proxy', null);
// The homepage hero mounts the same V3 island since 2026-10-30; --path=/ walks
// it there (default stays the /qualify/ page).
const PAGE_PATH = arg('path', LP_T4_PATH);
const CONSENT_400 = argv.includes('--consent400');

const QA_LEAD = {
  firstName: 'QA',
  lastName: 'Test DeleteMe',
  email: 'tanner+qa@creloanpro.com',
  phone: '303-555-0123',
};
const LANDING_QS =
  `?demo=1&utm_source=google&utm_medium=cpc&utm_campaign=b&utm_content=lenders-ad1` +
  `&utm_term=dscr%20loan%20lenders&gclid=QA-GCLID-${TAG}`;

const BLOCKED_HOSTS = /googletagmanager\.com|google-analytics\.com|doubleclick\.net|googleadservices\.com/i;

function log(label, value) {
  console.log(`${label.padEnd(18)} ${typeof value === 'string' ? value : JSON.stringify(value)}`);
}

async function consent400() {
  const body = {
    submissionId: 'qa-consent-400',
    firstName: QA_LEAD.firstName,
    lastName: QA_LEAD.lastName,
    email: QA_LEAD.email,
    phone: '+13035550123',
    loanGoal: 'purchase',
    state: 'Texas',
    stateCode: 'TX',
    matchedBroker: 'broker_d',
    leadSource: 'qualify-lp-t4',
    // An unchecked box: agreed=false with no text. (A payload with NO consent key
    // at all trips api/lead.ts's legacy-bundle grace path and gets forwarded; that
    // path is a known open item in CLAUDE.md and this form always sends the key.)
    consent: { agreed: false, text: '' },
  };
  const res = await fetch(`${QA_BASE}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  log('consent400 status', res.status);
  log('consent400 body', text.slice(0, 200));
  const ok = res.status === 400 && /CONSENT_REQUIRED/.test(text);
  console.log(ok ? 'PASS consent 400 (no consent record -> refused before any webhook)' : 'FAIL consent 400');
  process.exit(ok ? 0 : 1);
}

async function walk() {
  const browser = await launchBrowser(VIEWPORTS.desktop);
  const errors = [];
  const record = { state: STATE, tag: TAG, proxy: PROXY, request: null, response: null, blocked: [] };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height, deviceScaleFactor: 1 });
    attachErrorLog(page, errors, `lp-live ${TAG}`);
    await page.setRequestInterception(true);
    page.on('request', async (req) => {
      const url = req.url();
      if (BLOCKED_HOSTS.test(url)) {
        record.blocked.push(url);
        return req.abort();
      }
      if (req.method() === 'POST' && /\/api\/lead$/.test(url.split('?')[0])) {
        const body = req.postData() || '';
        try {
          record.request = JSON.parse(body);
        } catch {
          record.request = body;
        }
        if (!PROXY) return req.continue();
        try {
          const res = await fetch(`${PROXY}/api/lead`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'lp-live-qa/1.0 (+localhost)' },
            body,
          });
          const text = await res.text();
          record.response = { status: res.status, body: text.slice(0, 300), via: PROXY };
          return req.respond({ status: res.status, contentType: 'application/json', body: text });
        } catch (e) {
          record.response = { status: null, error: String(e) };
          return req.abort();
        }
      }
      return req.continue();
    });
    page.on('response', (res) => {
      if (!PROXY && res.request().method() === 'POST' && /\/api\/lead$/.test(res.url().split('?')[0])) {
        res.text().then((t) => {
          record.response = { status: res.status(), body: t.slice(0, 300), via: 'dev' };
        }).catch(() => {});
      }
    });

    await page.goto(`${QA_BASE}${PAGE_PATH}${LANDING_QS}`, { waitUntil: 'networkidle0', timeout: 45000 });
    await settle(1800);

    const clickText = (text) =>
      page.evaluate((t) => {
        const needle = t.trim().toLowerCase();
        const els = Array.from(document.querySelectorAll('button, a, [role="button"], label')).filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return false;
          const st = getComputedStyle(el);
          if (st.visibility === 'hidden' || st.display === 'none') return false;
          return (el.textContent || '').trim().toLowerCase().includes(needle);
        });
        if (!els.length) return false;
        els.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return ra.width * ra.height - rb.width * rb.height;
        });
        els[0].scrollIntoView({ block: 'center' });
        els[0].click();
        return true;
      }, text);
    const fillFirstEmpty = async (value) => {
      const ok = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input:not([type])')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 2 && r.height > 2 && !el.disabled && !el.value;
        });
        if (!inputs[0]) return false;
        inputs[0].focus();
        return true;
      });
      if (!ok) throw new Error(`no empty visible input for "${value}"`);
      await page.keyboard.type(String(value), { delay: 6 });
    };
    const step = async (label, fn) => {
      const ok = await fn();
      if (ok === false) throw new Error(`step failed: ${label}`);
      await settle(650);
    };

    await step('path', () => clickText('buy a rental'));
    await step('process', () => clickText('Just starting my research'));
    await step('property', () => clickText('Single-family'));
    await step('credit', () => clickText('740 or above'));
    await step('price', () => clickText('CONTINUE'));
    await step('down', () => clickText('CONTINUE'));
    await fillFirstEmpty(STATE);
    await page.keyboard.press('Escape');
    await settle(200);
    await step('location', () => clickText('CONTINUE'));

    const kicked = await page.evaluate(() => /not in .* yet\./i.test(document.body.innerText));
    if (kicked) {
      const headline = await page.evaluate(() => (document.querySelector('h2.fv3-display') || {}).textContent || '');
      ensureShots('live');
      await page.screenshot({ path: `tools/shots/live/desktop-${TAG}-kickout.png` });
      log('kickout', headline.trim());
      log('POST made', record.request ? 'YES (FAIL)' : 'none');
      const ok = !record.request;
      console.log(ok ? `PASS excluded state ${STATE}: kick-out shown, no POST, no Zap` : 'FAIL excluded state posted');
      writeFileSync(`tools/shots/live/${TAG}.json`, JSON.stringify({ ...record, errors }, null, 2));
      process.exitCode = ok ? 0 : 1;
      return;
    }

    await fillFirstEmpty(QA_LEAD.firstName);
    await fillFirstEmpty(QA_LEAD.lastName);
    await fillFirstEmpty(QA_LEAD.email);
    await step('contact', () => clickText('CONTINUE'));
    await fillFirstEmpty(QA_LEAD.phone);
    await settle(200);
    await step('consent', () =>
      page.evaluate(() => {
        const box = Array.from(document.querySelectorAll('input[type="checkbox"]')).find((el) => !el.checked);
        if (!box) return false;
        (box.closest('label') || box).click();
        return true;
      }),
    );
    // V3's live submit label (the old 'GET MY BROKER!' is stale; a missed click
    // here used to time out silently at the wait below)
    await step('submit', () => clickText('MATCH ME WITH A BROKER'));

    await page.waitForFunction(
      () => location.pathname === '/thank-you/' || !!document.querySelector('[role="alert"]'),
      { timeout: 30000 },
    );
    await settle(1500);
    const url = page.url();
    const onThankYou = /\/thank-you\//.test(url);
    let specialist = null;
    let stored = null;
    if (onThankYou) {
      await page.waitForFunction(() => /Your Matched Specialist/i.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
      specialist = await page.evaluate(() => {
        const label = Array.from(document.querySelectorAll('p')).find((p) => /your matched specialist/i.test(p.textContent || ''));
        const h2 = label ? label.parentElement.querySelector('h2') : null;
        return h2 ? h2.textContent.trim() : null;
      });
      stored = await page.evaluate(() => {
        try {
          const raw = sessionStorage.getItem('dscrbroker_submission');
          if (!raw) return null;
          const d = JSON.parse(raw);
          return { matchedBroker: d.matchedBroker, state: d.state, stateCode: d.stateCode, leadSource: d.leadSource, dealTier: d.dealTier, program: d.program?.program };
        } catch {
          return null;
        }
      });
    } else {
      record.alert = await page.evaluate(() => (document.querySelector('[role="alert"]') || {}).textContent || null);
    }
    ensureShots('live');
    await page.screenshot({ path: `tools/shots/live/desktop-${TAG}-${onThankYou ? 'thankyou' : 'error'}.png` });

    const req = record.request || {};
    log('landing url', `${PAGE_PATH}${LANDING_QS}`);
    log('payload keys', Object.keys(req));
    log('source', req.source);
    log('consent', req.consent ? { agreed: req.consent.agreed, agreedAt: req.consent.agreedAt, url: req.consent.url, textLen: (req.consent.text || '').length } : null);
    log('routing', { state: req.state, stateCode: req.stateCode, matchedBroker: req.matchedBroker, loanGoal: req.loanGoal, propertyType: req.propertyType, creditScore: req.creditScore, propertyValue: req.propertyValue, downPayment: req.downPayment, timeline: req.timeline, leadSource: req.leadSource });
    log('api response', record.response);
    log('final url', url);
    log('sessionStorage', stored);
    log('specialist', specialist);
    // Expected noise: the gtag loads THIS tool aborts (net::ERR_FAILED) and the
    // dev-only Vite "504 Outdated Optimize Dep" (exempted across the lp:* suite).
    const realErrors = errors.filter((e) => !/net::ERR_FAILED|Outdated Optimize Dep/.test(e));
    log('blocked hosts', record.blocked.length);
    log('page errors', realErrors);
    writeFileSync(`tools/shots/live/${TAG}.json`, JSON.stringify({ ...record, url, stored, specialist, errors }, null, 2));

    const ok =
      onThankYou &&
      /\?demo=1/.test(url) &&
      record.response?.status === 200 &&
      stored &&
      typeof stored.matchedBroker === 'string' &&
      !!specialist &&
      realErrors.length === 0;
    console.log(ok ? `PASS live ${STATE}: assignedBroker=${stored.matchedBroker} specialist="${specialist}"` : `FAIL live ${STATE}`);
    process.exitCode = ok ? 0 : 1;
  } finally {
    await browser.close();
  }
}

if (CONSENT_400) await consent400();
else await walk();
