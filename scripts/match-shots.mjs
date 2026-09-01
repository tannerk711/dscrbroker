// Screenshot + form-walk harness for the /match/ funnel (generic: labels come from the CLI).
//
//   node scripts/match-shots.mjs <url> [outPrefix] [flags]
//
// Flags:
//   --full                 full-page shots (desktop + mobile)
//   --scroll=0,900,1800    one viewport shot per offset per device
//   --walk="A|B|C"         MOBILE ONLY: click buttons by visible text in order, shot after each
//   --type="#sel=value"    type into a selector before the next click (repeatable, comma-separated)
//   --select="select=TX"   choose an option in a <select> (repeatable, comma-separated)
//   --desktop-only / --mobile-only
//   --out=<dir>            output directory (default: scratchpad match-lp/shots)
//
// Examples:
//   node scripts/match-shots.mjs http://127.0.0.1:4322/match/ fold
//   node scripts/match-shots.mjs http://127.0.0.1:4322/match/ walk --mobile-only --walk="Buy a rental|Single-family"
//
// Mobile emulation follows workspace memory: width/height/dsf/hasTouch only (isMobile:true
// inflates fixed-position boxes ~35px on Windows headless). Uses foundation/tools' puppeteer-core.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire('c:/Users/tanne/Downloads/Claude Code Master Projects/foundation/tools/index.js');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// Repo-local by default (scripts/ is gitignored, so shots never get committed).
const DEFAULT_OUT = join(fileURLToPath(new URL('.', import.meta.url)), '.qa-shots', 'shots');

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--'));
const flag = (name) => argv.find((a) => a.startsWith(`--${name}`));
const flagVal = (name) => {
  const f = flag(name);
  if (!f) return null;
  const i = f.indexOf('=');
  return i === -1 ? '' : f.slice(i + 1).replace(/^"|"$/g, '');
};

const url = positional[0];
const prefix = positional[1] || 'shot';
if (!url) {
  console.error('usage: node scripts/match-shots.mjs <url> [outPrefix] [flags]');
  process.exit(1);
}
const OUT = flagVal('out') || DEFAULT_OUT;
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const fullPage = flag('full') !== undefined;
const scrolls = flagVal('scroll')
  ? flagVal('scroll').split(',').map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n))
  : null;
const walk = flagVal('walk') ? flagVal('walk').split('|').map((s) => s.trim()).filter(Boolean) : null;
const types = flagVal('type') ? flagVal('type').split(',').map((s) => s.trim()).filter(Boolean) : [];
const selects = flagVal('select') ? flagVal('select').split(',').map((s) => s.trim()).filter(Boolean) : [];

const devices = [
  { name: 'desktop', w: 1440, h: 900, dsf: 1, touch: false },
  { name: 'mobile', w: 390, h: 844, dsf: 2, touch: true },
].filter((d) => (flag('desktop-only') !== undefined ? d.name === 'desktop' : true))
 .filter((d) => (flag('mobile-only') !== undefined ? d.name === 'mobile' : true));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickByText(page, text) {
  const ok = await page.evaluate((t) => {
    const els = [...document.querySelectorAll('button, a, label, [role="button"]')];
    const el = els.find((e) => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase().includes(t.toLowerCase()));
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error(`clickByText: "${text}" not found`);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const written = [];

for (const d of devices) {
  const page = await browser.newPage();
  await page.setViewport({ width: d.w, height: d.h, deviceScaleFactor: d.dsf, hasTouch: d.touch });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(400);

  const shot = async (label, opts = {}) => {
    const file = join(OUT, `${prefix}-${d.name}${label ? '-' + label : ''}.png`);
    await page.screenshot({ path: file, ...opts });
    written.push(file);
  };

  if (walk && d.name === 'mobile') {
    await shot('step0');
    for (let i = 0; i < walk.length; i++) {
      // apply typed values / selects queued for this step index: syntax "N:#sel=value"
      for (const t of types) {
        const [idx, rest] = t.includes(':') ? t.split(/:(.+)/) : [String(i), t];
        if (Number(idx) !== i) continue;
        const [sel, val] = rest.split(/=(.+)/);
        await page.type(sel, val, { delay: 10 });
      }
      for (const s of selects) {
        const [idx, rest] = s.includes(':') ? s.split(/:(.+)/) : [String(i), s];
        if (Number(idx) !== i) continue;
        const [sel, val] = rest.split(/=(.+)/);
        await page.select(sel, val);
      }
      await clickByText(page, walk[i]);
      await sleep(650);
      await shot(`step${i + 1}`);
    }
  } else if (scrolls) {
    for (let i = 0; i < scrolls.length; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), scrolls[i]);
      await sleep(350);
      await shot(`y${scrolls[i]}`);
    }
  } else {
    await shot('', { fullPage });
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const title = await page.title();
  console.log(`[${d.name}] title="${title}" horizontal-overflow=${overflow}px errors=${errors.length}${errors.length ? ' :: ' + errors.slice(0, 3).join(' | ') : ''}`);
  await page.close();
}

await browser.close();
console.log('wrote:\n' + written.map((w) => '  ' + w).join('\n'));
