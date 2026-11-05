// Live lead delivery for the EMBEDDED V3 form on /forms/lp-t4/ (the /qualify
// candidate). Mirrors src/components/form/DSCRForm.tsx's payload 1:1 (same keys,
// same value formats, same /api/lead contract, same sessionStorage handoff) so
// the existing Zap -> GHL field map and the live /thank-you/ page read both forms
// without changes. Switched by `lead.delivery` in src/config/lp-t4.ts:
//   'test'  recordTestLead() only (console + localStorage, zero network)
//   'live'  POST /api/lead -> broker Zap, persist assignedBroker, go to /thank-you/
//
// Rules carried over from the live form:
//   - ONE webhook per lead, no partial captures, any HTTP response is terminal
//     (a 502 can mean the Zap already fired), only a thrown network error retries once
//   - the TCPA consent record is the verbatim CONSENT_TEXT + the click timestamp +
//     the URL; the server stamps IP / user agent / received-at and 400s without it
//   - split states (GA) are resolved SERVER-SIDE; `matchedBroker` here is a guess the
//     API overrides, and the thank-you page renders the API's `assignedBroker`
//   - excluded states never POST (the network has nobody to send them to)
import {
  CONSENT_TEXT,
  PATHS,
  formatPrice,
  type PathId,
  type TemplateAnswers,
} from './flow';
import {
  STATE_NAMES,
  STATES_LIST,
  getBrokerForState,
  formatPhoneE164,
  getDeviceType,
} from '../../utils/brokerRouting';
import { getAttribution, leadFields, type AttributionRecord } from '../attribution';
import { getDealVerdict, getRecommendedProgram } from '../../utils/rateEstimation';

export type LeadDelivery = 'test' | 'live';

/** Page-level lead config; the page passes it into the island as a prop. */
export interface LeadConfig {
  delivery: LeadDelivery;
  /** Distinguishes this page's leads from the old /qualify form in GHL. */
  leadSource: string;
  thankYouPath: string;
  /** Kick-out copy for NY MI ND SD UT. `{state}` is replaced with the state name. */
  notCovered: { headline: string; body: string; backLabel: string };
  /** Submit button label while the POST is in flight. */
  sendingLabel: string;
  /** Shown above the button when the POST fails; the button stays live to retry. */
  failed: string;
}

/* ------------------------------- states ------------------------------- */

// Codes the network covers (STATES_LIST already drops EXCLUDED_STATES; deriving
// from it keeps brokerRouting.ts the single source of truth).
const COVERED = new Set(STATES_LIST.map((s) => s.value));

const CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);
CODE_BY_NAME['washington, d.c.'] = 'DC'; // flow.ts spelling of the District

export function stateCodeFor(name?: string): string | null {
  if (!name) return null;
  return CODE_BY_NAME[name.trim().toLowerCase()] ?? null;
}

export function isCoveredState(code: string | null): boolean {
  return !!code && COVERED.has(code);
}

/* ------------------------------ tracking ------------------------------ */

export interface Tracking {
  /** The site-wide attribution record (src/lib/attribution.ts): captured on
      every page load into localStorage (90 days, newest ad click wins, first
      touch kept for organic), so a state-page-to-/qualify hop keeps the click. */
  attribution: AttributionRecord;
  /** `?demo=1` on the form page's URL: passed through to /thank-you/ so the AW conversion is suppressed. */
  demo: boolean;
}

/**
 * Attribution comes from the site-wide store (the layouts capture on every
 * page load; getAttribution() also captures, so the island works whichever
 * runs first). `demo` is read off the form page's own URL: the island never
 * navigates mid-form, so the flag cannot be lost between steps.
 */
export function captureTracking(): Tracking {
  if (typeof window === 'undefined') {
    return { attribution: { params: emptyAttrParams(), landingPage: '', referrer: '', firstSeenAt: '' }, demo: false };
  }
  return {
    attribution: getAttribution(),
    demo: new URLSearchParams(window.location.search).get('demo') === '1',
  };
}

function emptyAttrParams(): AttributionRecord['params'] {
  return {
    gclid: '', gbraid: '', wbraid: '', fbclid: '',
    utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '',
  };
}

/* ------------------------------- mapping ------------------------------ */

const LOAN_GOAL: Record<PathId, string> = { buy: 'purchase', refi: 'refinance', flip: 'flip' };

