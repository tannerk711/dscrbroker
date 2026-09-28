// Validates + fixes the state data layer (src/data/states.json).
// Usage:
//   node scripts/verify-state-data.mjs                   report problems, exit 1 if any remain
//   node scripts/verify-state-data.mjs --fix              rewrite derived numbers in place, then report
//   node scripts/verify-state-data.mjs --file <path>      validate a different file (e.g. a scratch copy)
//   node scripts/verify-state-data.mjs --summary           print one summary line per state
//
// What it does:
//   1. Schema shape: required fields, types, slug format, landlordFriendly values,
//      topCities shape (all strings OR all objects), FAQ counts, relatedStates slugs exist.
//   2. Derived math: recomputes downPayment, loanAmount, monthlyPI, monthlyTax,
//      monthlyPITIA, dscr, monthlyCashFlow, estimatedDSCR, and each topCities[i].estDSCR
//      from the authored inputs (same conventions as verify-city-data.mjs).
//   3. Compliance sweep over every string: em/en dashes, rate positioning, "50+ lenders",
//      close-day-count PROMISES in prose, "soft pull", banned words, phone numbers.
//   4. Warnings (non-failing): repeated template tells and FAQ questions reused verbatim
//      (state-swapped) across more than 10 states.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const FIX = argv.includes('--fix');
const SUMMARY = argv.includes('--summary');
const fileFlagIdx = argv.indexOf('--file');
const DATA_FILE = fileFlagIdx !== -1 && argv[fileFlagIdx + 1]
  ? argv[fileFlagIdx + 1]
  : join(__dirname, '..', 'src', 'data', 'states.json');

const PI_FACTOR = 0.00699;      // 30yr amortizing, internal assumption only
const IO_FACTOR = 0.00625;      // interest-only, internal assumption only

const VALID_BADGES = new Set(['friendly', 'moderate', 'tenant']);

// Top-level schema. Required keys must be present; TIER is intentionally NOT
// in this list (see report) so it will surface as an "unknown key" problem
// alongside the stale `broker` field until a later session decides to keep it.
const REQUIRED_TOP_KEYS = [
  'state', 'abbreviation', 'slug', 'medianHomePrice', 'medianRent',
  'propertyTaxRate', 'insuranceMonthly', 'estimatedDSCR', 'landlordFriendly',
  'topCities', 'stateHook', 'relatedStates', 'commonPropertyTypes',
  'licensingNote', 'tier', 'marketOverview', 'dealExample', 'faqItems',
  'dataSources', 'dataUpdated',
];
const OPTIONAL_TOP_KEYS = ['metaAngle'];
const ALLOWED_TOP_KEYS = new Set([...REQUIRED_TOP_KEYS, ...OPTIONAL_TOP_KEYS]);

const REQUIRED_DEAL_KEYS = [
  'city', 'propertyType', 'purchasePrice', 'downPaymentPct', 'downPayment',
  'loanAmount', 'loanType', 'interestOnly', 'monthlyPI', 'monthlyTax',
  'monthlyInsurance', 'monthlyHOA', 'monthlyPITIA', 'monthlyRent', 'dscr',
  'monthlyCashFlow', 'closingDays',
];

