// Phase 0 gate: GA4 funnel events + site-wide attribution, asserted end to end
// against the BUILT output (restructure to-dolist, 2026-11-04).
//
// What it proves, per scenario:
//   demo-buy        form_view/form_start/form_step(2..9)/form_complete fire on a
//                   ?demo=1 walk; generate_lead and the Ads conversion stay silent;
//                   payload carries the five flat fields with lead_source=direct
//   paid-crosspage  land on /states/texas/ with a gclid + the campaign suffix, hop
//                   to /qualify/ with NO params, submit: the click survives the hop
//                   (lead_source=google_ads, utm_* + landing_page from the state
//                   page), generate_lead fires, the Ads conversion carries
//                   transaction_id === the payload's submissionId
//   ai-referrer     a chatgpt.com-referred visit classifies lead_source=ai_chatgpt
//   credit-kickout  the <620 dead-end fires credit_kickout (/qualify V3 only;
//                   the homepage's restored original form has no dead-ends: its
//                   state dropdown lists only covered states and below-640
//                   continues with reassurance)
//   state-kickout   New York fires state_kickout with the state param (V3)
//   home-demo       the homepage's restored DSCRForm (2026-11-08) walks the
//                   full purchase path on ?demo=1: form_view/form_start/
//                   form_step/form_complete fire with surface=homepage-classic,
//                   generate_lead + the Ads conversion stay silent, the payload
//                   carries the five flat fields + leadSource=homepage-classic
//   home-live       the same walk without demo: generate_lead fires and the
//                   Ads conversion carries transaction_id === submissionId
//
// gtag's library never loads under automation (navigator.webdriver gate), so the
// assertions read the inline dataLayer queue: a hook installed before any page
// script mirrors every gtag('event', ...) push to the console, which survives the
// submit navigation to /thank-you/. The POST to /api/lead is intercepted and
// fulfilled locally (serve-dist has no serverless), so no Zap ever fires.
//
//   node tools/lp-events.mjs            (starts serve-dist in-process on 4398)
import { launchBrowser, VIEWPORTS, makeChecker, settle } from './lp-lib.mjs';
import { startServer } from './serve-dist.mjs';

const PORT = Number(process.env.EVENTS_PORT || 4398);
const GA4_MARK = '__GA4EVT__';

const srv = await startServer(PORT, { quiet: true });
const BASE = srv.url;
console.log(`lp-events: serving dist at ${BASE}`);

const browser = await launchBrowser(VIEWPORTS.desktop);
const { check, summary } = makeChecker();

// Installed before any page script: mirrors gtag('event', ...) pushes to the
// console so they survive navigations. The layouts' inline `window.dataLayer =
// window.dataLayer || []` keeps this array.
const HOOK = () => {
  const arr = [];
  const orig = arr.push.bind(arr);
  arr.push = (...items) => {
    for (const it of items) {
      try {
        const a = Array.from(it || []);
        if (a[0] === 'event') {
          console.log('__GA4EVT__' + JSON.stringify({ name: a[1], params: a[2] || {} }));
        }
      } catch {
        /* never break the queue */
      }
    }
    return orig(...items);
  };
  Object.defineProperty(window, 'dataLayer', { value: arr, writable: true, configurable: true });
};

async function newPage(opts = {}) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(HOOK);
  if (opts.referrer) {
    // goto's `referer` option is dropped under request interception, so the
    // classification path is driven through document.referrer directly.
    await page.evaluateOnNewDocument((ref) => {
      Object.defineProperty(Document.prototype, 'referrer', { get: () => ref, configurable: true });
    }, opts.referrer);
  }
  const events = [];
  const errors = [];
  page.on('console', (m) => {
    const t = m.text();
    if (t.startsWith(GA4_MARK)) {
      try {
        events.push(JSON.parse(t.slice(GA4_MARK.length)));
      } catch {
        /* ignore */
      }
    } else if (m.type() === 'error') {
      errors.push(t);
    }
  });
  page.on('pageerror', (e) => errors.push(e.message));
  const posts = [];
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (req.method() === 'POST' && /\/api\/lead\/?(\?|$)/.test(url)) {
      posts.push(JSON.parse(req.postData() || '{}'));
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, assignedBroker: 'broker_d' }),
      });
      return;
    }
    req.continue().catch(() => {});
  });
  return { page, events, errors, posts };
}

