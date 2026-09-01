// End-to-end QA for the /match/ funnel. Run before deploying ANY change to the
// match form, its data module, or /api/lead.
//
//   1. Dev server with every webhook pointed at the sink (shell env beats .env):
//        SINK=http://127.0.0.1:9799/hook
//        CI=true WEBHOOK_BROKER_A=$SINK ... WEBHOOK_BROKER_F=$SINK npx astro dev --port 4322 --host 127.0.0.1
//   2. node scripts/match-qa.mjs            (QA_BASE overrides the target; SHOTS=0 skips screenshots)
//
// Covers: API guards (consent, excluded state, honeypot), a full purchase walk on a
// 390px phone with the consent gate, a cash-out walk on desktop with the call sheet,
// all five soft stops + the under-15 panel (no webhook on any), payload contract,
// lead grade / dealSummary, and the thank-you render for both specialists.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('c:/Users/tanne/Downloads/Claude Code Master Projects/foundation/tools/index.js');
const puppeteer = require('puppeteer-core');

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4322';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.env.SHOTS !== '0';
// Repo-local by default (scripts/ is gitignored, so shots never get committed).
// Override with SHOTS_DIR for a session scratchpad.
const OUT = process.env.SHOTS_DIR || join(fileURLToPath(new URL('.', import.meta.url)), '.qa-shots', 'match-qa');
if (SHOTS && !existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- webhook sink (own port so it never collides with match-sink.mjs) ----
const hits = [];
const SINK_PORT = 9799;
let ownSink = null;
try {
  ownSink = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        hits.push(JSON.parse(body));
      } catch {
        hits.push({ raw: body });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
  });
  await new Promise((resolve, reject) => {
    ownSink.once('error', reject);
    ownSink.listen(SINK_PORT, '127.0.0.1', resolve);
  });
  console.log(`sink: listening on ${SINK_PORT}`);
} catch {
  ownSink = null;
  console.log('sink: port 9799 busy (match-sink.mjs running?). Stop it and re-run for payload assertions.');
  process.exit(2);
}

// ---- Test A: API guards ----
{
  const post = (body) =>
    fetch(`${BASE}/api/lead`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const consent = { agreed: true, text: 't', agreedAt: 'x', url: 'y' };
  let r = await post({ firstName: 'Bot', stateCode: 'TX', matchedBroker: 'broker_d' });
  check('A1 consent-less POST rejected 400', r.status === 400, `status=${r.status}`);
  r = await post({ stateCode: 'NY', matchedBroker: 'broker_a', consent });
  check('A2 excluded state rejected 400', r.status === 400, `status=${r.status}`);
  r = await post({ website: 'spam', stateCode: 'TX', matchedBroker: 'broker_d', consent });
  const j = await r.json();
  check('A3 honeypot silent 200, specialist null, no forward', r.status === 200 && j.assignedBroker === null && hits.length === 0, `hits=${hits.length}`);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

async function newPage(mobile) {
  const page = await browser.newPage();
  if (mobile) await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true });
  else await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') page.errors.push(m.text());
  });
  return page;
}
let shotN = 0;
async function shot(page, label) {
  if (!SHOTS) return;
  shotN += 1;
  await page.screenshot({ path: join(OUT, `${String(shotN).padStart(2, '0')}-${label}.png`) });
}
async function clickText(page, text, tag = 'button') {
  const ok = await page.evaluate(
    (t, tg) => {
      const els = [...document.querySelectorAll(tg)];
      const norm = (e) => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
      // exact match first ("15%" must not resolve to "Under 15%"), then substring
      const el = els.find((e) => norm(e) === t.toLowerCase()) || els.find((e) => norm(e).includes(t.toLowerCase()));
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    },
    text,
    tag
  );
  if (!ok) throw new Error(`clickText: "${text}" not found`);
  await sleep(520);
}
async function typeInto(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, value, { delay: 8 });
}
const title = (page) => page.$eval('h2.m-step-title', (h) => h.textContent.trim()).catch(() => '');
const bodyText = (page) => page.evaluate(() => document.body.innerText);
async function pickState(page, query, name) {
  await typeInto(page, 'input[aria-label="Property state"]', query);
  await sleep(200);
  await clickText(page, name, '[role="option"]');
}
async function openFresh(page, path = '/match/?qa=1') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
  // client:idle hydration: give the island a beat so the first click is never
  // a dead pre-hydration tap.
  await sleep(900);
}