// Compliance patterns. Each: [regex, message]. Case-insensitive where sensible.
// Ported verbatim from verify-city-data.mjs, plus the four new banned words and
// scoping fixes called out in the brief (property-tax %, factual notice/eviction
// day counts, and the numeric dealExample.closingDays field are all exempted).
const BANNED_PATTERNS = [
  [new RegExp('[' + String.fromCharCode(8212) + String.fromCharCode(8211) + ']'), 'em/en dash character'],
  [/\bcompare\s+rates\b/i, '"compare rates" (rate-shopping positioning)'],
  [/\b(lowest|best)\s+rates?\b/i, '"lowest/best rate"'],
  [/\brate\s+(range|quote|estimate|options|shopping)\b/i, 'rate-shopping positioning'],
  [/\brates?\s+from\b/i, '"rates from X"'],
  // Rate range "from X%" but not a property-tax effective-rate figure.
  [/\b(from|starting\s+at)\s+\d+(\.\d+)?\s*%(?!\s*(effective|property\s+tax|tax\s+rate))/i, 'rate range "from X%"'],
  // Explicit rate figure, but not "X% effective (property tax) rate" / "X% tax rate".
  [/\b\d+(\.\d+)?%\s+(rate|APR)\b(?!\s*(applies\s+to\s+property\s+tax))/i, 'explicit rate figure'],
  [/\b50\+\s*(lenders|sources)/i, '"50+ lenders" (canonical is 70+)'],
  // Close-day-count PROMISE in prose: "close(s/d) in N days" / "N day close(ing)".
  // Scoped to closing language so factual notice/cure-period day counts
  // ("3-day notice", "30 days to cure") do not trip it.
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
    'one-stop shop', 'navigate', 'streamline', 'crucial', 'vital'].map((w) => [new RegExp(`\\b${w.replace(/[-\s]/g, '[-\\s]')}\\b`, 'i'), `banned word "${w}"`]),
  [/\bdream\s+home\b/i, 'banned phrase "dream home"'],
];

// Effective property-tax-rate mentions we must not flag as a rate claim, e.g.
// "0.41% effective rate" / "1.74% property tax". Checked separately so the
// general rate-figure pattern above doesn't need a fragile lookbehind.
function isTaxRateContext(str, matchIndex) {
  const windowStart = Math.max(0, matchIndex - 40);
  const windowEnd = Math.min(str.length, matchIndex + 60);
  const around = str.slice(windowStart, windowEnd);
  return /(property\s+tax|tax\s+rate|effective\s+rate|effective\s+tax)/i.test(around);
}

const round = (n) => Math.round(n);
const round2 = (n) => Math.round(n * 100) / 100;

const problems = [];
const warnings = [];
const fixes = [];
function problem(slug, path, msg) { problems.push(`${slug} :: ${path} :: ${msg}`); }
function warn(msg) { warnings.push(msg); }
function fixNote(slug, path, from, to) { fixes.push(`${slug} :: ${path} :: ${from} -> ${to}`); }

function sweepStrings(slug, obj, path = '') {
  if (typeof obj === 'string') {
    for (const [re, msg] of BANNED_PATTERNS) {
      const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
      const reG = new RegExp(re.source, flags);
      let m;
      while ((m = reG.exec(obj)) !== null) {
        // Skip the "explicit rate figure" / "rate range from X%" patterns when
        // the number is actually a property-tax / effective-rate mention.
        if ((msg === 'explicit rate figure' || msg === 'rate range "from X%"') && isTaxRateContext(obj, m.index)) {
          continue;
        }
        problem(slug, path, `${msg}: "${obj.slice(0, 90)}${obj.length > 90 ? '...' : ''}"`);
        if (!re.global) break; // non-global source, one hit is enough
      }
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => sweepStrings(slug, v, `${path}[${i}]`));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) sweepStrings(slug, v, path ? `${path}.${k}` : k);
  }
}

function setDerived(slug, obj, key, computed, label, missingInputs) {
  if (missingInputs && missingInputs.length) {
    problem(slug, label, `cannot compute (missing input: ${missingInputs.join(', ')})`);
    return;
  }
  if (computed === null || Number.isNaN(computed)) {
    problem(slug, label, `computed value is invalid (check inputs)`);
    return;
  }
  const current = obj[key];
  if (current !== computed) {
    if (FIX) {
      fixNote(slug, label, current, computed);
      obj[key] = computed;
    } else {
      problem(slug, label, `shown ${current}, computed ${computed}`);
    }
  }
}

function missing(obj, keys) {
  return keys.filter((k) => obj[k] === undefined || obj[k] === null);
}