async function resetStorage(page, errors) {
  await page.goto(`${BASE}/404-reset-page`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
  // The deliberate 404 above logs a resource error; the scenario starts clean.
  if (errors) errors.length = 0;
}

// The step announce (aria-live) updates before the 300ms AnimatePresence swap
// finishes, so the next step's buttons can lag the text: poll for the button.
const clickButton = async (page, label) => {
  try {
    await page.waitForFunction(
      (text) => {
        const els = [...document.querySelectorAll('button')];
        return els.some((b) => (b.textContent || '').trim().toUpperCase().includes(text.toUpperCase()) && !b.disabled);
      },
      { timeout: 15000 },
      label,
    );
  } catch {
    throw new Error(`click target not found or disabled: "${label}"`);
  }
  await page.evaluate((text) => {
    const els = [...document.querySelectorAll('button')];
    const el = els.find((b) => (b.textContent || '').trim().toUpperCase().includes(text.toUpperCase()) && !b.disabled);
    el.click();
  }, label);
};

// The step announce (`Step N of 9. ...` in the aria-live region) is the one
// marker guaranteed in the DOM; rendered headlines vary per component. After
// the announce flips, settle past the 300ms AnimatePresence exit+enter so the
// OLD step's buttons are gone (a lingering CONTINUE would double-fire).
const waitForAnnounce = async (page, needle) => {
  await page.waitForFunction(
    (t) => {
      const el = document.querySelector('p[aria-live]');
      return !!el && (el.textContent || '').includes(t);
    },
    { timeout: 15000 },
    needle,
  );
  await settle(800);
};
const waitForStep = (page, n) => waitForAnnounce(page, `Step ${n} of 9.`);

async function stepThroughTo(page, lastStep) {
  await waitForStep(page, 1);
  await clickButton(page, 'Buy a rental');
  await waitForStep(page, 2);
  if (lastStep <= 2) return;
  await clickButton(page, 'Just starting my research');
  await waitForStep(page, 3);
  if (lastStep <= 3) return;
  await clickButton(page, 'Single-family');
  await waitForStep(page, 4);
  if (lastStep <= 4) return;
  await clickButton(page, '740 or above');
  await waitForStep(page, 5);
  if (lastStep <= 5) return;
  await clickButton(page, 'CONTINUE'); // price slider default
  await waitForStep(page, 6);
  if (lastStep <= 6) return;
  await clickButton(page, 'CONTINUE'); // down payment slider default
  await waitForStep(page, 7);
}

async function enterState(page, stateName) {
  await page.waitForSelector('input[aria-label="State"]', { timeout: 15000 });
  await page.type('input[aria-label="State"]', stateName, { delay: 15 });
  await settle(250);
  await clickButton(page, 'CONTINUE');
}

async function finishContactAndSubmit(page) {
  await waitForStep(page, 8);
  await page.waitForSelector('input[placeholder="First name"]', { timeout: 15000 });
  await page.type('input[placeholder="First name"]', 'QA Test', { delay: 10 });
  await page.type('input[placeholder="Last name"]', 'DeleteMe', { delay: 10 });
  await page.type('input[placeholder="Email address"]', 'qa-test-deleteme@example.com', { delay: 10 });
  await clickButton(page, 'CONTINUE');
  await waitForStep(page, 9);
  await page.waitForSelector('input[aria-label="Mobile phone number"]', { timeout: 15000 });
  await page.type('input[aria-label="Mobile phone number"]', '5555550123', { delay: 10 });
  await page.click('.fv3-checkbox');
  await settle(150);
  await clickButton(page, 'MATCH ME WITH A BROKER');
  await page.waitForFunction(() => location.pathname.startsWith('/thank-you'), { timeout: 15000 });
  await settle(1200); // let the thank-you conversion effect run
}

const byName = (events, name) => events.filter((e) => e.name === name);

/* ----------------------------- demo-buy ----------------------------- */
{
  const { page, events, errors, posts } = await newPage();
  await resetStorage(page, errors);
  await page.goto(`${BASE}/qualify/?demo=1`, { waitUntil: 'networkidle0' });
  await stepThroughTo(page, 7);
  await enterState(page, 'Texas');
  await finishContactAndSubmit(page);

  check('demo-buy: form_view fired (surface qualify-lp-t4)',
    byName(events, 'form_view').some((e) => e.params.surface === 'qualify-lp-t4'));
  check('demo-buy: form_start fired once', byName(events, 'form_start').length === 1);
  const steps = byName(events, 'form_step').map((e) => `${e.params.step_number}:${e.params.step_name}`);
  check('demo-buy: form_step 2..9 in order',
    steps.join(',') === '2:process,3:property_type,4:credit,5:price,6:down_payment,7:state,8:contact,9:phone',
    steps.join(','));
  check('demo-buy: form_complete fired', byName(events, 'form_complete').length === 1);
  check('demo-buy: generate_lead SUPPRESSED on demo', byName(events, 'generate_lead').length === 0);
  check('demo-buy: Ads conversion SUPPRESSED on demo', byName(events, 'conversion').length === 0);
  const p = posts[0] || {};
  check('demo-buy: one intercepted POST', posts.length === 1);
  check('demo-buy: five flat fields present',
    ['lead_source', 'utm_campaign', 'utm_content', 'utm_term', 'landing_page'].every((k) => typeof p[k] === 'string'),
    JSON.stringify({ lead_source: p.lead_source, landing_page: p.landing_page }));
  check('demo-buy: lead_source=direct, landing_page=/qualify/',
    p.lead_source === 'direct' && String(p.landing_page).includes('/qualify/'));
  check('demo-buy: demo never writes localStorage', await page.evaluate(() => !localStorage.getItem('dscrbroker_attr_v1')));
  check('demo-buy: no page errors', errors.length === 0, errors[0]);
  await page.close();
}

/* -------------------------- paid-crosspage --------------------------- */
{
  const { page, events, errors, posts } = await newPage();
  await resetStorage(page, errors);
  await page.goto(
    `${BASE}/states/texas/?gclid=TESTGCLID123&utm_source=google&utm_medium=cpc&utm_campaign=a&utm_content=tx-ad1&utm_term=dscr%20loan%20texas`,
    { waitUntil: 'networkidle0' },
  );
  await settle(400);
  await page.goto(`${BASE}/qualify/`, { waitUntil: 'networkidle0' }); // NO params: the hop
  await stepThroughTo(page, 7);
  await enterState(page, 'Texas');
  await finishContactAndSubmit(page);

  const p = posts[0] || {};
  check('paid: click survives the state-page -> /qualify/ hop',
    p.lead_source === 'google_ads' && p.utm_campaign === 'a' && p.utm_content === 'tx-ad1' && p.utm_term === 'dscr loan texas',
    JSON.stringify({ lead_source: p.lead_source, utm_campaign: p.utm_campaign }));
  check('paid: landing_page is the state page with the gclid',
    String(p.landing_page).includes('/states/texas/') && String(p.landing_page).includes('TESTGCLID123'));
  check('paid: source object carries the gclid', p.source && p.source.gclid === 'TESTGCLID123');
  const gl = byName(events, 'generate_lead');
  check('paid: generate_lead fired with lead_source', gl.length === 1 && gl[0].params.lead_source === 'google_ads');
  const conv = byName(events, 'conversion');
  check('paid: Ads conversion fired once with transaction_id === submissionId',
    conv.length === 1 && conv[0].params.transaction_id === p.submissionId,
    JSON.stringify(conv[0]?.params));
  check('paid: no page errors', errors.length === 0, errors[0]);
  await page.close();
}

/* ---------------------------- ai-referrer ---------------------------- */
{
  const { page, events, errors, posts } = await newPage({ referrer: 'https://chatgpt.com/' });
  await resetStorage(page, errors);
  await page.goto(`${BASE}/qualify/`, { waitUntil: 'networkidle0' });
  await stepThroughTo(page, 7);
  await enterState(page, 'Texas');
  await finishContactAndSubmit(page);
  const p = posts[0] || {};
  check('ai: chatgpt.com referral classifies lead_source=ai_chatgpt', p.lead_source === 'ai_chatgpt', p.lead_source);
  const gl = byName(events, 'generate_lead');
  check('ai: generate_lead carries ai_chatgpt', gl.length === 1 && gl[0].params.lead_source === 'ai_chatgpt');
  check('ai: no page errors', errors.length === 0, errors[0]);
  await page.close();
}

/* --------------------------- credit-kickout -------------------------- */
{
  const { page, events, errors } = await newPage();
  await resetStorage(page, errors);
  await page.goto(`${BASE}/qualify/?demo=1`, { waitUntil: 'networkidle0' });
  await stepThroughTo(page, 4);
  await clickButton(page, 'Below 620');
  await waitForAnnounce(page, '620 is the line for DSCR.');
  await settle(300);
  check('credit-kickout: credit_kickout fired once', byName(events, 'credit_kickout').length === 1);
  check('credit-kickout: no form_step past credit', !byName(events, 'form_step').some((e) => e.params.step_number > 4));
  check('credit-kickout: no page errors', errors.length === 0, errors[0]);
  await page.close();
}

/* --------------------------- state-kickout --------------------------- */
{
  const { page, events, errors, posts } = await newPage();
  await resetStorage(page, errors);
  await page.goto(`${BASE}/qualify/?demo=1`, { waitUntil: 'networkidle0' });
  await stepThroughTo(page, 7);
  await enterState(page, 'New York');
  await waitForAnnounce(page, 'Not in New York yet.');
  await settle(300);
  const sk = byName(events, 'state_kickout');
  check('state-kickout: state_kickout fired with state=New York', sk.length === 1 && sk[0].params.state === 'New York');
  check('state-kickout: nothing POSTed', posts.length === 0);
  check('state-kickout: no page errors', errors.length === 0, errors[0]);
  await page.close();
}

/* ----------------- homepage (restored original DSCRForm) ----------------- */
// The homepage island is the restored pre-retheme DSCRForm (2026-11-08), not
// the V3 island: drive it by its own markup. Purchase path = 10 steps.
const waitForClassicStep = async (page, n) => {
  await page.waitForFunction(
    (t) => {
      const card = document.querySelector('#lead-form');
      return !!card && (card.textContent || '').includes(t);
    },
    { timeout: 15000 },
    `Step ${n} of`,
  );
  await settle(700); // 300ms slide + the auto-advance delays
};
const clickFirstRadio = async (page) => {
  await page.waitForFunction(
    () => !!document.querySelector('#lead-form [role="radio"]:not([disabled])'),
    { timeout: 15000 },
  );
  await page.evaluate(() => document.querySelector('#lead-form [role="radio"]:not([disabled])').click());
};

async function walkClassicHomepage(page) {
  await waitForClassicStep(page, 1);
  await clickFirstRadio(page); // Purchase a Property
  await waitForClassicStep(page, 2);
  await clickFirstRadio(page); // property type
  await waitForClassicStep(page, 3);
  await page.select('select[aria-label="Select state"]', 'TX');
  await waitForClassicStep(page, 4);
  await clickButton(page, 'CONTINUE'); // property value slider default
  await waitForClassicStep(page, 5);
  await clickFirstRadio(page); // down payment
  await waitForClassicStep(page, 6);
  await clickFirstRadio(page); // cash flow
  await waitForClassicStep(page, 7);
  await clickFirstRadio(page); // credit
  await waitForClassicStep(page, 8);
  await clickFirstRadio(page); // citizenship
  await waitForClassicStep(page, 9);
  await clickFirstRadio(page); // timeline
  await waitForClassicStep(page, 10);
  await page.waitForSelector('input[placeholder="First name"]', { timeout: 15000 });
  await page.type('input[placeholder="First name"]', 'QA Test', { delay: 10 });
  await page.type('input[placeholder="Last name"]', 'DeleteMe', { delay: 10 });
  await page.type('input[placeholder="Email address"]', 'qa-test-deleteme@example.com', { delay: 10 });
  // 303-555-0123: the junk filter rejects 5+ repeated digits, so no 555 area code.
  await page.type('input[placeholder="(555) 555-5555"]', '3035550123', { delay: 10 });
  await page.evaluate(() => {
    const box = document.querySelector('#lead-form input[type="checkbox"]');
    if (box && !box.checked) box.click();
  });
  await settle(200);
  await clickButton(page, 'MATCH ME WITH A SPECIALIST');
  await page.waitForFunction(() => location.pathname.startsWith('/thank-you'), { timeout: 20000 });
  await settle(1200); // let the thank-you conversion effect run
}

/* ------------------------------ home-demo ----------------------------- */
{
  const { page, events, errors, posts } = await newPage();
  await resetStorage(page, errors);
  await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle0' });
  await walkClassicHomepage(page);

  check('home-demo: form_view fired (surface homepage-classic)',
    byName(events, 'form_view').some((e) => e.params.surface === 'homepage-classic'));
  check('home-demo: form_start fired once', byName(events, 'form_start').length === 1);
  const hSteps = byName(events, 'form_step');
  check('home-demo: form_step 2..10 in order, named, surface homepage-classic',
    hSteps.length === 9
      && hSteps.every((e) => e.params.surface === 'homepage-classic' && typeof e.params.step_name === 'string')
      && hSteps.map((e) => e.params.step_number).join(',') === '2,3,4,5,6,7,8,9,10',
    hSteps.map((e) => `${e.params.step_number}:${e.params.step_name}`).join(','));
  check('home-demo: form_complete fired', byName(events, 'form_complete').length === 1);
  check('home-demo: generate_lead SUPPRESSED on demo', byName(events, 'generate_lead').length === 0);
  check('home-demo: Ads conversion SUPPRESSED on demo', byName(events, 'conversion').length === 0);
  const hp = posts[0] || {};
  check('home-demo: one intercepted POST', posts.length === 1);
  check('home-demo: five flat fields present + leadSource=homepage-classic',
    ['lead_source', 'utm_campaign', 'utm_content', 'utm_term', 'landing_page'].every((k) => typeof hp[k] === 'string')
      && hp.leadSource === 'homepage-classic',
    JSON.stringify({ lead_source: hp.lead_source, leadSource: hp.leadSource }));
  check('home-demo: consent record + empty trap on the payload',
    hp.consent && hp.consent.agreed === true && typeof hp.consent.text === 'string' && hp.ff_hp === '');
  check('home-demo: demo never writes localStorage attribution',
    await page.evaluate(() => !localStorage.getItem('dscrbroker_attr_v1')));
  check('home-demo: no page errors', errors.length === 0, errors[0]);
  await page.close();
}

/* ------------------------------ home-live ----------------------------- */
{
  const { page, events, errors, posts } = await newPage();
  await resetStorage(page, errors);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await walkClassicHomepage(page);

  const hp = posts[0] || {};
  const gl = byName(events, 'generate_lead');
  check('home-live: generate_lead fired once with surface homepage-classic',
    gl.length === 1 && gl[0].params.surface === 'homepage-classic', JSON.stringify(gl[0]?.params));
  const conv = byName(events, 'conversion');
  check('home-live: Ads conversion fired once with transaction_id === submissionId',
    conv.length === 1 && conv[0].params.transaction_id === hp.submissionId,
    JSON.stringify(conv[0]?.params));
  check('home-live: no page errors', errors.length === 0, errors[0]);
  await page.close();
}

await browser.close();
await srv.close();
const ok = summary();
process.exit(ok ? 0 : 1);
