import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import {
  $loanGoal, $propertyType, $state, $propertyValue, $downPayment, $loanBalance,
  $rehabBudget, $cashFlow, $creditScore, $usCitizen, $timeline,
  $firstName, $lastName, $phone, $email,
  $currentStep, $direction, $consent, $consentAt, $honeypot, $formStartedAt, $isSubmitting, $submitError,
  $submittedData, $matchedBroker, captureUTMParams, clearFormData, processURLParams,
} from '../../stores/formStore';
import { getBrokerForState, formatPhoneE164, getDeviceType, STATE_NAMES } from '../../utils/brokerRouting';
import { getDealVerdict, getRecommendedProgram } from '../../utils/rateEstimation';
import { track, trackBeacon } from '../../lib/analytics';
import { getAttribution, leadFields } from '../../lib/attribution';
import ProgressBar from './ProgressBar';
import StepLoanGoal from './StepLoanGoal';
import StepPropertyType from './StepPropertyType';
import StepLocation from './StepLocation';
import StepPropertyValue from './StepPropertyValue';
import StepDownPayment from './StepDownPayment';
import StepLoanBalance from './StepLoanBalance';
import StepRehabBudget from './StepRehabBudget';
import StepCashFlow from './StepCashFlow';
import StepCreditScore from './StepCreditScore';
import StepCitizenship from './StepCitizenship';
import StepTimeline from './StepTimeline';
import StepContact, { CONSENT_CHECKBOX_TEXT, CONSENT_DISCLOSURE_TEXT } from './StepContact';

// Phase 0 funnel vocabulary (src/lib/analytics.ts): this island reports the same
// event names as the V3 form on /qualify, under its own surface, so the GA4
// funnel reads both forms in one report.
const SURFACE = 'homepage-classic';

const isDemo = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';

// Start of the first interaction, set once; feeds secondsToComplete + form_start.
function markStarted() {
  if (!$formStartedAt.get()) {
    $formStartedAt.set(Date.now());
    track('form_start', { surface: SURFACE });
  }
}

// Advance to the step AFTER `from`, but only if the form is still ON `from` AND
// no other navigation happened since scheduling. Every auto-advance used to
// schedule a relative `current + 1`, so a double-tap (two stacked timers)
// advanced twice and skipped a step, and a Back click inside the delay window
// got undone by the stale timer. The generation counter also invalidates a
// stale timer when rapid Back+retap lands the user on the same step NUMBER via
// a different route (step identity, not just step index).
let advanceGen = 0;
function invalidatePendingAdvances() {
  advanceGen++;
}
function scheduleAdvance(from: number, delayMs: number) {
  const gen = ++advanceGen;
  setTimeout(() => {
    if (advanceGen !== gen) return; // another navigation was scheduled after this one
    if ($currentStep.get() !== from) return; // stale: double-tap or Back already moved us
    $direction.set('forward');
    $currentStep.set(from + 1);
  }, delayMs);
}

// Path step definitions. Each entry is a logical question. The router renders
// step N (1-indexed) for the current path. `loan_goal` is always step 1 and
// chooses the path; from step 2 onward, the path determines what shows.
type StepKey =
  | 'loan_goal'
  | 'property_type'
  | 'state'
  | 'property_value'
  | 'down_payment'
  | 'loan_balance'
  | 'rehab_budget'
  | 'cash_flow'
  | 'credit'
  | 'citizenship'
  | 'timeline'
  | 'contact';

const PATHS: Record<string, StepKey[]> = {
  // Purchase: type → state → value → down → cash flow → credit → citizenship → timeline → contact
  purchase: [
    'loan_goal', 'property_type', 'state', 'property_value', 'down_payment',
    'cash_flow', 'credit', 'citizenship', 'timeline', 'contact',
  ],
  // Refinance / Cash-Out: type → state → value → balance → cash flow → credit → timeline → contact
  refinance: [
    'loan_goal', 'property_type', 'state', 'property_value', 'loan_balance',
    'cash_flow', 'credit', 'timeline', 'contact',
  ],
  // Fix & Flip: type → state → purchase price → rehab → credit → citizenship → timeline → contact
  flip: [
    'loan_goal', 'property_type', 'state', 'property_value', 'rehab_budget',
    'credit', 'citizenship', 'timeline', 'contact',
  ],
};

function getPathSteps(loanGoal: string): StepKey[] {
  return PATHS[loanGoal] || PATHS.purchase;
}