let raw;
try {
  raw = readFileSync(DATA_FILE, 'utf8');
} catch (e) {
  console.log(`Cannot read ${DATA_FILE}: ${e.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.log(`Invalid JSON in ${DATA_FILE}: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(data)) {
  console.log(`${DATA_FILE} is not an array of state objects.`);
  process.exit(1);
}

const allSlugs = new Set(data.map((s) => s.slug).filter(Boolean));
const seenSlugs = new Set();
const metaAngles = new Map(); // metaAngle text -> [slugs]
const faqQuestionCounts = new Map(); // normalized question -> count

// Template-tell phrases (WARNINGS category, non-failing).
const TEMPLATE_TELLS = [
  /opportunities\s+for\s+investors\s+who/i,
  /create\s+unique\s+DSCR\s+opportunities/i,
  /offers\s+DSCR\s+investors/i,
  /provides\s+DSCR\s+investors/i,
];
const tellCounts = new Map(); // tell source -> count
const tellLabels = [
  '"opportunities for investors who"',
  '"create unique DSCR opportunities"',
  '"offers DSCR investors"',
  '"provides DSCR investors"',
];

const summaryLines = [];

for (const entry of data) {
  const slug = entry.slug || entry.state || '(unknown)';
  const p = `[${slug}]`;

  if (seenSlugs.has(entry.slug)) problem(slug, p, `duplicate slug "${entry.slug}"`);
  if (entry.slug) seenSlugs.add(entry.slug);

  // --- Unknown top-level keys ---
  for (const key of Object.keys(entry)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      problem(slug, `${p}.(top)`, `unknown top-level key "${key}"`);
    }
  }

  // --- Required top-level presence ---
  const missingTop = missing(entry, REQUIRED_TOP_KEYS);
  for (const key of missingTop) problem(slug, `${p}.(top)`, `missing ${key}`);

  // --- Field-level validation (guarded so absent fields don't crash) ---
  if (entry.abbreviation !== undefined && !/^[A-Z]{2}$/.test(entry.abbreviation)) {
    problem(slug, `${p}.abbreviation`, `"${entry.abbreviation}" is not 2 uppercase letters`);
  }
  if (entry.slug !== undefined && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.slug)) {
    problem(slug, `${p}.slug`, `"${entry.slug}" is not lowercase-hyphen`);
  }
  if (entry.medianHomePrice !== undefined && !(entry.medianHomePrice > 0)) {
    problem(slug, `${p}.medianHomePrice`, `${entry.medianHomePrice} is not > 0`);
  }
  if (entry.medianRent !== undefined && !(entry.medianRent > 0)) {
    problem(slug, `${p}.medianRent`, `${entry.medianRent} is not > 0`);
  }
  if (entry.propertyTaxRate !== undefined && !(entry.propertyTaxRate >= 0.1 && entry.propertyTaxRate <= 3.5)) {
    problem(slug, `${p}.propertyTaxRate`, `${entry.propertyTaxRate} outside 0.1-3.5`);
  }
  if (entry.insuranceMonthly !== undefined && !(entry.insuranceMonthly > 0)) {
    problem(slug, `${p}.insuranceMonthly`, `${entry.insuranceMonthly} is not > 0`);
  }
  if (entry.landlordFriendly !== undefined && !VALID_BADGES.has(entry.landlordFriendly)) {
    problem(slug, `${p}.landlordFriendly`, `"${entry.landlordFriendly}" not friendly|moderate|tenant`);
  }
  if (entry.tier !== undefined && ![1, 2].includes(entry.tier)) {
    problem(slug, `${p}.tier`, `"${entry.tier}" is not 1 or 2`);
  }
  if (entry.dataUpdated !== undefined && !/^\d{4}-\d{2}$/.test(entry.dataUpdated)) {
    problem(slug, `${p}.dataUpdated`, `"${entry.dataUpdated}" is not YYYY-MM`);
  }

  // --- dataSources ---
  if (entry.dataSources !== undefined) {
    if (!Array.isArray(entry.dataSources) || entry.dataSources.length < 3 || entry.dataSources.some((s) => typeof s !== 'string' || !s.trim())) {
      problem(slug, `${p}.dataSources`, `needs >=3 non-empty strings, got ${JSON.stringify(entry.dataSources)}`);
    }
  }

  // --- commonPropertyTypes ---
  if (entry.commonPropertyTypes !== undefined) {
    if (!Array.isArray(entry.commonPropertyTypes) || entry.commonPropertyTypes.some((s) => typeof s !== 'string')) {
      problem(slug, `${p}.commonPropertyTypes`, `must be a string array`);
    }
  }

  // --- relatedStates: slugs that exist in the file ---
  if (entry.relatedStates !== undefined) {
    if (!Array.isArray(entry.relatedStates)) {
      problem(slug, `${p}.relatedStates`, `must be an array of slugs`);
    } else {
      for (const rs of entry.relatedStates) {
        if (!allSlugs.has(rs)) problem(slug, `${p}.relatedStates`, `references unknown slug "${rs}"`);
      }
    }
  }

  // --- topCities: >=3, all strings OR all objects ---
  let cityObjects = null; // set when shape is object-form, used for estDSCR math
  if (entry.topCities !== undefined) {
    if (!Array.isArray(entry.topCities) || entry.topCities.length < 3) {
      problem(slug, `${p}.topCities`, `needs >=3 entries, got ${Array.isArray(entry.topCities) ? entry.topCities.length : typeof entry.topCities}`);
    } else {
      const allStrings = entry.topCities.every((c) => typeof c === 'string');
      const allObjects = entry.topCities.every((c) => c && typeof c === 'object' && !Array.isArray(c));
      if (!allStrings && !allObjects) {
        problem(slug, `${p}.topCities`, `mixed shape: must be all strings or all {city, medianPrice, medianRent, estDSCR} objects`);
      } else if (allObjects) {
        cityObjects = entry.topCities;
        entry.topCities.forEach((c, i) => {
          const miss = missing(c, ['city', 'medianPrice', 'medianRent', 'estDSCR']);
          for (const key of miss) problem(slug, `${p}.topCities[${i}]`, `missing ${key}`);
        });
      }
    }
  }

  // --- stateHook / marketOverview / licensingNote presence already covered by REQUIRED_TOP_KEYS ---

  // --- faqItems: 4-6 of {question, answer}, non-empty ---
  if (entry.faqItems !== undefined) {
    if (!Array.isArray(entry.faqItems) || entry.faqItems.length < 4 || entry.faqItems.length > 6) {
      problem(slug, `${p}.faqItems`, `count ${Array.isArray(entry.faqItems) ? entry.faqItems.length : typeof entry.faqItems} (need 4-6)`);
    } else {
      entry.faqItems.forEach((f, i) => {
        if (!f || typeof f.question !== 'string' || !f.question.trim()) problem(slug, `${p}.faqItems[${i}]`, `empty/missing question`);
        if (!f || typeof f.answer !== 'string' || !f.answer.trim()) problem(slug, `${p}.faqItems[${i}]`, `empty/missing answer`);
        if (f && f.question && entry.state) {
          const normalized = f.question.replace(new RegExp(entry.state, 'gi'), '{S}').trim().toLowerCase();
          faqQuestionCounts.set(normalized, (faqQuestionCounts.get(normalized) || 0) + 1);
        }
      });
    }
  }

  // --- metaAngle (optional) ---
  if (entry.metaAngle !== undefined) {
    if (typeof entry.metaAngle !== 'string' || entry.metaAngle.length < 140 || entry.metaAngle.length > 160) {
      problem(slug, `${p}.metaAngle`, `length ${typeof entry.metaAngle === 'string' ? entry.metaAngle.length : typeof entry.metaAngle} (target 140-160)`);
    } else {
      if (!entry.metaAngle.includes(entry.state)) problem(slug, `${p}.metaAngle`, `does not contain state name "${entry.state}"`);
      if (!/DSCR/.test(entry.metaAngle)) problem(slug, `${p}.metaAngle`, `does not contain "DSCR"`);
      const list = metaAngles.get(entry.metaAngle) || [];
      list.push(slug);
      metaAngles.set(entry.metaAngle, list);
    }
  }

  // --- Derived: estimatedDSCR ---
  let estimatedDSCRComputed = null; // used below for the --summary line
  {
    const needed = ['medianRent', 'medianHomePrice', 'propertyTaxRate', 'insuranceMonthly'];
    const miss = missing(entry, needed);
    if (miss.length) {
      setDerived(slug, entry, 'estimatedDSCR', null, `${p}.estimatedDSCR`, miss);
    } else {
      const denom = entry.medianHomePrice * 0.8 * PI_FACTOR
        + entry.medianHomePrice * entry.propertyTaxRate / 100 / 12
        + entry.insuranceMonthly;
      estimatedDSCRComputed = round2(entry.medianRent / denom);
      setDerived(slug, entry, 'estimatedDSCR', estimatedDSCRComputed, `${p}.estimatedDSCR`);
    }
  }

  // --- Derived: topCities[i].estDSCR (object form only) ---
  if (cityObjects) {
    cityObjects.forEach((c, i) => {
      const needed = ['medianRent', 'medianPrice'];
      const missCity = missing(c, needed);
      const missState = missing(entry, ['propertyTaxRate', 'insuranceMonthly']);
      const allMissing = [...missCity, ...missState];
      if (allMissing.length) {
        setDerived(slug, c, 'estDSCR', null, `${p}.topCities[${i}].estDSCR`, allMissing);
      } else {
        const denom = c.medianPrice * 0.8 * PI_FACTOR
          + c.medianPrice * entry.propertyTaxRate / 100 / 12
          + entry.insuranceMonthly;
        const computed = round2(c.medianRent / denom);
        setDerived(slug, c, 'estDSCR', computed, `${p}.topCities[${i}].estDSCR`);
      }
    });
  }

  // --- dealExample ---
  if (entry.dealExample) {
    const d = entry.dealExample;
    const dp = `${p}.dealExample`;

    const missDeal = missing(d, REQUIRED_DEAL_KEYS.filter((k) => k !== 'interestOnly' && k !== 'monthlyHOA'));
    for (const key of missDeal) problem(slug, dp, `missing ${key}`);

    if (d.downPaymentPct !== undefined && !(d.downPaymentPct >= 15 && d.downPaymentPct <= 40)) {
      problem(slug, `${dp}.downPaymentPct`, `${d.downPaymentPct} outside 15-40`);
    }
    if (typeof d.loanType === 'string') {
      if (d.loanType.includes('%')) problem(slug, `${dp}.loanType`, `contains "%": "${d.loanType}"`);
      if (/\b\d+(\.\d+)?\s*(rate|APR)\b/i.test(d.loanType)) problem(slug, `${dp}.loanType`, `contains a rate reference: "${d.loanType}"`);
    }
    if (d.monthlyInsurance !== undefined && !(d.monthlyInsurance > 0)) {
      problem(slug, `${dp}.monthlyInsurance`, `${d.monthlyInsurance} is not > 0`);
    }
    if (d.monthlyRent !== undefined && !(d.monthlyRent > 0)) {
      problem(slug, `${dp}.monthlyRent`, `${d.monthlyRent} is not > 0`);
    }
    if (d.monthlyHOA !== undefined && typeof d.monthlyHOA !== 'number') {
      problem(slug, `${dp}.monthlyHOA`, `must be a number, got ${typeof d.monthlyHOA}`);
    }
    if (d.closingDays !== undefined) {
      if (!Number.isInteger(d.closingDays) || d.closingDays < 14 || d.closingDays > 45) {
        problem(slug, `${dp}.closingDays`, `${d.closingDays} is not an integer 14-45`);
      }
    }

    // --- interestOnly presence / --fix insertion, positioned after loanType ---
    if (d.interestOnly === undefined) {
      const inferred = typeof d.loanType === 'string' ? /interest[- ]only/i.test(d.loanType) : false;
      if (FIX) {
        const rebuilt = {};
        for (const [k, v] of Object.entries(d)) {
          rebuilt[k] = v;
          if (k === 'loanType') rebuilt.interestOnly = inferred;
        }
        if (!('interestOnly' in rebuilt)) rebuilt.interestOnly = inferred; // loanType itself missing
        entry.dealExample = rebuilt;
        fixNote(slug, `${dp}.interestOnly`, 'undefined', inferred);
      } else {
        problem(slug, `${dp}.interestOnly`, `missing (run --fix; would infer ${inferred} from loanType)`);
      }
    } else if (typeof d.loanType === 'string') {
      const inferred = /interest[- ]only/i.test(d.loanType);
      if (inferred !== d.interestOnly) {
        problem(slug, `${dp}`, `interestOnly=${d.interestOnly} disagrees with loanType "${d.loanType}"`);
      }
    }

    // --- monthlyHOA presence / --fix insertion, positioned after monthlyInsurance ---
    if (d.monthlyHOA === undefined) {
      if (FIX) {
        const rebuilt = {};
        for (const [k, v] of Object.entries(entry.dealExample)) {
          rebuilt[k] = v;
          if (k === 'monthlyInsurance') rebuilt.monthlyHOA = 0;
        }
        if (!('monthlyHOA' in rebuilt)) rebuilt.monthlyHOA = 0; // monthlyInsurance itself missing
        entry.dealExample = rebuilt;
        fixNote(slug, `${dp}.monthlyHOA`, 'undefined', 0);
      } else {
        problem(slug, `${dp}.monthlyHOA`, `missing (run --fix; would insert 0)`);
      }
    }

    // Re-bind d/dp after possible key-order rebuilds above.
    const d2 = entry.dealExample;

    // --- Derived deal math ---
    {
      const miss = missing(d2, ['purchasePrice', 'downPaymentPct']);
      const computed = miss.length ? null : round(d2.purchasePrice * d2.downPaymentPct / 100);
      setDerived(slug, d2, 'downPayment', computed, `${dp}.downPayment`, miss);
    }
    {
      const miss = missing(d2, ['purchasePrice', 'downPayment']);
      const computed = miss.length ? null : round(d2.purchasePrice - d2.downPayment);
      setDerived(slug, d2, 'loanAmount', computed, `${dp}.loanAmount`, miss);
    }
    {
      const miss = missing(d2, ['loanAmount']);
      const factor = d2.interestOnly ? IO_FACTOR : PI_FACTOR;
      const computed = miss.length ? null : round(d2.loanAmount * factor);
      setDerived(slug, d2, 'monthlyPI', computed, `${dp}.monthlyPI`, miss);
    }
    {
      const miss = [...missing(d2, ['purchasePrice']), ...missing(entry, ['propertyTaxRate'])];
      const computed = miss.length ? null : round(d2.purchasePrice * entry.propertyTaxRate / 100 / 12);
      setDerived(slug, d2, 'monthlyTax', computed, `${dp}.monthlyTax`, miss);
    }
    {
      const miss = missing(d2, ['monthlyPI', 'monthlyTax', 'monthlyInsurance']);
      const computed = miss.length ? null : round(d2.monthlyPI + d2.monthlyTax + d2.monthlyInsurance + (d2.monthlyHOA || 0));
      setDerived(slug, d2, 'monthlyPITIA', computed, `${dp}.monthlyPITIA`, miss);
    }
    {
      const miss = missing(d2, ['monthlyRent', 'monthlyPITIA']);
      const computed = miss.length ? null : round2(d2.monthlyRent / d2.monthlyPITIA);
      setDerived(slug, d2, 'dscr', computed, `${dp}.dscr`, miss);
    }
    {
      const miss = missing(d2, ['monthlyRent', 'monthlyPITIA']);
      const computed = miss.length ? null : round(d2.monthlyRent - d2.monthlyPITIA);
      setDerived(slug, d2, 'monthlyCashFlow', computed, `${dp}.monthlyCashFlow`, miss);
    }

    // --- Summary line (always emitted, one per state, N/A where inputs are missing) ---
    const pitiaMiss = missing(d2, ['monthlyRent', 'monthlyPITIA']);
    const dscrText = pitiaMiss.length
      ? `shown ${d2.dscr} / computed N/A`
      : `shown ${d2.dscr} / computed ${round2(d2.monthlyRent / d2.monthlyPITIA)}`;
    const cfText = pitiaMiss.length
      ? `shown ${d2.monthlyCashFlow} / computed N/A`
      : `shown ${d2.monthlyCashFlow} / computed ${round(d2.monthlyRent - d2.monthlyPITIA)}`;
    const dscrColText = estimatedDSCRComputed === null
      ? `shown ${entry.estimatedDSCR} / computed N/A`
      : `shown ${entry.estimatedDSCR} / computed ${estimatedDSCRComputed}`;
    summaryLines.push(`${slug} | estimatedDSCR ${dscrColText} | deal dscr ${dscrText} | cash flow ${cfText}`);
  } else {
    // No dealExample at all: still emit a summary line so --summary covers every state.
    const dscrColText = estimatedDSCRComputed === null
      ? `shown ${entry.estimatedDSCR} / computed N/A`
      : `shown ${entry.estimatedDSCR} / computed ${estimatedDSCRComputed}`;
    summaryLines.push(`${slug} | estimatedDSCR ${dscrColText} | deal dscr N/A (no dealExample) | cash flow N/A (no dealExample)`);
  }

  // --- Template-tell warnings ---
  const haystack = JSON.stringify(entry);
  TEMPLATE_TELLS.forEach((re, i) => {
    if (re.test(haystack)) {
      const label = tellLabels[i];
      tellCounts.set(label, (tellCounts.get(label) || 0) + 1);
    }
  });
}

