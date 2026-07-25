import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

// Path: 'purchase' | 'refinance' | 'flip' (drives step branching)
export const $loanGoal = persistentAtom<string>('form_loanGoal', '');
export const $propertyType = persistentAtom<string>('form_propertyType', '');
export const $state = persistentAtom<string>('form_state', '');

// Numeric slider fields. Stored as strings for consistency with existing payload contract.
export const $propertyValue = persistentAtom<string>('form_propertyValue', '');
export const $downPayment = persistentAtom<string>('form_downPayment', '');
export const $loanBalance = persistentAtom<string>('form_loanBalance', '');
export const $rehabBudget = persistentAtom<string>('form_rehabBudget', '');

// New question: positive | break_even | negative
export const $cashFlow = persistentAtom<string>('form_cashFlow', '');

export const $creditScore = persistentAtom<string>('form_creditScore', '');
// 'yes' | 'permanent_resident' | 'foreign_national'
export const $usCitizen = persistentAtom<string>('form_usCitizen', '');
export const $timeline = persistentAtom<string>('form_timeline', '');

export const $firstName = persistentAtom<string>('form_firstName', '');
export const $lastName = persistentAtom<string>('form_lastName', '');
export const $phone = persistentAtom<string>('form_phone', '');
export const $email = persistentAtom<string>('form_email', '');
export const $utmParams = persistentAtom<string>('form_utm', '{}');

// Non-persistent atoms (reset on page load)
export const $currentStep = atom(1);
export const $direction = atom<'forward' | 'backward'>('forward');
export const $consent = atom(false);
export const $honeypot = atom('');
export const $isSubmitting = atom(false);
export const $submitError = atom<string | null>(null);
export const $submittedData = atom<Record<string, unknown> | null>(null);
export const $matchedBroker = atom<string | null>(null);

// UTM capture
export function captureUTMParams() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string | null> = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
    gclid: params.get('gclid'),
    fbclid: params.get('fbclid'),
  };
  const hasUTM = Object.values(utm).some(Boolean);
  if (hasUTM) {
    $utmParams.set(JSON.stringify(utm));
  }
}

// Resume logic: find the last completed step in the user's path.
// Lightweight heuristic: if email is set, jump to contact; otherwise the
// caller can reset. With per-path step trees, deep resume is brittle, so we
// only resume to step 1 unless contact info is partially filled.
export function getResumeStep(): number {
  if ($email.get() || $firstName.get()) {
    // Last contact step lives at different indexes per path; safe default = restart.
    return 1;
  }
  return 1;
}

// Clear form data after successful submission
export function clearFormData() {
  $loanGoal.set('');
  $propertyType.set('');
  $state.set('');
  $propertyValue.set('');
  $downPayment.set('');
  $loanBalance.set('');
  $rehabBudget.set('');
  $cashFlow.set('');
  $creditScore.set('');
  $usCitizen.set('');
  $timeline.set('');
  $firstName.set('');
  $lastName.set('');
  $phone.set('');
  $email.set('');
  // Do NOT clear UTM params. Keep for attribution.
}

// Process URL params for /qualify/ pre-fill
export function processURLParams() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);

  // NOTE: `state` is intentionally NOT pre-filled from the URL param. Pre-selecting
  // the state left the location step showing a state + green confirmation but never
  // auto-advancing (auto-advance only fires on a real user onChange), stalling the
  // lead. We want the lead to actively select their own state, so the location step
  // always starts empty. See StepLocation.tsx. (2026-07-24)
  const mappings: Record<string, typeof $state> = {
    type: $propertyType,
    value: $propertyValue,
    down: $downPayment,
    credit: $creditScore,
  };

  for (const [param, store] of Object.entries(mappings)) {
    const val = params.get(param);
    if (val) store.set(val);
  }

  captureUTMParams();
}