export default function DSCRForm() {
  const currentStep = useStore($currentStep);
  const direction = useStore($direction);
  const loanGoal = useStore($loanGoal);
  const propertyType = useStore($propertyType);
  const state = useStore($state);
  const propertyValue = useStore($propertyValue);
  const downPayment = useStore($downPayment);
  const loanBalance = useStore($loanBalance);
  const rehabBudget = useStore($rehabBudget);
  const cashFlow = useStore($cashFlow);
  const creditScore = useStore($creditScore);
  const usCitizen = useStore($usCitizen);
  const timeline = useStore($timeline);
  const firstName = useStore($firstName);
  const lastName = useStore($lastName);
  const phone = useStore($phone);
  const email = useStore($email);
  const consent = useStore($consent);
  const honeypot = useStore($honeypot);
  const isSubmitting = useStore($isSubmitting);
  const submitError = useStore($submitError);

  const steps = useMemo(() => getPathSteps(loanGoal || 'purchase'), [loanGoal]);
  const totalSteps = steps.length;
  const stepKey = steps[Math.min(currentStep - 1, totalSteps - 1)];

  // Initialize on mount. Always start at step 1 unless we're on /qualify and the user has resumable state.
  useEffect(() => {
    processURLParams();
    captureUTMParams();
    $currentStep.set(1);
    track('form_view', { surface: SURFACE, step: 1 });
  }, []);

  // Report arrival at each forward step, named (form_step 2..N with the path's
  // step key), mirroring the V3 island's vocabulary.
  const lastStepTracked = useRef(1);
  useEffect(() => {
    if (currentStep > 1 && direction === 'forward' && currentStep !== lastStepTracked.current) {
      track('form_step', { surface: SURFACE, step_number: currentStep, step_name: stepKey });
    }
    lastStepTracked.current = currentStep;
  }, [currentStep, direction, stepKey]);

  // Cooldown so a double-click on a Continue button cannot advance two steps.
  const lastAdvanceAt = useRef(0);

  const goForward = useCallback(() => {
    const now = Date.now();
    if (now - lastAdvanceAt.current < 350) return;
    lastAdvanceAt.current = now;
    invalidatePendingAdvances();
    $direction.set('forward');
    $currentStep.set($currentStep.get() + 1);
  }, []);

  const goBack = useCallback(() => {
    if ($currentStep.get() > 1) {
      invalidatePendingAdvances();
      $direction.set('backward');
      $currentStep.set($currentStep.get() - 1);
    }
  }, []);

  // Step 1: Loan Goal, auto-advance and set path
  const handleLoanGoalSelect = useCallback((value: string) => {
    markStarted();
    $loanGoal.set(value);
    setTimeout(() => {
      $direction.set('forward');
      $currentStep.set(2);
    }, 300);
  }, []);

  // Property Type, auto-advance
  const handlePropertyTypeSelect = useCallback((value: string) => {
    markStarted();
    const from = $currentStep.get();
    $propertyType.set(value);
    scheduleAdvance(from, 300);
  }, []);

  // Location, auto-advance with confirmation delay
  const handleLocationSelect = useCallback((value: string) => {
    markStarted();
    const from = $currentStep.get();
    $state.set(value);
    const broker = getBrokerForState(value);
    $matchedBroker.set(broker);
    scheduleAdvance(from, 500);
  }, []);

  // Down payment, auto-advance after a beat (so user sees the qualifier message)
  const handleDownPaymentSelect = useCallback((value: string) => {
    markStarted();
    const from = $currentStep.get();
    $downPayment.set(value);
    scheduleAdvance(from, 450);
  }, []);

  // Cash flow, auto-advance
  const handleCashFlowSelect = useCallback((value: string) => {
    markStarted();
    const from = $currentStep.get();
    $cashFlow.set(value);
    scheduleAdvance(from, 450);
  }, []);

  // Credit, auto-advance
  const handleCreditSelect = useCallback((value: string) => {
    markStarted();
    const from = $currentStep.get();
    $creditScore.set(value);
    scheduleAdvance(from, 450);
  }, []);

  // Citizenship, auto-advance
  const handleCitizenshipSelect = useCallback((value: string) => {
    markStarted();
    const from = $currentStep.get();
    $usCitizen.set(value);
    scheduleAdvance(from, 450);
  }, []);

  // Timeline, auto-advance
  const handleTimelineSelect = useCallback((value: string) => {
    markStarted();
    const from = $currentStep.get();
    $timeline.set(value);
    scheduleAdvance(from, 450);
  }, []);

  // Submit
  const handleSubmit = useCallback(async () => {
    // Consent gate at submit time. The Try Again path calls handleSubmit directly
    // (bypassing StepContact's zod gate), so a user who unchecks the box and then
    // retries would otherwise ship a consent record for a revoked consent. A
    // consent record is a legal document; it is never fabricated.
    if (!$consent.get()) {
      $submitError.set('Please check the consent box above, then try again.');
      return;
    }

    $isSubmitting.set(true);
    $submitError.set(null);

    const brokerKey = $matchedBroker.get() || getBrokerForState($state.get());
    // Use cashFlow as the second arg for the verdict (negative = no-ratio path)
    const dealVerdict = getDealVerdict($creditScore.get(), $cashFlow.get());
    const programRec = getRecommendedProgram({
      loanGoal: $loanGoal.get(),
      cashFlow: $cashFlow.get(),
      usCitizen: $usCitizen.get(),
      propertyType: $propertyType.get(),
    });

    // Site-wide attribution (Phase 0): the layouts capture on every page load;
    // getAttribution() also captures, so the island works whichever ran first.
    // A ?demo=1 walk never writes the store.
    const attr = getAttribution();
    const flat = leadFields(attr);

    const payload = {
      // Client-generated id so the Zap/CRM can dedupe if a degraded network ever
      // produces two webhooks for one submission.
      submissionId:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      // The five flat fields Tanner maps in GHL (lead_source = CHANNEL:
      // google_ads / ai_chatgpt / organic_google / direct / ...; `leadSource`
      // below stays the SURFACE). Every key present, '' when absent.
      ...flat,
      leadSource: SURFACE,
      firstName: $firstName.get().trim(),
      lastName: $lastName.get().trim(),
      email: $email.get().trim().toLowerCase(),
      phone: formatPhoneE164($phone.get()),
      loanGoal: $loanGoal.get(),
      propertyType: $propertyType.get(),
      // Send the full spelled-out state name to the zap (easier to read in GHL).
      // Keep the 2-letter code on `stateCode` for any downstream logic.
      state: STATE_NAMES[$state.get()] || $state.get(),
      stateCode: $state.get(),
      propertyValue: $propertyValue.get(),
      downPayment: $downPayment.get(),
      loanBalance: $loanBalance.get(),
      rehabBudget: $rehabBudget.get(),
      cashFlow: $cashFlow.get(),
      creditScore: $creditScore.get(),
      usCitizen: $usCitizen.get(),
      timeline: $timeline.get(),
      dealTier: dealVerdict.tier,
      matchedBroker: brokerKey,
      // TCPA consent record: the exact text agreed to, when the box was checked,
      // and where. The server (/api/lead) rejects submissions without this and
      // stamps client IP, user agent, and received-at before forwarding, so the
      // CRM holds a complete, defensible consent record for every lead.
      consent: {
        agreed: true,
        text: `${CONSENT_CHECKBOX_TEXT} ${CONSENT_DISCLOSURE_TEXT}`,
        agreedAt: $consentAt.get() || new Date().toISOString(),
        url: window.location.href,
      },
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
        landingPageUrl: attr.landingPage || window.location.href,
        referrer: attr.referrer,
        firstSeenAt: attr.firstSeenAt,
        deviceType: getDeviceType(),
        leadSource: SURFACE,
      },
      submittedAt: new Date().toISOString(),
      // Seconds from first interaction to submit; the server's honeypot time gate reads it.
      secondsToComplete: $formStartedAt.get() ? Math.round((Date.now() - $formStartedAt.get()) / 1000) : null,
      ff_hp: $honeypot.get(),
    };

    let success = false;
    // The server owns the final assignment for split states (GA is a 50/50
    // John/Adam split picked in /api/lead). Default to the client-side guess.
    let assignedBroker = brokerKey;

    // POST to our own server route, which forwards to the broker's Zapier hook.
    // The webhook URL is a non-PUBLIC env var, so it is NOT available in the
    // browser bundle (Vite strips it), it must be read server-side. This is also
    // a same-origin request, so there is no CORS/preflight concern.
    const body = JSON.stringify(payload);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
          // Longer than the server's 10s webhook budget so a client abort cannot
          // race a forward that is still completing (an aborted-then-retried POST
          // risks two webhooks for one lead).
          signal: AbortSignal.timeout(20000),
        });
        if (response.ok) {
          try {
            const result = await response.json();
            if (typeof result?.assignedBroker === 'string') {
              assignedBroker = result.assignedBroker;
            }
          } catch {
            /* body parse failure never blocks the success path */
          }
          success = true;
        }
        // ANY received response is terminal, ok or not. A 502 can mean the
        // webhook already fired before Zapier answered badly; re-POSTing it
        // would duplicate the lead. Only a thrown network error is retried.
        break;
      } catch {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    $isSubmitting.set(false);

    if (success) {
      // Beacon transport: both events race the /thank-you navigation.
      trackBeacon('form_complete', { surface: SURFACE });
      // The one key event, suppressed on ?demo=1 (same rule as the Ads conversion).
      if (!isDemo()) {
        trackBeacon('generate_lead', {
          surface: SURFACE,
          lead_source: flat.lead_source,
          broker: assignedBroker,
          state: payload.state,
          property_type: payload.propertyType,
          loan_goal: payload.loanGoal,
          credit_tier: payload.creditScore,
          deal_tier: payload.dealTier,
        });
      }

      // Persist submission for the thank-you page to render the verdict + broker context.
      // matchedBroker reflects the SERVER's assignment (split states may differ from
      // the client-side guess) so the right specialist renders on /thank-you/.
      // The trap value itself stays out of sessionStorage; only the flag travels,
      // so /thank-you can keep the Ads conversion off for a filled trap.
      const { ff_hp, ...stored } = payload;
      const successPayload = {
        ...stored,
        matchedBroker: assignedBroker,
        dealVerdict,
        program: programRec,
        honeypotFilled: typeof ff_hp === 'string' && ff_hp.trim() !== '',
      };
      sessionStorage.setItem('dscrbroker_submission', JSON.stringify(successPayload));
      $submittedData.set(successPayload);
      clearFormData();

      // Redirect to the dedicated thank-you page. ?demo=1 travels with the
      // navigation so the thank-you Ads conversion stays suppressed on QA walks.
      window.location.href = isDemo() ? '/thank-you/?demo=1' : '/thank-you/';
    } else {
      track('form_error', { surface: SURFACE, error_type: 'webhook_failed', step: currentStep });
      $submitError.set('Something went wrong. Your information has been saved. Please try again.');
    }
  }, [currentStep]);

  const handleRetry = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  return (
    <div className="min-h-[400px]">
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      {currentStep > 1 && (
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-semibold uppercase tracking-wider transition-colors duration-150 mb-4"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      <div
        key={`${loanGoal}-${currentStep}`}
        style={{
          animation: `${direction === 'forward' ? 'slideLeft' : 'slideRight'} 300ms ease-out`,
        }}
      >
        {stepKey === 'loan_goal' && (
          <StepLoanGoal value={loanGoal} onSelect={handleLoanGoalSelect} />
        )}
        {stepKey === 'property_type' && (
          <StepPropertyType value={propertyType} onSelect={handlePropertyTypeSelect} />
        )}
        {stepKey === 'state' && (
          <StepLocation value={state} onSelect={handleLocationSelect} />
        )}
        {stepKey === 'property_value' && (
          <StepPropertyValue
            value={propertyValue}
            onChange={(v) => $propertyValue.set(v)}
            onContinue={goForward}
            headline={
              loanGoal === 'flip'
                ? 'What is the purchase price?'
                : loanGoal === 'refinance'
                  ? 'What is the property value?'
                  : 'What is the estimated property value?'
            }
            ariaLabel={loanGoal === 'flip' ? 'Purchase price' : 'Property value'}
          />
        )}
        {stepKey === 'down_payment' && (
          <StepDownPayment value={downPayment} onSelect={handleDownPaymentSelect} />
        )}
        {stepKey === 'loan_balance' && (
          <StepLoanBalance
            value={loanBalance}
            propertyValue={propertyValue}
            onChange={(v) => $loanBalance.set(v)}
            onContinue={goForward}
          />
        )}
        {stepKey === 'rehab_budget' && (
          <StepRehabBudget
            value={rehabBudget}
            onChange={(v) => $rehabBudget.set(v)}
            onContinue={goForward}
          />
        )}
        {stepKey === 'cash_flow' && (
          <StepCashFlow value={cashFlow} onSelect={handleCashFlowSelect} />
        )}
        {stepKey === 'credit' && (
          <StepCreditScore value={creditScore} onSelect={handleCreditSelect} />
        )}
        {stepKey === 'citizenship' && (
          <StepCitizenship value={usCitizen} onSelect={handleCitizenshipSelect} />
        )}
        {stepKey === 'timeline' && (
          <StepTimeline value={timeline} onSelect={handleTimelineSelect} />
        )}
        {stepKey === 'contact' && (
          <StepContact
            firstName={firstName}
            lastName={lastName}
            email={email}
            phone={phone}
            consent={consent}
            honeypot={honeypot}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onFirstNameChange={(v) => $firstName.set(v)}
            onLastNameChange={(v) => $lastName.set(v)}
            onEmailChange={(v) => $email.set(v)}
            onPhoneChange={(v) => $phone.set(v)}
            onConsentChange={(v) => {
              $consent.set(v);
              // Timestamp the actual consent click for the TCPA record.
              $consentAt.set(v ? new Date().toISOString() : '');
            }}
            onHoneypotChange={(v) => $honeypot.set(v)}
            onSubmit={handleSubmit}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  );
}