// --- Cross-state warning: metaAngle uniqueness ---
for (const [text, slugs] of metaAngles) {
  if (slugs.length > 1) {
    problem(slugs[0], '(cross-state)', `metaAngle duplicated across [${slugs.join(', ')}]: "${text.slice(0, 80)}..."`);
  }
}

// --- Cross-state warning: FAQ question reused verbatim on >10 states ---
for (const [question, count] of faqQuestionCounts) {
  if (count > 10) {
    warn(`FAQ question reused on ${count} states (>10 threshold): "${question.slice(0, 90)}"`);
  }
}
for (const [label, count] of tellCounts) {
  warn(`Template tell ${label}: appears on ${count} state(s)`);
}

// --- Compliance sweep (after fixes, so messages reflect final content) ---
for (const entry of data) {
  const slug = entry.slug || entry.state || '(unknown)';
  sweepStrings(slug, entry);
}

if (FIX) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

if (SUMMARY) {
  console.log('\nSummary (slug | estimatedDSCR shown/computed | deal dscr shown/computed | cash flow shown/computed):');
  for (const line of summaryLines) console.log('  ' + line);
}

if (fixes.length) {
  console.log(`\nFixed ${fixes.length} derived value(s):`);
  for (const f of fixes) console.log('  ~', f);
}

if (problems.length) {
  // Per-state problem counts
  const perState = new Map();
  for (const pr of problems) {
    const slug = pr.split(' :: ')[0];
    perState.set(slug, (perState.get(slug) || 0) + 1);
  }
  console.log(`\nProblem counts by state:`);
  for (const [slug, count] of [...perState.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug}: ${count}`);
  }
  console.log(`\n${problems.length} problem(s):`);
  for (const pr of problems) console.log('  !', pr);
}

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s) (non-failing):`);
  for (const w of warnings) console.log('  ?', w);
}

if (problems.length) {
  console.log(`\nFAILED: ${problems.length} problem(s) across ${data.length} state(s).`);
  process.exit(1);
} else {
  console.log(`\nOK: ${data.length} state(s) clean${FIX ? ' (after fixes)' : ''}. ${warnings.length} warning(s).`);
}
