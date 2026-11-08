// Template v3: fhaloans.com style, rebranded DSCR. Blue hero stage, milestone
// stepper, yellow option buttons, white illustrated path cards. Standalone
// (/forms/v3-fhaloans/): submissions go through recordTestLead only, never the
// network.
//
// `embedded` drops the chrome (utility bar, header, trust strip), makes the
// root transparent with no min-height, and renders every headline as an h2 so
// the host page keeps its single H1. Colors are --fv3-* variables declared in
// CSS_TEXT; a host page retints the form by overriding them on .fv3-root.
//
// `lead` (host page config, src/lib/form-templates/live-submit.ts) turns on the
// /qualify behaviors: excluded states (NY MI ND SD UT) get a kick-out at the
// state step instead of the contact steps, tracking params are captured on
// load, and with `lead.delivery === 'live'` submit POSTs to /api/lead, persists
// the API's assignedBroker for /thank-you/, and navigates there. Without `lead`
// nothing about the standalone page changes.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { Gauge, FileX2, Home } from 'lucide-react';
import {
  KICKOUT,
  PRICE_LABELS,
  FORK_QUESTIONS,
  LOCATION_LABELS,
  CONTACT_LABEL,
  PHONE_LABEL,
  recordTestLead,
  type PathId,
  type TemplateAnswers,
  type CreditOption,
} from '../../../lib/form-templates/flow';
import {
  buildLeadPayload,
  captureTracking,
  isCoveredState,
  persistSubmission,
  stateCodeFor,
  submitLiveLead,
  thankYouUrl,
  type LeadConfig,
  type Tracking,
} from '../../../lib/form-templates/live-submit';
import { track, trackBeacon } from '../../../lib/analytics';
import { MilestoneStepper, FormV3Ctx } from './bits';
import { StepPath, StepProcess, StepProperty, StepCredit, StepPrice, StepFork } from './steps-choice';
import { StepLocation, StepContact, StepPhone } from './steps-input';
import { KickoutScreen, SuccessScreen, type KickoutCopy } from './screens';

type View = 'flow' | 'kickout' | 'success';
type KickoutKind = 'credit' | 'state';

function notCoveredCopy(lead: LeadConfig, state: string | undefined): KickoutCopy {
  const name = state?.trim() || 'that state';
  const fill = (s: string) => s.split('{state}').join(name);
  return {
    headline: fill(lead.notCovered.headline),
    body: fill(lead.notCovered.body),
    backLabel: lead.notCovered.backLabel,
  };
}

const TEMPLATE_ID = 'v3-fhaloans';
const EMBEDDED_TEMPLATE_ID = 'lp-t4-v3';

const TRUST = [
  { icon: Gauge, label: '620+ credit score' },
  { icon: FileX2, label: 'No tax returns or W-2s' },
  { icon: Home, label: 'Qualify on rental income' },
];

// GA4 form_step names (Phase 0 funnel). The fork step is path-specific so the
// reports read in plain English instead of "step 6".
function stepEventName(step: number, path: PathId): string {
  switch (step) {
    case 1: return 'loan_goal';
    case 2: return 'process';
    case 3: return 'property_type';
    case 4: return 'credit';
    case 5: return 'price';
    case 6: return path === 'buy' ? 'down_payment' : path === 'refi' ? 'loan_balance' : 'rehab_budget';
    case 7: return 'state';
    case 8: return 'contact';
    default: return 'phone';
  }
}

function questionFor(step: number, path: PathId): string {
  switch (step) {
    case 1:
      return 'What are you looking to do?';
    case 2:
      return 'Where are you in the process?';
    case 3:
      return 'Tell us about the property.';
    case 4:
      return "How's your credit right now?";
    case 5:
      return PRICE_LABELS[path];
    case 6:
      return FORK_QUESTIONS[path].label;
    case 7:
      return LOCATION_LABELS[path];
    case 8:
      return CONTACT_LABEL;
    default:
      return PHONE_LABEL;
  }
}

