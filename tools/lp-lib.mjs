// Shared helpers for the lp-t4 QA tools (lp-shoot, lp-walk, lp-network, lp-fold,
// lp-overflow, lp-motion-check, lp-lint, lp-lh). Ported from
// clients/dscr-funnel-template-4/tools/qa-lib.mjs. Since the 2026-10-30
// migration the lp-t4 page lives at /qualify/ on main (live lead delivery);
// the /forms/ comparison hub exists only on branch form-templates.
//
// Port-squatter guard: refuses to trust a server whose served <title> for
// /qualify/ lacks the lp-t4 title token (a foreign project's dev server could
// be squatting the port; memory reference_port_4321_respawner).
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const SHOTS_DIR = fileURLToPath(new URL('./shots/', import.meta.url));
export const QA_BASE = (process.env.QA_BASE || 'http://localhost:4322').replace(/\/+$/, '');
export const CHROME_PATH = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// Year-proof slice of the /qualify/ title ("Check Your <year> DSCR Loan Eligibility | DSCRBroker.com").
export const QUALIFY_TITLE_TOKEN = 'DSCR Loan Eligibility';
export const LP_T4_PATH = '/qualify/';

// One browser per viewport, defaultViewport at launch. Desktop dsf1, mobile dsf2
// hasTouch true. NEVER isMobile: on Windows headless Chrome it inflates the
// fixed-position containing block by ~35px (memory reference_mobile_screenshot_emulation).
export const VIEWPORTS = {
  desktop: { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
  mobile: { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true },
};

export const settle = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchBrowser(vp = VIEWPORTS.desktop, extraArgs = []) {
  if (!existsSync(CHROME_PATH)) {
    throw new Error(`Chrome not found at CHROME_PATH=${CHROME_PATH} (set CHROME_PATH to chrome.exe)`);
  }
  const { name, ...viewport } = vp;
  return puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: viewport,
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--window-size=1500,1000', '--no-first-run', '--no-default-browser-check', ...extraArgs],
  });
}

// Dev-only exemption: the Astro dev toolbar entrypoint 504s ("Outdated Optimize Dep")
// on every load because Vite re-discovers the page's dynamic gsap + lenis imports at
// startup and re-runs the optimizer. The toolbar is not part of the page and never
// ships; the message cannot occur against dist, so dist runs stay strict.
const DEV_TOOLBAR_504 = /Outdated Optimize Dep/;

export function attachErrorLog(page, sink, label) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    const loc = (m.location && m.location().url) || '';
    if (DEV_TOOLBAR_504.test(text) && (loc === '' || /dev-toolbar/.test(loc))) return;
    sink.push(`[console.error ${label}] ${text}`);
  });
  page.on('pageerror', (e) => sink.push(`[pageerror ${label}] ${e.message}`));
}

// Loads QA_BASE + path, asserts the layout width matches the viewport (retries on
// drift), asserts the served <title> of /forms/ carries the hub title (port-squatter
// guard), and returns the page.
export async function openPage(browser, path = LP_T4_PATH, opts = {}) {
  const vp = opts.vp || VIEWPORTS.desktop;
  const { name, ...viewport } = vp;
  const page = await browser.newPage();
  await page.setViewport(viewport);
  if (opts.errors) attachErrorLog(page, opts.errors, `${name} ${path}`);
  if (opts.init) await page.evaluateOnNewDocument(opts.init, ...(opts.initArgs || []));
  const url = QA_BASE + path;
  for (let i = 0; i < 4; i++) {
    try {
      await page.goto(url, { waitUntil: opts.waitUntil || 'networkidle0', timeout: 45000 });
    } catch (e) {
      throw new Error(`no server at QA_BASE (${url}): ${e.message.split('\n')[0]}`);
    }
    const w = await page.evaluate(() => document.documentElement.clientWidth);
    if (w === viewport.width) break;
    if (i === 3) throw new Error(`viewport never settled at ${viewport.width}px for ${path} (got ${w})`);
    console.warn(`  viewport drift on ${path}: got ${w}, want ${viewport.width}; re-applying + reloading`);
    await page.setViewport(viewport);
  }
  await assertServer(browser);
  return page;
}

let squatterChecked = false;
export async function assertServer(browser) {
  if (squatterChecked) return;
  const page = await browser.newPage();
  try {
    await page.goto(`${QA_BASE}${LP_T4_PATH}`, { waitUntil: 'networkidle0', timeout: 45000 });
  } catch (e) {
    await page.close();
    throw new Error(`no server at QA_BASE (${QA_BASE}${LP_T4_PATH}): ${e.message.split('\n')[0]}`);
  }
  const title = await page.title();
  await page.close();
  if (!title.includes(QUALIFY_TITLE_TOKEN)) {
    throw new Error(`no server at QA_BASE (${QA_BASE}): title "${title}" lacks "${QUALIFY_TITLE_TOKEN}" (a foreign server may be squatting the port)`);
  }
  squatterChecked = true;
}

