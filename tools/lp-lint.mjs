// Copy + compliance + source + CSS-leak lint for /qualify/ (the lp-t4 page since
// the 2026-10-30 migration; FORM-LP-BRIEF.md section 5). Reads the BUILT output:
// <dist>/qualify/index.html (requires npm run build; this tool does not build).
// Resolves the dist root the same way tools/serve-dist.mjs does.
//
//   node tools/lp-lint.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, makeChecker } from './lp-lib.mjs';
import { resolveRoot } from './serve-dist.mjs';

const { check, summary } = makeChecker();

let distRoot;
try {
  distRoot = resolveRoot();
} catch (e) {
  console.error(`lp-lint: ${e.message}`);
  process.exit(1);
}

const LP_T4_HTML = join(distRoot, 'qualify', 'index.html');
if (!existsSync(LP_T4_HTML)) {
  console.error(`lp-lint: not found: ${LP_T4_HTML} (run npm run build first)`);
  process.exit(1);
}
const rawHtml = readFileSync(LP_T4_HTML, 'utf8');

// ---------------------------------------------------------------------------
// Strip exempt surfaces before copy checks: every <details>...</details> block
// (verbatim FAQ), <meta name="description"> content, and the consent label text.
// ---------------------------------------------------------------------------
function stripExempt(html) {
  let out = html.replace(/<details[\s\S]*?<\/details>/gi, '<!--details-stripped-->');
  out = out.replace(/(<meta\s+name=["']description["']\s+content=)(["']).*?\2/i, '$1"$2stripped$2"');
  // consent label text: the checkbox's label element, wherever it renders (best-effort
  // strip by matching a label whose text mentions "consent" or the TCPA phrase markers).
  out = out.replace(/<label[^>]*>(?:(?!<\/label>)[\s\S])*?(?:consent|text messages|calls|SMS)(?:(?!<\/label>)[\s\S])*?<\/label>/gi, '<!--consent-label-stripped-->');
  return out;
}
const html = stripExempt(rawHtml);

// ---------------------------------------------------------------------------
// FAIL patterns
// ---------------------------------------------------------------------------
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const FAIL_PATTERNS = [
  ['em dash', new RegExp(EM_DASH)],
  ['en dash', new RegExp(EN_DASH)],
  ['soft/hard pull language', /soft pull|hard pull|soft credit|hard credit|pulls your credit/i],
  ['"credit pull" not preceded by "no " or "involve a "', (() => {
    // Custom check below (needs lookbehind-safe logic across the whole doc).
    return null;
  })()],
  ['rate phrase: best rate', /best rate/i],
  ['rate phrase: lowest rate', /lowest rate/i],
  ['rate phrase: rate shop', /rate shop/i],
  ['rate phrase: compare rates', /compare rates/i],
  ['rate phrase: rate options', /rate options/i],
  ['rate phrase: rate estimate', /rate estimate/i],
  ['rate phrase: rate range', /rate range/i],
  ['rate phrase: rate quote', /rate quote/i],
  ['rate phrase: rates from', /rates from/i],
  ['rate phrase: starting at N', /starting at \d/i],
  ['rate phrase: from N%', /from \d+(\.\d+)?%/i],
  ['rate phrase: compete for your deal', /compete for your deal/i],
  ['rate phrase: lower your rate', /lower your rate/i],
  ['rate phrase: interest rate', /interest rate/i],
  ['day-count promise', /\b\d+\s*(business\s*)?days?\b/i],
  ['Equal Housing Lender (must be Equal Housing Opportunity)', /Equal Housing Lender/i],
  ['"we lend"', /we lend/i],
  ['"our loans"', /our loans/i],
  ['banned word: discover', /\bdiscover\b/i],
  ['banned word: unlock', /\bunlock\b/i],
  ['banned word: elevate', /\belevate\b/i],
  ['banned word: seamlessly', /\bseamlessly\b/i],
  ['banned word: leverage', /\bleverage\b/i],
  ['banned word: cutting-edge', /cutting-edge/i],
  ['banned word: delve', /\bdelve\b/i],
  ['banned word: comprehensive', /\bcomprehensive\b/i],
  ['banned word: transformative', /\btransformative\b/i],
  ['banned word: robust', /\brobust\b/i],
  ['banned word: curated', /\bcurated\b/i],
  ['banned word: tailored', /\btailored\b/i],
  ['banned word: empower', /\bempower\b/i],
  ['banned word: journey', /\bjourney\b/i],
  ['banned word: innovative', /\binnovative\b/i],
  ['banned word: revolutionizing', /revolutionizing/i],
  ['banned word: disrupting', /disrupting/i],
  ['banned word: hassle-free', /hassle-free/i],
  ['banned word: stress-free', /stress-free/i],
  ['banned word: dream home', /dream home/i],
  ['banned word: one-stop shop', /one-stop shop/i],
  ['banned word: best rates guaranteed', /best rates guaranteed/i],
  ['"50 states" / "all 50"', /\b50 states\b|\ball 50\b/i],
  ['fonts.googleapis', /fonts\.googleapis/i],
  ['gstatic', /gstatic/i],
].filter(([, re]) => re); // drop the placeholder null entry
// (googletagmanager + hotjar were FAIL patterns in the branch's zero-tracking
// era; since the 2026-10-30 live migration they are asserted as REQUIRED with
// the right ids under PASS requirements below.)