// ---- Test B: purchase walk, mobile, Ohio -> Adam ----
{
  const page = await newPage(true);
  await openFresh(page);
  await shot(page, 'b-step1-fold');
  const fold = await page.evaluate(() => {
    const h1 = document.querySelector('h1').getBoundingClientRect();
    const opts = [...document.querySelectorAll('.m-opt')].map((o) => o.getBoundingClientRect().bottom);
    return { h1Top: h1.top, h1Bottom: h1.bottom, lastOptBottom: Math.max(...opts), optCount: opts.length };
  });
  check('B0 mobile fold: H1 + all 3 Q1 answers within 844px', fold.h1Top > 0 && fold.optCount === 3 && fold.lastOptBottom <= 700, JSON.stringify(fold));

  await clickText(page, 'Buying it');
  check('B1 Q2 is the state question', (await title(page)).includes("Where's the property"), await title(page));
  await pickState(page, 'oh', 'Ohio');
  const chip = await page.$eval('.m-chip', (e) => e.textContent.trim()).catch(() => '');
  check('B2 state chip appears', chip.includes('Specialist covers Ohio'), chip);
  check('B3 Q3 rental question', (await title(page)).includes('How will it be rented'), await title(page));
  await shot(page, 'b-step3-rental');
  await clickText(page, 'Long-term lease');
  check('B4 Q4 under contract', (await title(page)).includes('Under contract yet'), await title(page));
  await clickText(page, 'Yes, closing within 30 days');
  check('B5 Q5 property', (await title(page)).includes('What kind of property'), await title(page));
  await shot(page, 'b-step5-property');
  await clickText(page, '2 to 4 units');
  check('B6 Q6 credit', (await title(page)).includes('middle credit'), await title(page));
  await clickText(page, '740+');
  check('B7 Q7 numbers (purchase)', (await title(page)).includes('Price, down payment, rent'), await title(page));
  await shot(page, 'b-step7-numbers-empty');

  // Continue with nothing -> price error
  await clickText(page, 'Continue');
  let txt = await bodyText(page);
  check('B8 empty numbers -> "Add the price."', txt.includes('Add the price.'));
  await typeInto(page, '#mf-price', '285000');
  await clickText(page, '25%');
  txt = await bodyText(page);
  check('B9 computed line = $71,250', txt.includes('= $71,250'), '');
  check('B10 funds row revealed', txt.includes('That money is:'));
  await clickText(page, 'Continue');
  txt = await bodyText(page);
  check('B11 missing funds -> error', txt.includes("Where's the down payment coming from?"));
  await clickText(page, 'In the bank');
  await typeInto(page, '#mf-rent', '2600');
  await shot(page, 'b-step7-numbers-filled');
  await clickText(page, 'Continue');
  check('B12 Q8 rentals', (await title(page)).includes('How many rentals'), await title(page));
  await clickText(page, 'None yet');
  txt = await bodyText(page);
  check('B13 owns-primary reveal after None yet', txt.includes('Do you own the home you live in?'));
  await shot(page, 'b-step8-rentals-reveal');
  await clickText(page, 'Yes');
  check('B14 Q9 vesting', (await title(page)).includes('your name or an LLC'), await title(page));
  await shot(page, 'b-step9-vesting');
  await clickText(page, 'An LLC or entity');
  check('B15 Q10 contact', (await title(page)).includes('Who should the specialist ask for'), await title(page));
  await clickText(page, 'Continue');
  txt = await bodyText(page);
  check('B16 empty contact -> name error', txt.includes('Add your first and last name.'));
  await typeInto(page, 'input[aria-label="First name"]', 'QA');
  await typeInto(page, 'input[aria-label="Last name"]', 'Test DeleteMe');
  await typeInto(page, 'input[aria-label="Email"]', 'tanner+qa@creloanpro.com');
  await clickText(page, 'Continue');
  check('B17 Q11 phone', (await title(page)).includes('Best number'), await title(page));
  txt = await bodyText(page);
  check('B18 recap chips present', txt.includes('Purchase') && txt.includes('Ohio') && txt.includes('CLOSING IN 30') === false && txt.includes('$285,000'), '');
  await shot(page, 'b-step11-phone');
  await typeInto(page, 'input[aria-label="Phone number"]', '6145550142');
  const baseline = hits.length;
  await clickText(page, 'Send My Deal to a Specialist');
  txt = await bodyText(page);
  check('B19 submit blocked without consent', txt.includes('Check the box') && hits.length === baseline, `hits=${hits.length - baseline}`);
  await page.click('#mf-consent');
  await sleep(150);
  await shot(page, 'b-step11-consented');
  await clickText(page, 'Send My Deal to a Specialist');
  await page.waitForFunction(() => location.pathname.startsWith('/match/thank-you'), { timeout: 15000 });
  await sleep(600);
  check('B20 redirected to /match/thank-you/', true);
  check('B21 exactly one webhook', hits.length === baseline + 1, `delta=${hits.length - baseline}`);
  const lead = hits[hits.length - 1] || {};
  check('B22 routing: OH -> broker_f, stateCode OH, state Ohio', lead.matchedBroker === 'broker_f' && lead.stateCode === 'OH' && lead.state === 'Ohio', `${lead.matchedBroker} ${lead.stateCode} ${lead.state}`);
  check('B23 identity + phone E.164', lead.firstName === 'QA' && lead.email === 'tanner+qa@creloanpro.com' && lead.phone === '+16145550142', `${lead.phone}`);
  const c = lead.consent || {};
  check('B24 consent record complete + server stamped', c.agreed === true && typeof c.text === 'string' && c.text.includes('Barrett Financial Group') && c.text.includes('Tall Timbers') && typeof c.agreedAt === 'string' && c.url.includes('/match/') && typeof c.userAgent === 'string' && typeof c.receivedAt === 'string', `agreedAt=${c.agreedAt}`);
  check('B25 deal fields', lead.loanGoal === 'purchase' && lead.refinanceType === null && lead.rentalUse === 'longTerm' && lead.dealStage === 'underContract' && lead.timeline === 'within30' && lead.propertyType === 'multi_family_small' && lead.propertyValue === 285000 && lead.downPayment === '25' && lead.downPaymentDollars === 71250 && lead.fundsSource === 'liquid' && lead.monthlyRent === 2600 && lead.rentBasis === 'estimate' && lead.creditScore === '740_plus' && lead.rentalsOwned === 'none' && lead.ownsPrimary === true && lead.vesting === 'entity' && lead.residency === 'usCitizenOrPR' && lead.residencyConfirmed === false, JSON.stringify({ g: lead.loanGoal, s: lead.dealStage, t: lead.timeline, p: lead.propertyType, v: lead.propertyValue, d: lead.downPayment, f: lead.fundsSource, r: lead.monthlyRent, c: lead.creditScore, o: lead.rentalsOwned, op: lead.ownsPrimary, ve: lead.vesting }));
  check('B26 leadGrade A + CLOSING IN 30 prefix', lead.leadGrade === 'A' && String(lead.dealSummary).startsWith('CLOSING IN 30 · Purchase · Ohio'), `${lead.leadGrade} :: ${lead.dealSummary}`);
  check('B27 labels + displays ride along', lead.goalLabel === 'Buying it' && lead.propertyTypeLabel === '2 to 4 units' && lead.propertyValueDisplay === '$285,000' && lead.downPaymentDollarsDisplay === '$71,250' && lead.residencyLabel.includes('default, not changed'), '');
  check('B28 attribution + housekeeping', lead.funnel === 'dscrbroker-match' && lead.source && typeof lead.source.landingPageUrl === 'string' && lead.website === '' && lead.partial === false && typeof lead.submissionId === 'string' && typeof lead.secondsToComplete === 'number' && typeof lead.roughRatioTriage === 'number', `ratio=${lead.roughRatioTriage} secs=${lead.secondsToComplete}`);

  // thank-you
  txt = await bodyText(page);
  check('B29 thank-you names Adam + chip + NMLS', txt.includes('on its way to Adam') && txt.includes('Specialist covers Ohio.') && txt.includes('312817') && txt.includes('Unknown number? Pick up.'), '');
  check('B30 thank-you have-ready (under contract line) + Adam story + licensing', txt.includes('Lead with the close date') && txt.includes('A deal Adam placed') && txt.includes('Tampa duplex') && txt.includes('Tall Timbers Realty and Financial Services'), '');
  const convFired = await page.evaluate(() => sessionStorage.getItem('match_conv_fired'));
  check('B31 conversion NOT fired in QA/localhost', convFired === null, `match_conv_fired=${convFired}`);
  await shot(page, 'b-thankyou');
  check('B32 no page errors on the purchase walk', page.errors.length === 0, page.errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---- Test C: cash-out walk, desktop, Texas -> John, call sheet fills ----
{
  const page = await newPage(false);
  await openFresh(page);
  await clickText(page, 'Own it, pulling cash out');
  await pickState(page, 'tex', 'Texas');
  check('C1 refi rental question', (await title(page)).includes('How is it rented'), await title(page));
  await clickText(page, 'Long-term lease');
  check('C2 cash-out asks when bought', (await title(page)).includes('When did you buy it'), await title(page));
  await clickText(page, 'Over a year');
  await clickText(page, 'Single family or townhome');
  await clickText(page, '700 to 739');
  check('C3 numbers (refi)', (await title(page)).includes('Value, balance, rent'), await title(page));
  await typeInto(page, '#mf-price', '400000');
  await typeInto(page, '#mf-balance', '210000');
  await typeInto(page, '#mf-cash', '80000');
  await typeInto(page, '#mf-rent', '2600');
  await clickText(page, 'Lease');
  await shot(page, 'c-numbers-desktop');
  await clickText(page, 'Continue');
  await clickText(page, '2 to 3');
  await clickText(page, 'My name');
  await typeInto(page, 'input[aria-label="First name"]', 'QA');
  await typeInto(page, 'input[aria-label="Last name"]', 'Test DeleteMe');
  await typeInto(page, 'input[aria-label="Email"]', 'tanner+qa@creloanpro.com');
  await clickText(page, 'Continue');
  const sheetVals = await page.evaluate(() => [...document.querySelectorAll('#call-sheet .m-sheet-v')].map((e) => e.textContent.trim()));
  check('C4 call sheet filled in', sheetVals[0] === 'Own it, pulling cash out' && sheetVals[1] === 'Texas' && sheetVals[6].includes('Worth $400,000, owes $210,000') && sheetVals[7] === '$2,600/mo' && sheetVals[9] === 'My name', JSON.stringify(sheetVals));
  await shot(page, 'c-phone-desktop');
  await typeInto(page, 'input[aria-label="Phone number"]', '2145550199');
  await page.click('#mf-consent');
  const baseline = hits.length;
  await clickText(page, 'Send My Deal to a Specialist');
  await page.waitForFunction(() => location.pathname.startsWith('/match/thank-you'), { timeout: 15000 });
  await sleep(500);
  const lead = hits[hits.length - 1] || {};
  check('C5 one webhook, TX -> broker_d', hits.length === baseline + 1 && lead.matchedBroker === 'broker_d', `${lead.matchedBroker}`);
  check('C6 refi fields', lead.loanGoal === 'refinance' && lead.refinanceType === 'cashOut' && lead.ownedSince === 'over1yr' && lead.loanBalance === 210000 && lead.freeAndClear === false && lead.cashOutWanted === 80000 && lead.rentBasis === 'lease' && lead.downPayment === null && lead.rentalsOwned === '2to3' && lead.vesting === 'individual', JSON.stringify({ rt: lead.refinanceType, os: lead.ownedSince, lb: lead.loanBalance, co: lead.cashOutWanted, rb: lead.rentBasis }));
  check('C7 grade A, chips carry refi money line', lead.leadGrade === 'A' && lead.dealSummary.includes('Worth $400,000, owes $210,000') && lead.dealSummary.includes('wants $80,000 out') && lead.dealSummary.includes('$2,600/mo, lease'), `${lead.leadGrade} :: ${lead.dealSummary}`);
  const txt = await bodyText(page);
  check('C8 thank-you names John + Barrett licensing + cash-out have-ready', txt.includes('on its way to John') && txt.includes('239185') && txt.includes('Title seasoning decides') && !txt.includes('A deal John placed'), '');
  await shot(page, 'c-thankyou-desktop');
  check('C9 no page errors on the cash-out walk', page.errors.length === 0, page.errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---- Test D: stops (no webhook on any) ----
{
  const page = await newPage(true);
  const baseline = hits.length;

  await openFresh(page);
  await clickText(page, 'Buying it');
  await pickState(page, 'new y', 'New York');
  let txt = await bodyText(page);
  check('D1 excluded-state stop', txt.includes('Not in New York yet.') && txt.includes('Nothing was sent.'));
  await shot(page, 'd-stop-excluded');
  await clickText(page, 'Change it');
  check('D2 back from excluded stop returns to state question', (await title(page)).includes("Where's the property"));
  await pickState(page, 'oh', 'Ohio');
  await clickText(page, "I'll live in all or part of it");
  txt = await bodyText(page);
  check('D3 primary-residence stop', txt.includes("DSCR is for rentals you don't live in."));
  await shot(page, 'd-stop-primary');
  await clickText(page, 'Go back');
  await clickText(page, 'Needs work first');
  txt = await bodyText(page);
  check('D4 needs-work note + Continue (no auto-advance)', txt.includes('DSCR wants it rent-ready') && (await title(page)).includes('How will it be rented'));
  await shot(page, 'd-needswork-note');
  await clickText(page, 'Continue');
  await clickText(page, 'Making offers');
  await clickText(page, 'Commercial or 9+ units');
  txt = await bodyText(page);
  check('D5 commercial stop', txt.includes("Commercial and 9+ units aren't placed here."));
  await clickText(page, 'Pick the unit count instead');
  await clickText(page, 'Manufactured or mobile home');
  txt = await bodyText(page);
  check('D6 manufactured stop', txt.includes("Manufactured homes aren't placed here."));
  await clickText(page, 'Go back');
  await clickText(page, 'Single family or townhome');
  await clickText(page, 'Under 620');
  txt = await bodyText(page);
  check('D7 credit stop', txt.includes("Under 620, DSCR lenders won't place it today."));
  await shot(page, 'd-stop-credit');
  await clickText(page, 'Go back');
  await clickText(page, 'No US credit yet');
  check('D8 no-US-credit continues to numbers', (await title(page)).includes('Price, down payment, rent'));
  await typeInto(page, '#mf-price', '90000');
  txt = await bodyText(page);
  check('D9 under-$100K note', txt.includes('Fewer lenders go this small.'));
  await clickText(page, 'Under 15%');
  txt = await bodyText(page);
  check('D10 under-15 panel', txt.includes("Under 15% down, DSCR doesn't reach.") && txt.includes('I can get to 20%'));
  await shot(page, 'd-under15-panel');
  await clickText(page, 'Not this time');
  txt = await bodyText(page);
  check('D11 under-15 stop', txt.includes('Not this deal, then.'));
  await clickText(page, 'Go back');
  await clickText(page, 'Under 15%');
  await clickText(page, 'I can get to 20%');
  txt = await bodyText(page);
  check('D12 stretched-to-20 path: 20% selected + funds row', txt.includes('you said you can get to 20%') && txt.includes('That money is:'));
  check('D13 no webhook fired by any stop', hits.length === baseline, `delta=${hits.length - baseline}`);
  // Q7 label for "Making offers" + rent label for needs-work
  check('D14 stage-aware labels', txt.includes('Offer price') && txt.includes("Rent once it's done"));
  // vesting screen preset: foreign national (from No US credit yet)
  await clickText(page, '15%');
  await clickText(page, 'In the bank');
  await typeInto(page, '#mf-rent', '1500');
  await clickText(page, 'Continue');
  await clickText(page, '1 to 3');
  txt = await bodyText(page);
  check('D15 residency preset to Foreign national + note', txt.includes('Foreign national') && txt.includes('Expect 25 to 35% down'));
  await shot(page, 'd-vesting-foreign');
  await clickText(page, "Haven't decided");
  await typeInto(page, 'input[aria-label="First name"]', 'QA');
  await typeInto(page, 'input[aria-label="Last name"]', 'Test DeleteMe');
  await typeInto(page, 'input[aria-label="Email"]', 'tanner+qa@creloanpro.com');
  await clickText(page, 'Continue');
  txt = await bodyText(page);
  check('D16 non-US toggle offered for foreign national', txt.includes('Non-US number'));
  await shot(page, 'd-phone-nonus');
  check('D17 no page errors on the stops walk', page.errors.length === 0, page.errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---- Test E: thank-you degraded states ----
{
  const page = await newPage(true);
  await page.goto(`${BASE}/match/thank-you/`, { waitUntil: 'networkidle0' });
  await sleep(300);
  const txt = await bodyText(page);
  check('E1 direct load -> "Nothing here yet."', txt.includes('Nothing here yet.') && txt.includes('Start your deal') && !txt.includes('Deal sent'));
  await page.close();
}

await browser.close();
if (ownSink) ownSink.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) console.log('FAILED: ' + failed.map((f) => f.name).join(', '));
process.exit(failed.length ? 1 : 0);