// V3 property labels (flow.ts PROPERTY_TYPES) -> the live form's enum. The
// verbatim label travels alongside in `formAnswers`; "Commercial" and "Other"
// have no live equivalent (open Tanner decision) and pass through as-is.
const PROPERTY_TYPE: Record<string, string> = {
  'Single-family': 'single_family',
  'Townhome or condo': 'warrantable_condo',
  '2 to 4 units': 'multi_family_small',
  '5 to 9 units': 'multi_family_large',
  '10 to 15 units': 'multi_family_large',
  Commercial: 'commercial',
  Other: 'other',
};

// V3 credit ids (flow.ts CREDIT_OPTIONS) -> the live enum shape for GHL, plus the
// nearest live band for the thank-you verdict copy and the band text to show.
const CREDIT: Record<string, { value: string; verdictBand: string; verdictLabel: string }> = {
  '740+': { value: '740_plus', verdictBand: '740_plus', verdictLabel: '740+ FICO' },
  '680-739': { value: '680_739', verdictBand: '700_739', verdictLabel: '680 to 739 FICO' },
  '620-679': { value: '620_679', verdictBand: '640_699', verdictLabel: '620 to 679 FICO' },
};

// Live labels the verdict bullets interpolate for the nearest band (rateEstimation.ts).
const LIVE_BAND_LABEL: Record<string, string> = {
  '740_plus': '740+ FICO',
  '700_739': '700–739 FICO',
  '640_699': '640–699 FICO',
};

/** Buy-path slider value ("25%" / "50%+") -> the live form's downPayment format. */
function downPaymentValue(fork?: string): string {
  if (!fork) return '';
  const m = fork.match(/^(\d+)%(\+?)$/);
  if (!m) return fork;
  return m[2] ? `${m[1]}_plus` : m[1];
}

function newSubmissionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface BuiltLead {
  payload: Record<string, unknown>;
  dealVerdict: ReturnType<typeof getDealVerdict>;
  program: ReturnType<typeof getRecommendedProgram>;
}

export function buildLeadPayload(
  answers: TemplateAnswers,
  opts: {
    consentAt: string | null;
    tracking: Tracking;
    leadSource: string;
    /** Trap field value: travels as ff_hp; the server labels, never gates. */
    honeypot: string;
    /** First-interaction timestamp (ms); feeds secondsToComplete. */
    startedAt: number | null;
  },
): BuiltLead {
  const path: PathId = answers.path ?? 'buy';
  const loanGoal = LOAN_GOAL[path];
  const stateCode = stateCodeFor(answers.location) ?? '';
  const propertyType = PROPERTY_TYPE[answers.propertyType ?? ''] ?? (answers.propertyType ?? '');
  const credit = CREDIT[answers.credit ?? ''];
  const creditScore = credit?.value ?? (answers.credit ?? '');

  // Thank-you verdict: computed like the live form, on the nearest live band, with
  // the band text swapped to what the visitor actually picked.
  const raw = getDealVerdict(credit?.verdictBand ?? creditScore, '');
  const liveLabel = credit ? LIVE_BAND_LABEL[credit.verdictBand] : undefined;
  const dealVerdict =
    credit && liveLabel && liveLabel !== credit.verdictLabel
      ? { ...raw, specialistFocus: raw.specialistFocus.map((s) => s.split(liveLabel).join(credit.verdictLabel)) }
      : raw;
  const program = getRecommendedProgram({ loanGoal, cashFlow: '', usCitizen: '', propertyType });

  const attr = opts.tracking.attribution;
  // The five flat fields Tanner maps in GHL (lead_source = CHANNEL: google_ads /
  // ai_chatgpt / organic_google / direct / ...; `leadSource` below stays the
  // SURFACE: homepage-v3 / qualify-lp-t4). Every key present, '' when absent.
  const flat = leadFields(attr);
  const payload: Record<string, unknown> = {
    submissionId: newSubmissionId(),
    ...flat,
    firstName: (answers.firstName ?? '').trim(),
    lastName: (answers.lastName ?? '').trim(),
    email: (answers.email ?? '').trim().toLowerCase(),
    phone: formatPhoneE164(answers.phone ?? ''),
    loanGoal,
    propertyType,
    state: STATE_NAMES[stateCode] || answers.location || '',
    stateCode,
    propertyValue: typeof answers.price === 'number' ? String(answers.price) : '',
    downPayment: path === 'buy' ? downPaymentValue(answers.fork) : '',
    loanBalance: path === 'refi' ? (answers.fork ?? '') : '',
    rehabBudget: path === 'flip' ? (answers.fork ?? '') : '',
    cashFlow: '',
    creditScore,
    usCitizen: '',
    // The live form asks a timeline; this form asks "Where are you in the process?"
    // and sends that answer verbatim under the same key.
    timeline: answers.process ?? '',
    dealTier: dealVerdict.tier,
    matchedBroker: stateCode ? getBrokerForState(stateCode) : 'broker_a',
    leadSource: opts.leadSource,
    // Verbatim answers as the visitor saw them (this form's wording differs from the
    // live form's), so the broker reads the real picks in GHL.
    formAnswers: {
      path: PATHS.find((p) => p.id === path)?.label ?? path,
      process: answers.process ?? '',
      propertyType: answers.propertyType ?? '',
      credit: answers.credit ?? '',
      price: typeof answers.price === 'number' ? formatPrice(answers.price) : '',
      fork: answers.fork ?? '',
      location: answers.location ?? '',
    },
    consent: {
      agreed: true,
      text: CONSENT_TEXT,
      agreedAt: opts.consentAt || new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    },
    // Full source record (same keys the Zap map has always seen, now fed from
    // the site-wide store instead of the form page's own URL, plus the ad-click
    // extras). The flat fields above are the mapped view of this.
    source: {
      utmSource: attr.params.utm_source || null,
      utmMedium: attr.params.utm_medium || null,
      utmCampaign: attr.params.utm_campaign || null,
      utmTerm: attr.params.utm_term || null,
      utmContent: attr.params.utm_content || null,
      gclid: attr.params.gclid || null,
      gbraid: attr.params.gbraid || null,
      wbraid: attr.params.wbraid || null,
      fbclid: attr.params.fbclid || null,
      landingPageUrl: attr.landingPage || (typeof window !== 'undefined' ? window.location.href : ''),
      referrer: attr.referrer,
      firstSeenAt: attr.firstSeenAt,
      deviceType: getDeviceType(),
      leadSource: opts.leadSource,
    },
    submittedAt: new Date().toISOString(),
    // Seconds from first interaction to submit; the server logs it next to the trap flag.
    secondsToComplete: opts.startedAt ? Math.round((Date.now() - opts.startedAt) / 1000) : null,
    ff_hp: opts.honeypot,
  };

  return { payload, dealVerdict, program };
}