for (const [label, re] of FAIL_PATTERNS) {
  const m = html.match(re);
  check(`FAIL-pattern absent: ${label}`, !m, m ? `matched "${m[0]}"` : '');
}

// "credit pull" not preceded by "no " or "involve a " (canonical: "No credit pull").
{
  const re = /credit pull/gi;
  const offenders = [];
  let m;
  while ((m = re.exec(html))) {
    const before = html.slice(Math.max(0, m.index - 20), m.index);
    if (!/no\s+$/i.test(before) && !/involve a\s+$/i.test(before)) {
      offenders.push(html.slice(Math.max(0, m.index - 20), m.index + 20).replace(/\s+/g, ' '));
    }
  }
  check('"credit pull" only preceded by "no " or "involve a "', offenders.length === 0, offenders.join(' || '));
}

// Phone numbers, except form placeholders starting "(555)". Scanned with
// <script> bodies stripped: the ban is on VISIBLE copy, and the gtag ids
// (AW-18416211451) are 10+ digit runs that false-positive the pattern.
{
  const visible = html.replace(/<script[\s\S]*?<\/script>/gi, '<!--script-stripped-->');
  const re = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const offenders = [];
  let m;
  while ((m = re.exec(visible))) {
    if (/^\(555\)/.test(m[0])) continue;
    offenders.push(m[0]);
  }
  check('no phone numbers in visible copy (except (555) placeholders)', offenders.length === 0, offenders.join(', '));
}

