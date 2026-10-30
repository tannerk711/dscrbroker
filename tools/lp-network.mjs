// Live-wiring gate for /qualify/ (replaces the branch-era zero-network gate:
// since the 2026-10-30 migration the page deliberately carries the site gtag
// stack + Hotjar, so "zero third-party" is no longer the contract). This tool:
//
//   1. loads /qualify/ with QA tracking params AND ?demo=1 (so the thank-you
//      conversion stays suppressed), walks the full buy path, and submits;
//   2. INTERCEPTS the one POST /api/lead, captures the payload, and fulfills it
//      with { success: true, assignedBroker: 'broker_a' } so nothing ever
//      reaches a real webhook (interception is fine here: this gate asserts
//      wiring, not paint timing);
//   3. asserts the payload matches the live form's /api/lead contract (ff_hp
//      trap present, secondsToComplete, full TCPA consent record, utm/gclid
//      propagation, E164 phone, broker guess for Texas, leadSource);
//   4. asserts navigation lands on /thank-you/ and sessionStorage carries the
//      dscrbroker_submission record (honeypotFilled flag, no raw trap value);
//   5. flags any network request outside the allowlist (lp-lib recorder): no
//      Google Fonts (self-hosted), no Zapier, no unexpected POSTs.
//
//   node tools/lp-network.mjs            (dev server)
//   node tools/lp-network.mjs --dist     (built output via serve-dist.mjs on 4399)
import { launchBrowser, VIEWPORTS, settle, attachNetworkRecorder, attachErrorLog, makeChecker, LP_T4_PATH, QA_BASE, QUALIFY_TITLE_TOKEN } from './lp-lib.mjs';
import { startServer } from './serve-dist.mjs';

const useDist = process.argv.includes('--dist');
const { check, summary } = makeChecker();

const LANDING_QS = '?demo=1&utm_source=qa&utm_medium=cpc&utm_campaign=qa-network&utm_term=qa-term&utm_content=qa-ad1&gclid=QA_GCLID_1';

let dist;
let base = QA_BASE;
if (useDist) {
  dist = await startServer();
  base = dist.url;
  console.log(`lp-network --dist: serving ${dist.root} on ${dist.url}`);
}