export default function FormV3({ embedded = false, lead }: { embedded?: boolean; lead?: LeadConfig }) {
  const [view, setView] = useState<View>('flow');
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<TemplateAnswers>({});
  const [consent, setConsent] = useState(false);
  const [creditFlash, setCreditFlash] = useState<string | null>(null);
  const [kickoutKind, setKickoutKind] = useState<KickoutKind>('credit');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Trap field (label only, never a gate): rides the payload as ff_hp.
  const [honeypot, setHoneypot] = useState('');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);
  // Live delivery: landing-URL tracking captured once on load; consent click time.
  const trackingRef = useRef<Tracking | null>(null);
  const consentAtRef = useRef<string | null>(null);
  // First interaction, set once; feeds secondsToComplete (same as the live form).
  const startedAtRef = useRef<number | null>(null);
  const reduce = !!useReducedMotion();
  const ctx = useMemo(() => ({ embedded }), [embedded]);

  // GA4 event params shared by every funnel event. `surface` = which mount
  // (homepage-v3 / qualify-lp-t4); the island is the same either way.
  const surface = lead?.leadSource ?? 'standalone';

  useEffect(() => {
    if (lead) trackingRef.current = captureTracking();
    // form_view: the island mounted and is usable (scoreboard numerator for
    // "visit -> form start" needs the denominator actually rendered).
    track('form_view', { surface });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);

  const changeConsent = (v: boolean) => {
    consentAtRef.current = v ? new Date().toISOString() : null;
    setConsent(v);
  };

  const clearPending = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lockRef.current = false;
  };
  useEffect(() => clearPending, []);

  const goTo = (nextStep: number, nextView: View = 'flow') => {
    setDir(1);
    setView(nextView);
    setStep(nextStep);
    // Forward entry into a step = the previous step was answered. Back
    // navigation never fires (clearPending/back don't route through here).
    if (nextView === 'flow') {
      track('form_step', {
        surface,
        step_number: nextStep,
        step_name: stepEventName(nextStep, answers.path ?? 'buy'),
      });
    }
  };

  /** Show the selected state for a beat, then slide forward. */
  const flashThen = (apply: () => void, nav: () => void) => {
    if (lockRef.current) return;
    if (!startedAtRef.current) {
      startedAtRef.current = Date.now();
      // First answer given: the "start -> completed lead" denominator.
      track('form_start', { surface });
    }
    lockRef.current = true;
    apply();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      lockRef.current = false;
      nav();
    }, 250);
  };

  const back = () => {
    clearPending();
    setDir(-1);
    if (view === 'kickout') {
      setView('flow'); // returns to step 4 with nothing selected
      return;
    }
    setStep((s) => Math.max(1, s - 1));
  };

  const pickPath = (id: PathId) =>
    flashThen(() => setAnswers((a) => ({ ...a, path: id })), () => goTo(2));

  const pickProcess = (v: string) =>
    flashThen(() => setAnswers((a) => ({ ...a, process: v })), () => goTo(3));

  const pickPropertyType = (v: string) =>
    flashThen(() => setAnswers((a) => ({ ...a, propertyType: v })), () => goTo(4));

  const pickCredit = (opt: CreditOption) => {
    if (opt.kickOut) {
      // Nothing is stored and no lead is recorded on kick-out.
      flashThen(
        () => setCreditFlash(opt.id),
        () => {
          setCreditFlash(null);
          setKickoutKind('credit');
          setDir(1);
          setView('kickout');
          // The <620 dead-end, finally counted (it was invisible in GA4).
          track('credit_kickout', { surface });
        },
      );
      return;
    }
    flashThen(() => setAnswers((a) => ({ ...a, credit: opt.id })), () => goTo(5));
  };

  const pickPrice = (value: number) =>
    flashThen(() => setAnswers((a) => ({ ...a, price: value })), () => goTo(6));

  const pickFork = (v: string) =>
    flashThen(() => setAnswers((a) => ({ ...a, fork: v })), () => goTo(7));

  // State step: with a host `lead` config, NY MI ND SD UT stop here (the network
  // has nobody to route them to; the API would default them to broker_a). The
  // state is accepted as typed; Back returns to this step with it still filled.
  const continueFromLocation = () => {
    if (lead && !isCoveredState(stateCodeFor(answers.location))) {
      setKickoutKind('state');
      setDir(1);
      setView('kickout');
      // NY/MI/ND/SD/UT dead-end counted, with which state got turned away.
      track('state_kickout', { surface, state: answers.location ?? '' });
      return;
    }
    goTo(8);
  };

  const submit = async () => {
    if (!lead || lead.delivery !== 'live') {
      recordTestLead(embedded ? EMBEDDED_TEMPLATE_ID : TEMPLATE_ID, answers);
      setDir(1);
      setView('success');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const tracking = trackingRef.current ?? captureTracking();
    const built = buildLeadPayload(answers, {
      consentAt: consentAtRef.current,
      tracking,
      leadSource: lead.leadSource,
      honeypot,
      startedAt: startedAtRef.current,
    });
    const result = await submitLiveLead(built.payload);
    if (result.ok) {
      persistSubmission(built, result.assignedBroker);
      // Beacon transport: these race the navigation to /thank-you/. Funnel
      // event fires on demo walks too (DebugView shows the full funnel);
      // generate_lead is the GA4 key event and is demo-suppressed, same rule
      // as the Ads conversion on /thank-you/.
      const common = {
        surface,
        loan_goal: answers.path ?? 'buy',
        state: answers.location ?? '',
      };
      trackBeacon('form_complete', common);
      if (!tracking.demo) {
        trackBeacon('generate_lead', {
          ...common,
          lead_source: String(built.payload.lead_source ?? ''),
        });
      }
      window.location.assign(thankYouUrl(lead.thankYouPath, tracking.demo));
      return; // keep the button in its sending state while the page unloads
    }
    setSubmitting(false);
    setSubmitError(lead.failed);
  };

  const path: PathId = answers.path ?? 'buy';
  const kickoutCopy: KickoutCopy =
    kickoutKind === 'state' && lead ? notCoveredCopy(lead, answers.location) : KICKOUT;
  const milestone = view === 'success' ? 3 : step <= 3 ? 0 : step <= 5 ? 1 : step <= 7 ? 2 : 3;
  // Out of 10 so the bar only reads 100% once the lead is actually submitted.
  const progress = view === 'success' ? 100 : Math.round((step / 10) * 100);
  const announce =
    view === 'kickout'
      ? kickoutCopy.headline
      : view === 'success'
        ? "You're matched."
        : `Step ${step} of 9. ${questionFor(step, path)}`;
  const viewKey = view === 'flow' ? `step-${step}` : view;

  const variants: Variants = {
    enter: (d: number) => ({ x: reduce ? 0 : d > 0 ? 72 : -72, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d > 0 ? -72 : 72, opacity: 0 }),
  };

  let content: ReactNode;
  if (view === 'kickout') {
    content = <KickoutScreen onBack={back} copy={kickoutCopy} />;
  } else if (view === 'success') {
    content = <SuccessScreen answers={answers} />;
  } else {
    switch (step) {
      case 1:
        content = <StepPath selected={answers.path} onPick={pickPath} />;
        break;
      case 2:
        content = <StepProcess path={path} selected={answers.process} onPick={pickProcess} onBack={back} />;
        break;
      case 3:
        content = (
          <StepProperty
            propertyType={answers.propertyType}
            onPickType={pickPropertyType}
            onBack={back}
          />
        );
        break;
      case 4:
        content = <StepCredit selected={answers.credit ?? creditFlash ?? undefined} onPick={pickCredit} onBack={back} />;
        break;
      case 5:
        content = <StepPrice path={path} selected={answers.price} onPick={pickPrice} onBack={back} />;
        break;
      case 6:
        content = (
          <StepFork
            path={path}
            selected={answers.fork}
            price={answers.price}
            onPick={pickFork}
            onBack={back}
          />
        );
        break;
      case 7:
        content = (
          <StepLocation
            path={path}
            value={answers.location ?? ''}
            onChange={(v) => setAnswers((a) => ({ ...a, location: v }))}
            onContinue={continueFromLocation}
            onBack={back}
          />
        );
        break;
      case 8:
        content = (
          <StepContact
            firstName={answers.firstName ?? ''}
            lastName={answers.lastName ?? ''}
            email={answers.email ?? ''}
            onPatch={(patch) => setAnswers((a) => ({ ...a, ...patch }))}
            onContinue={() => goTo(9)}
            onBack={back}
          />
        );
        break;
      default:
        content = (
          <StepPhone
            phone={answers.phone ?? ''}
            consent={consent}
            honeypot={honeypot}
            onPhoneChange={(v) => setAnswers((a) => ({ ...a, phone: v }))}
            onConsentChange={changeConsent}
            onHoneypotChange={setHoneypot}
            onSubmit={submit}
            onBack={back}
            busy={submitting}
            busyLabel={lead?.sendingLabel}
            error={submitError}
          />
        );
    }
  }

  // Two <main> landmarks on one page is invalid HTML, so the embedded stage is a div.
  const Stage = embedded ? 'div' : 'main';

  return (
    <FormV3Ctx.Provider value={ctx}>
      <div
        className={
          embedded
            ? 'fv3-root fv3-embedded flex flex-col overflow-x-clip'
            : 'fv3-root flex min-h-dvh flex-col overflow-x-clip'
        }
      >
        <style>{CSS_TEXT}</style>

        {embedded ? null : (
          <>
            {/* Utility bar */}
            <div className="fv3-band px-3 py-1.5 text-center">
              <p className="fv3-t-soft text-[11px] sm:text-xs">
                DSCRBroker.com is a matching service, not a lender or government agency
              </p>
            </div>

            {/* Header */}
            <header className="mx-auto flex w-full max-w-6xl items-start justify-between gap-6 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-[22px] font-black leading-[1.12] tracking-[-0.008em] sm:text-2xl">
                  DSCRBroker.com
                </p>
                <p className="fv3-t-soft mt-1 text-[11px] sm:text-xs">
                  An Independent DSCR Broker Network
                </p>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-sm font-bold">DSCR Loans for Real Estate Investors</p>
                <p className="fv3-t-soft mt-0.5 text-xs">
                  Qualify on rental income · No tax returns · 620+ credit
                </p>
              </div>
            </header>
          </>
        )}

        {/* Progress + milestone stepper. Hidden on step 1 (the buy/refi/flip picker
            reads as a single clean question, Tanner 2026-10-10); slides in alongside
            the form's slide to step 2, same duration as the step transition. */}
        <AnimatePresence initial={false}>
          {!(view === 'flow' && step === 1) && (
            <motion.div
              key="fv3-progress"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0.15 : 0.3, ease: 'easeOut' }}
              className="mx-auto w-full max-w-3xl overflow-hidden px-4 sm:px-6"
            >
              <div
                className="fv3-progress-track h-1.5 overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Eligibility check progress"
              >
                <div
                  className="fv3-progress-fill h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-4 sm:mt-5">
                <MilestoneStepper current={milestone} allDone={view === 'success'} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage */}
        <Stage
          className={
            'mx-auto w-full max-w-4xl flex-1 px-4 pt-7 sm:px-6 sm:pt-10 ' +
            (embedded ? 'pb-2' : 'pb-16')
          }
        >
          <p className="sr-only" aria-live="polite">
            {announce}
          </p>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={viewKey}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0.15 : 0.3, ease: 'easeOut' }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </Stage>

        {embedded ? null : (
          /* Trust strip */
          <footer className="fv3-band">
            <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 px-4 py-5 sm:py-6">
              {TRUST.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <Icon size={28} strokeWidth={1.5} className="fv3-t" aria-hidden="true" />
                  <span className="fv3-t-90 text-[11px] font-medium sm:text-sm">{label}</span>
                </div>
              ))}
            </div>
          </footer>
        )}
      </div>
    </FormV3Ctx.Provider>
  );
}