// ---------------------------------------------------------------------------
// PASS requirements
// ---------------------------------------------------------------------------
{
  const h1Matches = rawHtml.match(/<h1[\s>]/gi) || [];
  check('exactly one <h1', h1Matches.length === 1, `found ${h1Matches.length}`);
}
check('noindex present', /noindex/i.test(rawHtml));
check('lang="en" present', /lang=["']en["']/i.test(rawHtml));

// Live tracking stack (2026-10-30 migration): the page must carry the SITE's
// gtag ids and Hotjar, and must never carry John's personal Ads tag.
check('gtag GA4 id G-W92EXVZW3P present', rawHtml.includes('G-W92EXVZW3P'));
check('gtag Ads id AW-18416211451 present', rawHtml.includes('AW-18416211451'));
check('forbidden tag AW-11297975154 ABSENT', !rawHtml.includes('AW-11297975154'));
check('Hotjar snippet present (site id 6753255)', /hotjar/i.test(rawHtml) && rawHtml.includes('6753255'));
check('gtag deferred via afterPaint', /afterPaint\(/.test(rawHtml));

// font-display:optional present in the linked CSS.
{
  const linkHrefs = [...rawHtml.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
  let found = false;
  const checked = [];
  for (const href of linkHrefs) {
    const clean = href.split('?')[0].replace(/^\//, '');
    const file = join(distRoot, clean);
    if (!existsSync(file)) continue;
    checked.push(href);
    const css = readFileSync(file, 'utf8');
    if (/font-display:\s*optional/i.test(css)) {
      found = true;
      break;
    }
  }
  check('font-display:optional present in linked CSS', found, `checked: ${checked.join(', ') || 'no linked stylesheets resolved'}`);
}

// ---------------------------------------------------------------------------
// SOURCE guard: src/components/form-templates/v3/*.tsx must contain no hardcoded
// color utility from the banned list, and no #rrggbb literal outside the --fv3-*
// default block in CSS_TEXT.
// ---------------------------------------------------------------------------
const V3_DIR = join(ROOT, 'src', 'components', 'form-templates', 'v3');
const V3_FILES = ['bits.tsx', 'FormV3.tsx', 'illustrations.tsx', 'screens.tsx', 'steps-choice.tsx', 'steps-input.tsx'];
const UTILITY_RE = /\b(text|bg|border|decoration|from|to)-(white|navy|gray|green|blue|amber|\[#)/;
const HEX_RE = /#[0-9a-fA-F]{3,6}\b/g;

for (const fname of V3_FILES) {
  const fpath = join(V3_DIR, fname);
  if (!existsSync(fpath)) {
    check(`SOURCE guard: ${fname} exists`, false, 'not found');
    continue;
  }
  const src = readFileSync(fpath, 'utf8');
  const utilHit = src.match(UTILITY_RE);
  check(`SOURCE guard: ${fname} has no banned color utility`, !utilHit, utilHit ? `matched "${utilHit[0]}"` : '');

  // Locate the --fv3-* default block inside CSS_TEXT (if this file defines it) and
  // exclude hex literals found within it.
  let srcForHexCheck = src;
  const cssTextIdx = src.indexOf('CSS_TEXT');
  if (cssTextIdx >= 0) {
    // Find the --fv3- default block: from the first "--fv3-" occurrence after
    // CSS_TEXT to the matching closing of that template literal's root rule.
    const fv3Start = src.indexOf('--fv3-', cssTextIdx);
    if (fv3Start >= 0) {
      // Find the enclosing `{ ... }` (the :root-equivalent block) by scanning
      // backward for the last unmatched `{` before fv3Start and forward for its
      // matching `}`.
      let openBrace = src.lastIndexOf('{', fv3Start);
      let depth = 1;
      let closeBrace = -1;
      for (let j = openBrace + 1; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') {
          depth--;
          if (depth === 0) {
            closeBrace = j;
            break;
          }
        }
      }
      if (openBrace >= 0 && closeBrace > openBrace) {
        srcForHexCheck = src.slice(0, openBrace) + src.slice(closeBrace + 1);
      }
    }
  }
  const hexHits = srcForHexCheck.match(HEX_RE) || [];
  check(`SOURCE guard: ${fname} has no #hex literal outside --fv3-* defaults`, hexHits.length === 0, hexHits.join(', '));
}

// ---------------------------------------------------------------------------
// CSS LEAK guard: the /qualify/ page's <link rel=stylesheet> set must be
// disjoint from the site's own surfaces (homepage, a state page, thank-you).
// /qualify/'s CSS must contain --color-brand-deep and Bricolage; none of the
// others' CSS may contain --color-brand-deep (lp-t4.css never leaks sitewide,
// global.css never leaks into /qualify/).
// ---------------------------------------------------------------------------
function stylesheetHrefs(htmlPath) {
  if (!existsSync(htmlPath)) return null;
  const doc = readFileSync(htmlPath, 'utf8');
  return [...doc.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map((m) => m[1].split('?')[0]);
}
function cssContains(hrefs, needle) {
  for (const href of hrefs) {
    const file = join(distRoot, href.replace(/^\//, ''));
    if (!existsSync(file)) continue;
    if (readFileSync(file, 'utf8').includes(needle)) return true;
  }
  return false;
}

const OTHER_PAGES = {
  'index.html': join(distRoot, 'index.html'),
  'states/texas/index.html': join(distRoot, 'states', 'texas', 'index.html'),
  'thank-you/index.html': join(distRoot, 'thank-you', 'index.html'),
};

const lpT4Hrefs = stylesheetHrefs(LP_T4_HTML) || [];
check('lp-t4 has at least one linked stylesheet', lpT4Hrefs.length > 0, `found ${lpT4Hrefs.length}`);

for (const [label, path] of Object.entries(OTHER_PAGES)) {
  const otherHrefs = stylesheetHrefs(path);
  if (otherHrefs === null) {
    check(`CSS LEAK guard: ${label} exists for comparison`, false, `not found at ${path}`);
    continue;
  }
  const overlap = lpT4Hrefs.filter((h) => otherHrefs.includes(h));
  check(`CSS LEAK guard: lp-t4 stylesheet set disjoint from ${label}`, overlap.length === 0, overlap.join(', '));
  const otherHasBrandDeep = cssContains(otherHrefs, '--color-brand-deep');
  check(`CSS LEAK guard: ${label}'s CSS does not contain --color-brand-deep`, !otherHasBrandDeep);
}

check('lp-t4 CSS contains --color-brand-deep', cssContains(lpT4Hrefs, '--color-brand-deep'));
check('lp-t4 CSS contains Bricolage', cssContains(lpT4Hrefs, 'Bricolage'));

const ok = summary();
process.exit(ok ? 0 : 1);
