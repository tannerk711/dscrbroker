// Validates + fixes the city data layer (src/data/cities/*.json).
// Usage:
//   node scripts/verify-city-data.mjs          report problems, exit 1 if any remain
//   node scripts/verify-city-data.mjs --fix    rewrite derived numbers in place, then report
//
// What it does:
//   1. Schema shape: required fields, types, slug format, programFit slugs, FAQ counts.
//   2. Derived math: recomputes downPayment, loanAmount, monthlyPI, monthlyTax,
//      monthlyPITIA, dscr, monthlyCashFlow, market.estDSCR, market.priceToRent
//      from the authored inputs (see src/data/cities/README.md math conventions).
//   3. Compliance sweep over every string: em/en dashes, rate positioning, "50+ lenders",
//      close-day counts, "soft pull", banned words, phone numbers.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIES_DIR = join(__dirname, '..', 'src', 'data', 'cities');
const FIX = process.argv.includes('--fix');

const PI_FACTOR = 0.00699;      // 30yr amortizing, internal assumption only
const IO_FACTOR = 0.00625;      // interest-only, internal assumption only

const VALID_PROGRAMS = new Set([
  'standard-dscr', 'no-ratio-dscr', 'interest-only-dscr', 'str-dscr',
  'foreign-national-dscr', 'bank-statement-dscr', 'portfolio-dscr', 'bridge-to-dscr',
]);
const VALID_BADGES = new Set(['friendly', 'moderate', 'tenant']);

// Compliance patterns. Each: [regex, message]. Case-insensitive where sensible.
const BANNED_PATTERNS = [
  [new RegExp('[' + String.fromCharCode(8212) + String.fromCharCode(8211) + ']'), 'em/en dash character'],
  [/\bcompare\s+rates\b/i, '"compare rates" (rate-shopping positioning)'],
  [/\b(lowest|best)\s+rates?\b/i, '"lowest/best rate"'],
  [/\brate\s+(range|quote|estimate|options|shopping)\b/i, 'rate-shopping positioning'],
  [/\brates?\s+from\b/i, '"rates from X"'],
  [/\b(from|starting\s+at)\s+\d+(\.\d+)?\s*%/i, 'rate range "from X%"'],
  [/\b\d+(\.\d+)?%\s+(rate|APR)\b/i, 'explicit rate figure'],
  [/\b50\+\s*(lenders|sources)/i, '"50+ lenders" (canonical is 70+)'],
  [/\bclose[sd]?\s+in\s+\d+\s+days?\b/i, 'close-day-count promise'],
  [/\b\d+\s+day\s+(close|closing)\b/i, 'close-day-count promise'],
  [/\bsoft\s+(credit\s+)?pull\b/i, '"soft pull" (banned credit language)'],
  [/\bhard\s+credit\s+pull\b/i, '"hard credit pull" (banned credit language)'],
  [/\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b/, 'phone number'],
  [/\bwe\s+(lend|pre-?qualif|pre-?approv|underwrit|structure\s+your|present\s+your|pull\s+your)/i, 'licensed activity attributed to "we"'],
  [/\bour\s+loans?\b/i, '"our loans" (site is not a lender)'],
  // Banned marketing words (word-boundary, case-insensitive)
  ...['discover', 'unlock', 'elevate', 'seamlessly', 'cutting-edge', 'delve',
    'comprehensive', 'transformative', 'robust', 'curated', 'tailored', 'empower',
    'innovative', 'revolutionizing', 'disrupting', 'hassle-free', 'stress-free',
    'one-stop shop'].map((w) => [new RegExp(`\\b${w.replace(/[-\s]/g, '[-\\s]')}\\b`, 'i'), `banned word "${w}"`]),
  [/\bdream\s+home\b/i, 'banned phrase "dream home"'],
];

const round = (n) => Math.round(n);
const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;

const problems = [];
const fixes = [];
function problem(file, path, msg) { problems.push(`${file} :: ${path} :: ${msg}`); }
function fixNote(file, path, from, to) { fixes.push(`${file} :: ${path} :: ${from} -> ${to}`); }

function sweepStrings(file, obj, path = '') {
  if (typeof obj === 'string') {
    for (const [re, msg] of BANNED_PATTERNS) {
      if (re.test(obj)) problem(file, path, `${msg}: "${obj.slice(0, 90)}..."`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => sweepStrings(file, v, `${path}[${i}]`));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) sweepStrings(file, v, path ? `${path}.${k}` : k);
  }
}

function setDerived(file, obj, key, computed, label) {
  const current = obj[key];
  if (current !== computed) {
    if (FIX) {
      fixNote(file, label, current, computed);
      obj[key] = computed;
    } else {
      problem(file, label, `derived value ${current} should be ${computed} (run --fix)`);
    }
  }
}

const files = readdirSync(CITIES_DIR).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.log('No city data files found in', CITIES_DIR);
  process.exit(0);
}