async function run() {
  const browser = await launchBrowser(VIEWPORTS.desktop);
  const requests = [];
  const errors = [];
  const apiSink = [];
  const captured = [];
  try {
    const page = await browser.newPage();
    const { name, ...viewport } = VIEWPORTS.desktop;
    await page.setViewport(viewport);
    attachErrorLog(page, errors, `desktop ${LP_T4_PATH}`);
    attachNetworkRecorder(page, requests, { apiSink });

    // Intercept the lead POST; everything else continues untouched. Exactly one
    // handler calls continue/respond (the recorder above only records).
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      try {
        const u = new URL(req.url(), base);
        const isLeadPost = req.method() === 'POST' && /\/api\/lead\/?$/.test(u.pathname);
        if (isLeadPost) {
          try {
            captured.push(JSON.parse(req.postData() || 'null'));
          } catch {
            captured.push({ __parseError: req.postData()?.slice(0, 200) });
          }
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, assignedBroker: 'broker_a' }),
          });
          return;
        }
        req.continue();
      } catch {
        try { req.continue(); } catch { /* already handled */ }
      }
    });

    await page.goto(`${base}${LP_T4_PATH}${LANDING_QS}`, { waitUntil: 'networkidle0', timeout: 45000 });
    const title = await page.title();
    if (!title.includes(QUALIFY_TITLE_TOKEN)) {
      throw new Error(`no server at ${base}: title "${title}" lacks "${QUALIFY_TITLE_TOKEN}" (a foreign server may be squatting the port)`);
    }

    // Generous settle before the first click: the React island needs to finish
    // hydrating (dev-mode Vite transform + gsap dynamic import), and clicking a
    // step-1 card before hydration completes can crash the island entirely.
    await settle(1800);

    const clickText = async (text) => {
      return page.evaluate((t) => {
        const needle = t.trim().toLowerCase();
        const clickables = Array.from(document.querySelectorAll('button, a, [role="button"], label')).filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return false;
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') return false;
          return (el.textContent || '').trim().toLowerCase().includes(needle);
        });
        if (!clickables.length) return false;
        clickables.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return ra.width * ra.height - rb.width * rb.height;
        });
        clickables[0].scrollIntoView({ block: 'center' });
        clickables[0].click();
        return true;
      }, text);
    };
    const fillFirstEmpty = async (value) => {
      const ok = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input:not([type])')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 2 && r.height > 2 && !el.disabled && !el.value;
        });
        const target = inputs[0];
        if (!target) return false;
        target.focus();
        return true;
      });
      if (!ok) return false;
      await page.keyboard.type(String(value), { delay: 6 });
      return true;
    };
    const checkFirstCheckbox = async () => {
      return page.evaluate(() => {
        const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter((el) => !el.checked);
        if (!boxes.length) return false;
        const box = boxes[0];
        const r = box.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) {
          const label = box.closest('label') || document.querySelector(`label[for="${box.id}"]`);
          if (label) {
            label.click();
            return true;
          }
        }
        box.click();
        return true;
      });
    };

    await clickText('buy a rental');
    await settle(650);
    await clickText('Just starting my research');
    await settle(650);
    await clickText('Single-family');
    await settle(650);
    await clickText('740 or above');
    await settle(650);
    await clickText('CONTINUE'); // price
    await settle(650);
    await clickText('CONTINUE'); // down payment
    await settle(650);
    await fillFirstEmpty('Texas');
    await clickText('CONTINUE'); // location
    await settle(650);
    await fillFirstEmpty('QA');
    await fillFirstEmpty('Test DeleteMe');
    await fillFirstEmpty('qa@example.com');
    await clickText('CONTINUE'); // contact
    await settle(650);
    await fillFirstEmpty('5555550140');
    await checkFirstCheckbox();
    await settle(200);
    // The submit label "MATCH ME WITH A BROKER" matches the page CTAs (Topbar /
    // FinalCta / StickyCta anchors carry the same words since Tanner's 10/08
    // label decision), and clickText picks the SMALLEST match: the sticky
    // anchor. Target the real submit button by its form role instead.
    const submitted = await page.evaluate(() => {
      const btn = document.querySelector('.fv3-root form button[type="submit"]');
      if (!btn) return false;
      btn.scrollIntoView({ block: 'center' });
      btn.click();
      return true;
    });
    if (!submitted) console.warn('lp-network: submit button not found');

    // The fulfilled 200 makes live-submit persist + navigate to /thank-you/.
    let onThankYou = false;
    for (let i = 0; i < 40; i++) {
      await settle(300);
      if (page.url().includes('/thank-you')) {
        onThankYou = true;
        break;
      }
    }
    await settle(1200); // let the thank-you island hydrate

    const p = captured[0] || {};
    const session = await page.evaluate(() => {
      try {
        return JSON.parse(sessionStorage.getItem('dscrbroker_submission') || 'null');
      } catch {
        return null;
      }
    });

    console.log(`\nrequests flagged: ${requests.length}`);
    for (const r of requests) console.log(`  [${r.reason}] ${r.method} ${r.url}`);
    console.log(`console/page errors: ${errors.length ? '\n  ' + errors.join('\n  ') : 'none'}`);

    check('exactly one POST /api/lead', apiSink.length === 1 && captured.length === 1, `${apiSink.length} observed`);
    check('navigated to /thank-you/', onThankYou, page.url());
    check('zero flagged network requests', requests.length === 0, `${requests.length} flagged`);
    check('zero console/page errors', errors.length === 0, `${errors.length} errors`);

    // Payload contract (mirrors DSCRForm.tsx -> /api/lead).
    check('payload: names + email + E164 phone', p.firstName === 'QA' && p.lastName === 'Test DeleteMe' && p.email === 'qa@example.com' && p.phone === '+15555550140', `${p.firstName}|${p.lastName}|${p.email}|${p.phone}`);
    // TX belongs to broker_d in brokerRouting.ts (John's five hooks split by
    // state group); the mocked API response (broker_a) must still win in
    // sessionStorage, proving the server's assignment overrides the guess.
    check('payload: state Texas -> TX, broker guess broker_d', p.state === 'Texas' && p.stateCode === 'TX' && p.matchedBroker === 'broker_d', `${p.state}|${p.stateCode}|${p.matchedBroker}`);
    check("payload: leadSource 'qualify-lp-t4'", p.leadSource === 'qualify-lp-t4', String(p.leadSource));
    check('payload: trap field ff_hp present and empty', typeof p.ff_hp === 'string' && p.ff_hp === '', JSON.stringify(p.ff_hp));
    check('payload: secondsToComplete is a number', typeof p.secondsToComplete === 'number' && p.secondsToComplete >= 0, String(p.secondsToComplete));
    const c = p.consent || {};
    check('payload: TCPA consent record (agreed + text + agreedAt + url)', c.agreed === true && typeof c.text === 'string' && c.text.length > 50 && typeof c.agreedAt === 'string' && c.agreedAt.includes('T') && typeof c.url === 'string' && c.url.includes('/qualify'), JSON.stringify({ agreed: c.agreed, textLen: (c.text || '').length, agreedAt: c.agreedAt }));
    const s = p.source || {};
    check('payload: utm/gclid propagation', s.utmSource === 'qa' && s.utmCampaign === 'qa-network' && s.utmContent === 'qa-ad1' && s.utmTerm === 'qa-term' && s.gclid === 'QA_GCLID_1', JSON.stringify({ utmSource: s.utmSource, gclid: s.gclid }));
    check('payload: identity fields (submissionId, dealTier, loanGoal)', typeof p.submissionId === 'string' && p.submissionId.length > 8 && typeof p.dealTier === 'string' && p.loanGoal === 'purchase', `${p.submissionId?.slice(0, 8)}|${p.dealTier}|${p.loanGoal}`);

    // sessionStorage handoff for /thank-you/ (persistSubmission).
    check('sessionStorage: dscrbroker_submission exists', !!session, session ? 'present' : 'missing');
    check('sessionStorage: server assignment + trap flag, raw trap stripped', !!session && session.matchedBroker === 'broker_a' && session.honeypotFilled === false && !('ff_hp' in session), session ? JSON.stringify({ matchedBroker: session.matchedBroker, honeypotFilled: session.honeypotFilled, hasTrap: 'ff_hp' in session }) : 'missing');
  } finally {
    await browser.close();
  }
}

try {
  await run();
} finally {
  if (dist) await dist.close();
}

const ok = summary();
process.exit(ok ? 0 : 1);
