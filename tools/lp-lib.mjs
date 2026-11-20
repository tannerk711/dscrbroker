// Shared helpers for the site QA tools (lp-events, qualify-shoot).
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SHOTS_DIR = fileURLToPath(new URL('./shots/', import.meta.url));
export const CHROME_PATH = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// Desktop dsf1, mobile dsf2 hasTouch true. NEVER isMobile on a viewport that
// measures fixed-position UI: on Windows headless Chrome it inflates the
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

export function ensureShots(sub = '') {
  const dir = sub ? `${SHOTS_DIR}${sub}/` : SHOTS_DIR;
  mkdirSync(dir, { recursive: true });
  return dir;
}

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