for (const file of files) {
  const fullPath = join(CITIES_DIR, file);
  let data;
  try {
    data = JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (e) {
    problem(file, '(file)', `invalid JSON: ${e.message}`);
    continue;
  }

  for (const key of ['state', 'abbreviation', 'stateSlug', 'dataUpdated', 'cities']) {
    if (!data[key]) problem(file, '(top)', `missing ${key}`);
  }
  if (!Array.isArray(data.cities)) continue;

  const slugs = new Set();
  for (const c of data.cities) {
    const p = `cities[${c.slug || c.city || '?'}]`;

    for (const key of ['city', 'slug', 'county', 'metro', 'hook', 'metaDescription',
      'market', 'overview', 'regulationBadge', 'regulationNote', 'neighborhoods',
      'localAngle', 'programFit', 'dealExample', 'faqItems', 'dataSources']) {
      if (c[key] === undefined || c[key] === null) problem(file, p, `missing ${key}`);
    }
    if (!c.market || !c.dealExample) continue;

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug || '')) problem(file, p, `bad slug "${c.slug}"`);
    if (slugs.has(c.slug)) problem(file, p, `duplicate slug`);
    slugs.add(c.slug);

    if (!VALID_BADGES.has(c.regulationBadge)) problem(file, p, `regulationBadge "${c.regulationBadge}" not friendly|moderate|tenant`);
    if (c.metaDescription && (c.metaDescription.length < 120 || c.metaDescription.length > 165)) {
      problem(file, p, `metaDescription length ${c.metaDescription.length} (target 140-160)`);
    }
    if (!Array.isArray(c.faqItems) || c.faqItems.length < 4 || c.faqItems.length > 6) {
      problem(file, p, `faqItems count ${c.faqItems?.length} (need 4-6)`);
    }
    if (!Array.isArray(c.neighborhoods) || c.neighborhoods.length < 3 || c.neighborhoods.length > 5) {
      problem(file, p, `neighborhoods count ${c.neighborhoods?.length} (need 3-5)`);
    }
    for (const prog of c.programFit || []) {
      if (!VALID_PROGRAMS.has(prog)) problem(file, p, `unknown programFit slug "${prog}"`);
    }
    if (!Array.isArray(c.dataSources) || c.dataSources.length < 3) {
      problem(file, p, `dataSources count ${c.dataSources?.length} (need 3+)`);
    }

    // Derived market numbers
    const m = c.market;
    setDerived(file, m, 'priceToRent', round1(m.medianPrice / (m.medianRent * 12)), `${p}.market.priceToRent`);
    const medTax = m.medianPrice * m.propertyTaxRate / 100 / 12;
    const medPITIA = m.medianPrice * 0.8 * PI_FACTOR + medTax + m.insuranceMonthly;
    setDerived(file, m, 'estDSCR', round2(m.medianRent / medPITIA), `${p}.market.estDSCR`);

    // Derived deal numbers
    const d = c.dealExample;
    if ('closingDays' in d) problem(file, p, 'dealExample has closingDays (banned: no new close-day promises)');
    setDerived(file, d, 'downPayment', round(d.purchasePrice * d.downPaymentPct / 100), `${p}.deal.downPayment`);
    setDerived(file, d, 'loanAmount', round(d.purchasePrice - d.downPayment), `${p}.deal.loanAmount`);
    const factor = d.interestOnly ? IO_FACTOR : PI_FACTOR;
    setDerived(file, d, 'monthlyPI', round(d.loanAmount * factor), `${p}.deal.monthlyPI`);
    setDerived(file, d, 'monthlyTax', round(d.purchasePrice * m.propertyTaxRate / 100 / 12), `${p}.deal.monthlyTax`);
    const pitia = d.monthlyPI + d.monthlyTax + d.monthlyInsurance + (d.monthlyHOA || 0);
    setDerived(file, d, 'monthlyPITIA', pitia, `${p}.deal.monthlyPITIA`);
    setDerived(file, d, 'dscr', round2(d.monthlyRent / d.monthlyPITIA), `${p}.deal.dscr`);
    setDerived(file, d, 'monthlyCashFlow', round(d.monthlyRent - d.monthlyPITIA), `${p}.deal.monthlyCashFlow`);
    if (!Array.isArray(d.specialistFocus) || d.specialistFocus.length < 2) {
      problem(file, p, 'dealExample.specialistFocus needs 2+ bullets');
    }
  }

  if (data.cities.length < 10 || data.cities.length > 12) {
    problem(file, '(top)', `city count ${data.cities.length} (target 10-12)`);
  }

  if (FIX) writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

  // Sweep AFTER fixes so messages reflect final content
  sweepStrings(file, data);
}

if (fixes.length) {
  console.log(`\nFixed ${fixes.length} derived values:`);
  for (const f of fixes) console.log('  ~', f);
}
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const pr of problems) console.log('  !', pr);
  process.exit(1);
} else {
  console.log(`\nOK: ${files.length} file(s) clean${FIX ? ' (after fixes)' : ''}.`);
}