/* ------------------------------- delivery ----------------------------- */

export type SubmitResult =
  | { ok: true; assignedBroker: string }
  | { ok: false; status: number | null; error: string };

export async function submitLiveLead(payload: Record<string, unknown>): Promise<SubmitResult> {
  const body = JSON.stringify(payload);
  const fallbackBroker = typeof payload.matchedBroker === 'string' ? payload.matchedBroker : 'broker_a';
  let lastError = 'network';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        signal: AbortSignal.timeout(20000),
      });
      if (response.ok) {
        let assignedBroker = fallbackBroker;
        try {
          const result = await response.json();
          if (typeof result?.assignedBroker === 'string') assignedBroker = result.assignedBroker;
        } catch {
          /* a body parse failure never blocks the success path */
        }
        return { ok: true, assignedBroker };
      }
      let error = `HTTP_${response.status}`;
      try {
        const result = await response.json();
        if (typeof result?.error === 'string') error = result.error;
      } catch {
        /* keep the status code */
      }
      // Any received response is terminal (a 502 can mean the Zap already fired).
      return { ok: false, status: response.status, error };
    } catch (e) {
      lastError = e instanceof Error ? e.name : 'network';
      if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return { ok: false, status: null, error: lastError };
}

/** Same key + shape ThankYou.tsx reads; matchedBroker is the SERVER's assignment.
    The raw trap value stays out of sessionStorage; only the flag travels (same as
    the live form), so /thank-you/ can read honeypotFilled like any other lead. */
export function persistSubmission(built: BuiltLead, assignedBroker: string): void {
  const { ff_hp, ...stored } = built.payload;
  const record = {
    ...stored,
    matchedBroker: assignedBroker,
    dealVerdict: built.dealVerdict,
    program: built.program,
    honeypotFilled: typeof ff_hp === 'string' && ff_hp.trim() !== '',
  };
  try {
    sessionStorage.setItem('dscrbroker_submission', JSON.stringify(record));
  } catch {
    /* the thank-you page shows its "no submission" fallback */
  }
}

export function thankYouUrl(path: string, demo: boolean): string {
  return demo ? `${path}?demo=1` : path;
}
