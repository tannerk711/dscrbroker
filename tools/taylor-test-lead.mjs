#!/usr/bin/env node
/**
 * Prepped test lead for Taylor Sundquist (broker_g) on the dscrbroker.com round robin.
 *
 * DRY RUN by default: prints the payload and exits without sending anything.
 * `node tools/taylor-test-lead.mjs --live` POSTs it to https://dscrbroker.com/api/lead,
 * which forwards to WEBHOOK_BROKER_G (Taylor's Zap -> text to his cell + email).
 * Fire --live ONLY on Tanner's go, after WEBHOOK_BROKER_G is set in Vercel and the
 * routing deploy is live. This is an API-level submit: no thank-you page loads, so
 * the Ads conversion (AW-18416211451) and GA4 generate_lead do NOT fire.
 *
 * After firing: confirm the Zap task ran, Taylor got the text + email, then delete
 * the "QA Test DeleteMe" contact from Taylor's GHL and do not bill the lead.
 * Optionally pass --state=CA|ID|MT|OR|WA (default ID).
 */

const LIVE = process.argv.includes('--live');
const stateArg = (process.argv.find((a) => a.startsWith('--state=')) || '--state=ID').split('=')[1].toUpperCase();

const STATES = {
  CA: 'California',
  ID: 'Idaho',
  MT: 'Montana',
  OR: 'Oregon',
  WA: 'Washington',
};
if (!STATES[stateArg]) {
  console.error(`--state must be one of ${Object.keys(STATES).join(', ')} (Taylor's five states)`);
  process.exit(1);
}

const now = new Date().toISOString();

// Verbatim current consent copy (StepContact.tsx CONSENT_CHECKBOX_TEXT + CONSENT_DISCLOSURE_TEXT).
const CONSENT_TEXT =
  'I agree to be contacted by a licensed DSCR loan specialist about my deal. Submitting this form does not pull my credit. ' +
  'By clicking "Match Me With a Specialist," I consent to receive calls, texts, and emails from a licensed loan specialist. Standard message and data fees may apply. Reply STOP to opt out.';

const payload = {
  submissionId: `qa-taylor-${Date.now()}`,
  firstName: 'QA',
  lastName: 'Test DeleteMe',
  email: 'tanner+qa@creloanpro.com',
  phone: '+13035550123',
  loanGoal: 'purchase',
  propertyType: 'single_family',
  state: STATES[stateArg],
  stateCode: stateArg,
  propertyValue: '450000',
  downPayment: '25',
  loanBalance: '',
  rehabBudget: '',
  cashFlow: 'positive',
  creditScore: '740_plus',
  usCitizen: 'yes',
  timeline: 'within_30_days',
  dealTier: 'strong',
  matchedBroker: 'broker_g',
  consent: {
    agreed: true,
    text: CONSENT_TEXT,
    agreedAt: now,
    url: 'https://dscrbroker.com/',
  },
  source: {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    gclid: null,
    fbclid: null,
    landingPageUrl: 'https://dscrbroker.com/',
    deviceType: 'desktop',
  },
  submittedAt: now,
  secondsToComplete: 95,
};

if (!LIVE) {
  console.log('[DRY RUN] Would POST this to https://dscrbroker.com/api/lead for broker_g (Taylor):\n');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nRun with --live to actually send it (Tanner\'s go only).');
  process.exit(0);
}

const res = await fetch('https://dscrbroker.com/api/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const body = await res.text();
console.log(`HTTP ${res.status}: ${body}`);
if (res.status !== 200) {
  console.error('FAIL: the lead was not accepted. A 503 means WEBHOOK_BROKER_G is not set in Vercel; a 502 means the Zap did not answer 2xx.');
  process.exit(1);
}
const parsed = JSON.parse(body);
if (parsed.assignedBroker !== 'broker_g') {
  console.error(`FAIL: expected assignedBroker broker_g, got ${parsed.assignedBroker}. Investigate before billing anything.`);
  process.exit(1);
}
console.log('PASS: lead accepted and assigned to broker_g (Taylor). Check his text + email, then delete the GHL contact.');