// Scrolls the page in 600px steps so reveals fire and cv-auto sections paint, then
// back to top.
export async function scrollThrough(page, step = 600) {
  await page.evaluate(
    (s) =>
      new Promise((res) => {
        let y = 0;
        const tick = () => {
          y += s;
          window.scrollTo(0, y);
          if (y < document.documentElement.scrollHeight) setTimeout(tick, 110);
          else res(null);
        };
        tick();
      }),
    step
  );
  await settle(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(600);
}

export async function overflowReport(page) {
  return page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const offenders = [];
    if (sw > cw) {
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > cw + 1 && r.width > 2) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
      });
    }
    return { clientWidth: cw, scrollWidth: sw, offenders: offenders.slice(0, 12) };
  });
}

// Forces .cv-auto sections visible for a full-page capture (QA-side CSS, never
// shipped), then removes the override.
export async function withCvAutoVisible(page, fn) {
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.id = '__qa_cv';
    s.textContent = '.cv-auto{content-visibility:visible!important;contain-intrinsic-size:none!important}';
    document.head.appendChild(s);
  });
  await settle(400);
  try {
    return await fn();
  } finally {
    await page.evaluate(() => document.getElementById('__qa_cv')?.remove());
  }
}

export function ensureShots(sub = '') {
  const dir = sub ? `${SHOTS_DIR}${sub}/` : SHOTS_DIR;
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const shotPath = (viewport, name, sub = '') => `${ensureShots(sub)}${viewport}-${name}.png`;

// Tiny check harness shared by the assertion tools.
export function makeChecker() {
  const results = [];
  const check = (label, ok, detail = '') => {
    results.push({ label, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
    return ok;
  };
  const summary = () => {
    const failed = results.filter((r) => !r.ok);
    console.log('');
    console.log(`${results.length - failed.length}/${results.length} checks passed${failed.length ? `; FAILED: ${failed.map((f) => f.label).join('; ')}` : ''}`);
    return failed.length === 0;
  };
  return { check, summary, results };
}

// Network recorder, LIVE-mode semantics (the page carries the site gtag stack +
// Hotjar since the /qualify/ migration). Flags any request that is not:
//   - same-origin (localhost/127.0.0.1), ws(s):// HMR sockets, /@vite/ dev client
//   - a request to an allowlisted analytics host (the gtag constellation + Hotjar)
//   - a POST to the local /api/lead (the one lead webhook path)
// Google Fonts and gstatic stay FLAGGED: this page self-hosts its fonts, so a
// fonts.googleapis/gstatic request is a regression. Zapier must never appear
// client-side (the server forwards the lead).
const ALLOWED_THIRD_PARTY_RE =
  /(^|\.)googletagmanager\.com$|(^|\.)google-analytics\.com$|(^|\.)analytics\.google\.com$|(^|\.)googleadservices\.com$|(^|\.)doubleclick\.net$|(^|\.)google\.com$|(^|\.)hotjar\.(com|io)$/i;
const NEVER_ALLOWED_RE = /fonts\.googleapis|fonts\.gstatic|zapier/i;
export function attachNetworkRecorder(page, sink, opts = {}) {
  page.on('request', (req) => {
    try {
      const url = req.url();
      const method = req.method();
      if (/^wss?:/i.test(url)) return; // HMR / Hotjar sockets
      if (/\/@vite\//.test(url)) return; // Vite dev client
      let host = '';
      try {
        host = new URL(url).hostname;
      } catch {
        host = '';
      }
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
      const isLeadPost = isLocal && method === 'POST' && /\/api\/lead\/?$/.test(new URL(url, 'http://x').pathname);
      if (isLeadPost && opts.apiSink) opts.apiSink.push({ url, method });
      if (NEVER_ALLOWED_RE.test(url)) {
        sink.push({ url, method, reason: 'never-allowed pattern (fonts/zapier)' });
        return;
      }
      if (isLocal) {
        if (method === 'POST' && !isLeadPost) sink.push({ url, method, reason: 'unexpected local POST' });
        return;
      }
      if (!ALLOWED_THIRD_PARTY_RE.test(host)) {
        sink.push({ url, method, reason: 'non-allowlisted third-party host' });
      }
    } catch {
      /* ignore malformed request */
    }
  });
}