const CSS_TEXT = `
/* Theme defaults: today's computed standalone values. A host page overrides
   these on .fv3-root (higher specificity, outside any layer). */
.fv3-root {
  --fv3-font-body: 'Roboto', 'Inter', system-ui, sans-serif;
  --fv3-font-display: var(--fv3-font-body);
  --fv3-stage-bg: radial-gradient(140% 110% at 50% 12%, #1E6FD9 48%, #1B65C7 78%, #15529E 100%);
  --fv3-band: #14509E;
  --fv3-text: #ffffff;
  --fv3-text-soft: rgba(255, 255, 255, 0.85);
  --fv3-text-muted: rgba(255, 255, 255, 0.7);
  --fv3-focus: #ffffff;
  --fv3-action: #FFC72C;
  --fv3-action-hover: #FFD34F;
  --fv3-action-active: #F0B71D;
  --fv3-action-selected: #F2B90D;
  --fv3-action-text: #111111;
  --fv3-action-disabled: #F7DC8A;
  --fv3-action-disabled-text: rgba(17, 17, 17, 0.45);
  --fv3-action-shadow-edge: rgba(122, 84, 0, 0.35);
  --fv3-action-shadow-drop: rgba(9, 36, 74, 0.18);
  --fv3-action-inset: rgba(90, 60, 0, 0.25);
  --fv3-mile-pulse: rgba(255, 255, 255, 0.55);
  --fv3-slider-thumb-shadow: rgba(9, 36, 74, 0.35);
  --fv3-success-disc-bg: #ffffff;
  --fv3-success-disc-shadow: rgba(9, 36, 74, 0.35);
  --fv3-art-paper: #ffffff;
  --fv3-art-leaf: #BFE3CF;
  --fv3-progress-track: rgba(255, 255, 255, 0.2);
  --fv3-progress-fill: var(--fv3-action);
  --fv3-mile-done-bg: #ffffff;
  --fv3-mile-check: #1E6FD9;
  --fv3-mile-line-on: #ffffff;
  --fv3-mile-line-off: rgba(255, 255, 255, 0.3);
  --fv3-mile-ring: #ffffff;
  --fv3-mile-ring-off: rgba(255, 255, 255, 0.4);
  --fv3-card-bg: #ffffff;
  --fv3-card-text: #0B1120;
  --fv3-card-key: #1E6FD9;
  --fv3-card-border-hover: #1E6FD9;
  --fv3-card-shadow: rgba(9, 36, 74, 0.22);
  --fv3-art-stroke: #1D5BAD;
  --fv3-art-backdrop: #DCEBFB;
  --fv3-art-fill: #BBD7F5;
  --fv3-art-accent: #FFC72C;
  --fv3-input-bg: #ffffff;
  --fv3-input-text: #0B1120;
  --fv3-input-placeholder: #94918A;
  --fv3-input-border: #ffffff;
  --fv3-input-focus: var(--fv3-action);
  --fv3-input-focus-ring: rgba(255, 199, 44, 0.45);
  --fv3-input-shadow: rgba(9, 36, 74, 0.18);
  --fv3-list-bg: #ffffff;
  --fv3-list-text: #14509E;
  --fv3-list-hl-bg: #FFF3C9;
  --fv3-list-hl-text: #0B2A5C;
  --fv3-list-shadow: rgba(9, 36, 74, 0.38);
  --fv3-slider-track-off: rgba(255, 255, 255, 0.25);
  --fv3-slider-thumb-ring: #ffffff;
  --fv3-checkbox-border: #ffffff;
  --fv3-checkbox-bg: rgba(255, 255, 255, 0.14);
  --fv3-checkbox-checked: var(--fv3-action);
  --fv3-checkbox-check: #111111;
  --fv3-ghost-border: rgba(255, 255, 255, 0.45);
  --fv3-ghost-text: #ffffff;
  --fv3-ghost-hover: rgba(255, 255, 255, 0.12);
  --fv3-success-check: #1E6FD9;
  --fv3-rays: #ffffff;
  --fv3-secure-ok: oklch(62.7% 0.194 149.214);
  --fv3-secure-idle: #94918A;
  --fv3-pill-border: rgba(255, 255, 255, 0.5);
}
.fv3-root.fv3-embedded { --fv3-stage-bg: transparent; }

.fv3-root {
  font-family: var(--fv3-font-body);
  background: var(--fv3-stage-bg);
  color: var(--fv3-text);
}
.fv3-band { background: var(--fv3-band); }
.fv3-display { font-family: var(--fv3-font-display); }

/* Text tints: the listed opacities derive from --fv3-text so a retint carries through. */
.fv3-t { color: var(--fv3-text); }
.fv3-t-95 { color: color-mix(in srgb, var(--fv3-text) 95%, transparent); }
.fv3-t-90 { color: color-mix(in srgb, var(--fv3-text) 90%, transparent); }
.fv3-t-soft { color: var(--fv3-text-soft); }
.fv3-t-80 { color: color-mix(in srgb, var(--fv3-text) 80%, transparent); }
.fv3-t-muted { color: var(--fv3-text-muted); }
.fv3-t-60 { color: color-mix(in srgb, var(--fv3-text) 60%, transparent); }

.fv3-root :focus-visible {
  outline: 3px solid var(--fv3-focus);
  outline-offset: 2px;
}

/* Progress bar */
.fv3-progress-track { background: var(--fv3-progress-track); }
.fv3-progress-fill { background: var(--fv3-progress-fill); }

/* Milestone stepper */
.fv3-mile-line-on { background: var(--fv3-mile-line-on); }
.fv3-mile-line-off { background: var(--fv3-mile-line-off); }
.fv3-mile-done { background: var(--fv3-mile-done-bg); }
.fv3-mile-ring { border: 2px solid var(--fv3-mile-ring); }
.fv3-mile-ring-off { border: 2px solid var(--fv3-mile-ring-off); }
.fv3-mile-dot { background: var(--fv3-mile-ring); }

/* Action option buttons */
.fv3-opt {
  min-height: 58px;
  width: 100%;
  border-radius: 8px;
  background: var(--fv3-action);
  color: var(--fv3-action-text);
  font-weight: 700;
  font-size: 17px;
  line-height: 1.25;
  padding: 12px 20px;
  cursor: pointer;
  box-shadow: 0 3px 0 var(--fv3-action-shadow-edge), 0 10px 18px var(--fv3-action-shadow-drop);
  transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.fv3-opt:hover { background: var(--fv3-action-hover); transform: translateY(-1px); }
.fv3-opt:active {
  background: var(--fv3-action-active);
  transform: translateY(2px);
  box-shadow:
    0 1px 0 var(--fv3-action-shadow-edge),
    0 4px 8px color-mix(in srgb, var(--fv3-action-shadow-drop) 83%, transparent);
}
.fv3-opt-selected,
.fv3-opt-selected:hover {
  background: var(--fv3-action-selected);
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 4px var(--fv3-action-inset),
    0 1px 0 color-mix(in srgb, var(--fv3-action-shadow-edge) 86%, transparent);
}

/* Big CTA variant */
.fv3-cta {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 900;
  font-size: 18px;
}
.fv3-cta:disabled {
  background: var(--fv3-action-disabled);
  color: var(--fv3-action-disabled-text);
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}

/* Ghost back button */
.fv3-ghost {
  min-height: 44px;
  padding: 10px 24px;
  border-radius: 8px;
  border: 1px solid var(--fv3-ghost-border);
  color: var(--fv3-ghost-text);
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.fv3-ghost:hover { background: var(--fv3-ghost-hover); }

/* Step 1 cards */
.fv3-card {
  background: var(--fv3-card-bg);
  border-radius: 14px;
  border: 2px solid transparent;
  cursor: pointer;
  box-shadow: 0 10px 24px var(--fv3-card-shadow);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.fv3-card:hover {
  transform: translateY(-4px);
  border-color: var(--fv3-card-border-hover);
  /* Two stacked copies compose to the original hover alpha (0.22 + 0.077 -> 0.28). */
  box-shadow:
    0 16px 32px var(--fv3-card-shadow),
    0 16px 32px color-mix(in srgb, var(--fv3-card-shadow) 35%, transparent);
}
.fv3-card-selected,
.fv3-card-selected:hover {
  transform: translateY(-2px) scale(0.99);
  border-color: var(--fv3-card-border-hover);
}
.fv3-card-text { color: var(--fv3-card-text); }
.fv3-card-key { color: var(--fv3-card-key); }

/* Inputs */
.fv3-input {
  height: 58px;
  border-radius: 10px;
  background: var(--fv3-input-bg);
  color: var(--fv3-input-text);
  font-size: 17px;
  font-weight: 500;
  padding: 0 16px;
  border: 2px solid var(--fv3-input-border);
  box-shadow: 0 6px 14px var(--fv3-input-shadow);
}
.fv3-input::placeholder { color: var(--fv3-input-placeholder); font-weight: 400; }
.fv3-input:focus,
.fv3-input:focus-visible {
  outline: none;
  border-color: var(--fv3-input-focus);
  box-shadow: 0 0 0 3px var(--fv3-input-focus-ring), 0 6px 14px var(--fv3-input-shadow);
}
.fv3-secure-idle { color: var(--fv3-secure-idle); }
.fv3-secure-ok { color: var(--fv3-secure-ok); }

/* State combobox list */
.fv3-list {
  background: var(--fv3-list-bg);
  box-shadow: 0 16px 34px var(--fv3-list-shadow);
}
.fv3-list-item { color: var(--fv3-list-text); }
.fv3-list-hl { background: var(--fv3-list-hl-bg); color: var(--fv3-list-hl-text); }

/* Slider: action fill on a translucent track, action thumb with a ring */
.fv3-slider {
  -webkit-appearance: none;
  appearance: none;
  display: block;
  width: 100%;
  height: 44px;
  margin: 0;
  background: transparent;
  cursor: pointer;
  --fv3-fill: 50%;
}
.fv3-slider::-webkit-slider-runnable-track {
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--fv3-action) var(--fv3-fill),
    var(--fv3-slider-track-off) var(--fv3-fill)
  );
}
.fv3-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  margin-top: -9px;
  border-radius: 50%;
  background: var(--fv3-action);
  border: 4px solid var(--fv3-slider-thumb-ring);
  box-shadow: 0 3px 8px var(--fv3-slider-thumb-shadow);
}
.fv3-slider::-moz-range-track {
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--fv3-action) var(--fv3-fill),
    var(--fv3-slider-track-off) var(--fv3-fill)
  );
}
.fv3-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--fv3-action);
  border: 4px solid var(--fv3-slider-thumb-ring);
  box-shadow: 0 3px 8px var(--fv3-slider-thumb-shadow);
}
.fv3-slider:focus-visible {
  outline: 3px solid var(--fv3-focus);
  outline-offset: 4px;
}

/* Consent checkbox. The check is a clipped box, not a data-URI: url() cannot read a variable. */
.fv3-checkbox {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  width: 22px;
  height: 22px;
  min-width: 22px;
  margin-top: 1px;
  border-radius: 5px;
  border: 2px solid var(--fv3-checkbox-border);
  background: var(--fv3-checkbox-bg);
  cursor: pointer;
}
.fv3-checkbox:checked {
  background-color: var(--fv3-checkbox-checked);
  border-color: var(--fv3-checkbox-checked);
}
.fv3-checkbox:checked::before {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 13px;
  height: 13px;
  background: var(--fv3-checkbox-check);
  clip-path: polygon(14% 46%, 0% 62%, 40% 100%, 100% 20%, 84% 6%, 38% 68%);
}

/* Current milestone pulse */
@keyframes fv3-pulse {
  0% { box-shadow: 0 0 0 0 var(--fv3-mile-pulse); }
  70% { box-shadow: 0 0 0 9px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}
.fv3-mile-active { animation: fv3-pulse 2s ease-out infinite; }

/* Success burst */
@keyframes fv3-burst {
  0% { transform: scale(0.35); opacity: 0; }
  40% { opacity: 1; }
  100% { transform: scale(1.22); opacity: 0; }
}
.fv3-rays {
  opacity: 0;
  transform-origin: center;
  animation: fv3-burst 0.7s ease-out 0.12s forwards;
}
@keyframes fv3-pop {
  from { transform: scale(0.3); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.fv3-check-pop { animation: fv3-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.fv3-success-disc {
  background: var(--fv3-success-disc-bg);
  box-shadow: 0 10px 28px var(--fv3-success-disc-shadow);
}
.fv3-pill {
  border: 1px solid var(--fv3-pill-border);
  color: var(--fv3-text);
}

@media (prefers-reduced-motion: reduce) {
  .fv3-mile-active, .fv3-rays, .fv3-check-pop { animation: none; }
  .fv3-opt, .fv3-card, .fv3-ghost { transition: none; }
}
`;
