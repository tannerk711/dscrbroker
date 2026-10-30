// Shared flow spec for the 4 DSCR form templates (branch: form-templates).
// TEST BUILD: no webhooks, no network. Submissions log to console and localStorage only.
// Each template renders its own UI; this file is the single source of truth for
// question order, path variations, option sets, and the kick-out rule.

export type PathId = 'buy' | 'refi' | 'flip';

export interface PathDef {
  id: PathId;
  label: string;
  sub: string;
}

// Subtitles match the live form's canonical step-1 wording.
export const PATHS: PathDef[] = [
  { id: 'buy', label: 'Buy a rental', sub: 'Purchase an investment property' },
  { id: 'refi', label: 'Refinance', sub: 'Pull cash out or restructure an existing loan' },
  { id: 'flip', label: 'Fix & Flip/Hold', sub: 'Buy, renovate, then sell or hold as a rental' },
];

// Step 2: Where are you in the process? (options vary by path)
export const PROCESS_OPTIONS: Record<PathId, string[]> = {
  buy: ['Just starting my research', 'Actively looking at properties', 'Made an offer or under contract'],
  refi: ['Just exploring my options', 'Comparing lenders', 'Ready to move now'],
  flip: ['Scouting deals', 'Deal under contract', 'Own it, planning the rehab'],
};

// Step 3: Tell us about the property (single question; usage toggle cut 2026-09-04)
export const PROPERTY_TYPES = [
  'Single-family',
  'Townhome or condo',
  '2 to 4 units',
  '5 to 9 units',
  '10 to 15 units',
  'Commercial',
  'Other',
];

// Step 4: How's your credit right now? Kick out below 620.
export interface CreditOption {
  id: string;
  label: string;
  micro: string; // right-aligned micro-label (LeaderOne pattern); templates may ignore
  kickOut: boolean;
}
export const CREDIT_OPTIONS: CreditOption[] = [
  { id: '740+', label: '740 or above', micro: 'Strongest terms', kickOut: false },
  { id: '680-739', label: '680 to 739', micro: 'Great DSCR range', kickOut: false },
  { id: '620-679', label: '620 to 679', micro: 'DSCR eligible', kickOut: false },
  { id: 'below-620', label: 'Below 620', micro: '', kickOut: true },
];
// V1 renders no credit sub-line at all; V3 renders this short one (Tanner, 2026-09-04)
export const CREDIT_REASSURANCE = 'Your honest guess is okay.';

// Kick-out screen copy (honest, no fake workaround, leaves the door open).
export const KICKOUT = {
  headline: '620 is the line for DSCR.',
  body: 'Most DSCR lenders need a 620 score to fund a deal. The honest move is to work the score first. Once you cross 620, come back and we will match you with a specialist.',
  backLabel: 'I picked the wrong range',
};

// Step 5: price question wording varies by path. Slider bounds shared.
export const PRICE_LABELS: Record<PathId, string> = {
  buy: 'About what price range?',
  refi: "About what's the property worth?",
  flip: "About what's the purchase price?",
};
export const PRICE_SUB = 'An estimate is fine.';
export const PRICE_MIN = 100_000;
export const PRICE_MAX = 3_000_000; // render top of range as "$3M+"
export const PRICE_STEP = 50_000;
export const PRICE_DEFAULT = 300_000;

// Step 6 buy path is a SLIDER since 2026-09-04: 20% to 50%+ in 5% steps.
export const DOWN_MIN = 20;
export const DOWN_MAX = 50; // render top as "50%+"
export const DOWN_STEP = 5;
export const DOWN_DEFAULT = 25;
export function formatDownPct(v: number): string {
  return v >= DOWN_MAX ? '50%+' : `${v}%`;
}

// Step 6: the fork step. Same slot, path-specific question.
// buy.options is legacy; the buy fork renders as a slider (DOWN_* consts) since 2026-09-04.
export const FORK_QUESTIONS: Record<PathId, { label: string; sub?: string; options: string[] }> = {
  buy: {
    label: 'Please estimate your down payment.',
    options: [],
  },
  refi: {
    label: 'About how much do you still owe?',
    sub: "Of the property's value, roughly.",
    options: ['Free and clear', 'Less than 50%', '50% to 70%', 'Over 70%'],
  },
  flip: {
    label: "What's your rehab budget?",
    options: ['Under $25K', '$25K to $50K', '$50K to $100K', '$100K+'],
  },
};

// Step 7: STATE ONLY since 2026-09-04, via a type-ahead combobox (type-in dropdown).
export const LOCATION_LABELS: Record<PathId, string> = {
  buy: 'Where are you buying?',
  refi: "Where's the property?",
  flip: "Where's the project?",
};
export const LOCATION_PLACEHOLDER = 'Start typing a state';
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'Washington, D.C.',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

// Step 8
export const CONTACT_LABEL = 'Almost done. Who are we talking to?';

// Step 9
export const PHONE_LABEL = 'Last step: best mobile number?';
export const PHONE_SUB = 'A DSCR broker will personally text and call you about your eligibility.';

// One checkbox, one consent text (say-it-once). Gated, starts unchecked, blocks submit.
export const CONSENT_TEXT =
  'I agree to be contacted by a licensed DSCR specialist about my inquiry by call, text, or email, including via automated technology. Message and data rates may apply; reply STOP to opt out. Consent is not a condition of purchase. Submitting this form does not pull my credit.';

export interface TemplateAnswers {
  path?: PathId;
  process?: string;
  propertyType?: string;
  credit?: string;
  price?: number;
  fork?: string; // down payment % | balance owed | rehab budget, per path
  location?: string; // state name from US_STATES
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface TestLead {
  template: string;
  path: PathId;
  answers: TemplateAnswers;
  consent: {
    agreed: true;
    text: string;
    timestamp: string;
    url: string;
  };
  submittedAt: string;
}

const STORAGE_KEY = 'dscr_form_template_leads';

// TEST MODE submit: console + localStorage. Never a network call.
export function recordTestLead(template: string, answers: TemplateAnswers): TestLead {
  const lead: TestLead = {
    template,
    path: answers.path as PathId,
    answers,
    consent: {
      agreed: true,
      text: CONSENT_TEXT,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    },
    submittedAt: new Date().toISOString(),
  };
  try {
    const existing: TestLead[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.push(lead);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // storage unavailable; console log below still fires
  }
  console.log('[form-template TEST LEAD]', lead);
  return lead;
}

export function readTestLeads(): TestLead[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearTestLeads(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Formatting helpers shared by templates
export function formatPrice(v: number): string {
  return v >= PRICE_MAX ? '$3M+' : '$' + v.toLocaleString('en-US');
}

export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function isValidPhone(v: string): boolean {
  return v.replace(/\D/g, '').replace(/^1/, '').length === 10;
}
