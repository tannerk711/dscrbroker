import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COPY,
  CONSENT_TEXT,
  CREDIT_BANDS,
  CURRENT_LOAN,
  DOWN_PAYMENTS,
  EMPTY_ANSWERS,
  FUNDS_SOURCES,
  GOAL_OPTIONS,
  MATCH_SOURCE,
  OWNED_SINCE,
  PROPERTY_TYPES,
  QA_KEY,
  RENTALS_PURCHASE,
  RENTALS_REFI,
  RENTAL_USE_PURCHASE,
  RENTAL_USE_REFI,
  RESIDENCY,
  ROUGH_RATIO_NOTE,
  SESSION_KEY,
  STAGE_PURCHASE,
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
  VESTING,
  chipsOf,
  dealSummaryOf,
  defaultRentBasis,
  downPaymentDollars,
  findStates,
  flagsOf,
  fmtUSD,
  isHighLtv,
  isPurchase,
  label,
  leadGradeOf,
  loanGoalOf,
  numberLabels,
  refinanceTypeOf,
  roughRatioOf,
  type Answers,
  type MatchState,
  type Opt,
  type RentBasis,
  type ThankYouRecord,
} from '../../data/matchForm';
import { STATE_NAMES, getBrokerForState, getDeviceType } from '../../utils/brokerRouting';

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

type StepId =
  | 'goal'
  | 'state'
  | 'rental'
  | 'stage'
  | 'property'
  | 'credit'
  | 'numbers'
  | 'rentals'
  | 'vesting'
  | 'contact'
  | 'phone';

const STEPS: StepId[] = [
  'goal',
  'state',
  'rental',
  'stage',
  'property',
  'credit',
  'numbers',
  'rentals',
  'vesting',
  'contact',
  'phone',
];

type StopKind = 'excluded' | 'primary' | 'commercial' | 'manufactured' | 'credit' | 'under15';

const track = (event: string, data: Record<string, unknown> = {}) => {
  try {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({ event, ...data });
  } catch {
    /* no-op */
  }
};

// The desktop call sheet (outside the island) listens for these.
const sheet = (row: string, value: string) => {
  try {
    window.dispatchEvent(new CustomEvent('match:sheet', { detail: { row, value } }));
  } catch {
    /* no-op */
  }
};

const digitsOnly = (s: string) => s.replace(/\D/g, '');
const parseMoney = (s: string): number | null => {
  const d = digitsOnly(s).slice(0, 8);
  return d ? Number(d) : null;
};
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

const formatUsPhone = (raw: string) => {
  let d = digitsOnly(raw);
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const formatIntlPhone = (raw: string) => {
  const plus = raw.trim().startsWith('+') ? '+' : '';
  return plus + digitsOnly(raw).slice(0, 15);
};

// ------------------------------------------------------------------
// module-scope sub-components (defining these inside the form would give
// them a new identity every render and remount inputs mid-typing)
// ------------------------------------------------------------------

const Arrow = () => (
  <svg className="m-opt-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

const OptionList = ({
  options,
  selected,
  onPick,
  twoColFrom640 = false,
}: {
  options: ReadonlyArray<Opt>;
  selected: string;
  onPick: (value: string) => void;
  twoColFrom640?: boolean;
}) => (
  <div className={twoColFrom640 ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'grid grid-cols-1 gap-2.5'}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onPick(o.value)}
        className={`m-opt${o.muted ? ' is-muted' : ''}${selected === o.value ? ' is-selected' : ''}${
          twoColFrom640 && o.muted ? ' sm:col-span-2' : ''
        }`}
      >
        <span>{o.label}</span>
        <Arrow />
      </button>
    ))}
  </div>
);

const PillRow = ({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<Opt>;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) => (
  <div className="m-pill-row" role="group" aria-label={ariaLabel}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        className={`m-pill${value === o.value ? ' is-on' : ''}`}
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Reveal = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="m-fade-in mt-4">
    <div className="m-label mb-2">{title}</div>
    {children}
  </div>
);

const Note = ({ text }: { text: string }) => <p className="m-note m-fade-in mt-3">{text}</p>;

const ContinueBtn = ({ onClick, label: l = COPY.titles.continue }: { onClick: () => void; label?: string }) => (
  <button type="button" onClick={onClick} className="m-btn mt-5">
    {l}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  </button>
);

const CurrencyInput = ({
  id,
  label: l,
  value,
  onChange,
  autoFocus,
  disabled,
  aside,
  placeholder = '0',
  onEnter,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  aside?: React.ReactNode;
  placeholder?: string;
  onEnter?: () => void;
}) => (
  <div>
    <label htmlFor={id} className="m-field-label">
      <span>{l}</span>
      {aside}
    </label>
    <div className="m-input-prefix">
      <span aria-hidden>$</span>
      <input
        id={id}
        className="m-input m-num"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value == null ? '' : value.toLocaleString('en-US')}
        onChange={(e) => onChange(parseMoney(e.target.value))}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        autoFocus={autoFocus}
        disabled={disabled}
      />
    </div>
  </div>
);

const SoftStop = ({
  title,
  body,
  link,
  onBack,
}: {
  title: string;
  body: string;
  link: string;
  onBack: () => void;
}) => (
  <div className="m-rise py-2">
    <h2 className="m-step-title">{title}</h2>
    <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{body}</p>
    <button type="button" onClick={onBack} className="m-link mt-5 text-[14px] font-medium">
      {link}
    </button>
  </div>
);

// ------------------------------------------------------------------
// the form
// ------------------------------------------------------------------

export default function MatchForm() {
  const [a, setA] = useState<Answers>(EMPTY_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [stop, setStop] = useState<StopKind | null>(null);
  const [stopState, setStopState] = useState<string>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [consent, setConsent] = useState(false);
  const [stateQuery, setStateQuery] = useState('');
  const [showResidency, setShowResidency] = useState(false);
  const [pendingSelect, setPendingSelect] = useState('');

  const consentAt = useRef<string | null>(null);
  const startedAt = useRef(0);
  const attribution = useRef<Record<string, string>>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const navLock = useRef(0);
  const pickLock = useRef(false);
  const inFlight = useRef(false);
  // One id per form instance, NOT per attempt: a retry after a lost response must
  // carry the same submissionId so the Zap/CRM can dedupe the two webhooks.
  const submissionId = useRef('');
  const residencyPreset = useRef(false);
  const stateInputRef = useRef<HTMLInputElement>(null);

  const step = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const purchase = isPurchase(a);
  const refiType = refinanceTypeOf(a);

  // attribution + QA flag, once
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const keep = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid'];
      const found: Record<string, string> = {};
      keep.forEach((k) => {
        const v = p.get(k) || sessionStorage.getItem(`match_attr_${k}`) || '';
        if (v) {
          found[k] = v;
          sessionStorage.setItem(`match_attr_${k}`, v);
        }
      });
      attribution.current = found;
      if (p.get('demo') === '1' || p.get('qa') === '1') sessionStorage.setItem(QA_KEY, '1');
    } catch {
      /* no-op */
    }
  }, []);

  // focus the state field on entry
  useEffect(() => {
    if (step === 'state' && !stop) {
      const t = window.setTimeout(() => stateInputRef.current?.focus(), 220);
      return () => window.clearTimeout(t);
    }
  }, [step, stop]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setA((prev) => ({ ...prev, [key]: value }));

  const start = () => {
    if (!startedAt.current) {
      startedAt.current = Date.now();
      track('funnel_start');
      try {
        window.dispatchEvent(new CustomEvent('match:start'));
      } catch {
        /* no-op */
      }
    }
  };

  const go = (dir: 'fwd' | 'back') => {
    const now = Date.now();
    if (now - navLock.current < 350) return;
    navLock.current = now;
    setError('');
    setSubmitError(false);
    setDirection(dir);
    setPendingSelect('');
    setStepIndex((i) => Math.min(STEPS.length - 1, Math.max(0, i + (dir === 'fwd' ? 1 : -1))));
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };

  /** tap an option: show selected 120ms, advance after 180ms (double-tap safe) */
  const pick = (stepId: string, value: string, apply: () => void, advance = true) => {
    if (pickLock.current) return;
    pickLock.current = true;
    start();
    apply();
    setPendingSelect(value);
    track('funnel_step', { step: stepId, value });
    window.setTimeout(() => {
      if (advance) go('fwd');
      pickLock.current = false;
    }, 180);
  };

  const openStop = (kind: StopKind, stateName = '') => {
    // A pending pick's 180ms advance must never fire underneath a stop (fat-finger
    // second tap inside the lockout window would strand the user past a screen).
    if (pickLock.current) return;
    start();
    track('funnel_stop', { reason: kind });
    setStopState(stateName);
    setStop(kind);
  };

  // ----------------------------------------------------------------
  // step handlers
  // ----------------------------------------------------------------

  const pickGoal = (v: string) =>
    pick('goal', v, () => {
      setA((prev) => ({
        ...prev,
        goal: v as Answers['goal'],
        rentalUse: '',
        stage: '',
        ownedSince: '',
        currentLoanType: '',
        rentalsOwned: '',
        ownsPrimary: null,
        switchedToCashOut: false,
        freeAndClear: false,
        cashOutWanted: null,
        downPayment: '',
        fundsSource: '',
        stretchedTo20: false,
      }));
      sheet('goal', label(GOAL_OPTIONS, v));
    });

  const pickState = (s: MatchState) => {
    if (s.excluded) {
      openStop('excluded', s.name);
      return;
    }
    pick('state', s.code, () => {
      setA((prev) => ({ ...prev, stateCode: s.code, stateName: s.name }));
      sheet('state', s.name);
    });
  };

  const pickRental = (v: string) => {
    if (v === 'primary') {
      openStop('primary');
      return;
    }
    const opts = purchase ? RENTAL_USE_PURCHASE : RENTAL_USE_REFI;
    pick(
      'rental',
      v,
      () => {
        setA((prev) => ({ ...prev, rentalUse: v, rentBasis: defaultRentBasis({ ...prev, rentalUse: v }) }));
        sheet('rental', label(opts, v));
        if (v === 'needsWork') track('funnel_note', { note: 'needsWork' });
      },
      v !== 'needsWork'
    );
  };

  const pickStage = (v: string) => {
    if (purchase) {
      pick('stage', v, () => {
        set('stage', v);
        sheet('stage', label(STAGE_PURCHASE, v));
      });
    } else if (a.goal === 'cashOut') {
      pick('ownedSince', v, () => {
        set('ownedSince', v);
        sheet('stage', `Bought ${label(OWNED_SINCE, v).toLowerCase()} ago`);
      });
    } else {
      pick('currentLoan', v, () => {
        set('currentLoanType', v);
        sheet('stage', label(CURRENT_LOAN, v));
      });
    }
  };

  const pickProperty = (v: string) => {
    if (v === 'commercial' || v === 'manufactured') {
      openStop(v);
      return;
    }
    pick('property', v, () => {
      set('propertyType', v);
      sheet('property', label(PROPERTY_TYPES, v));
    });
  };

  const pickCredit = (v: string) => {
    if (v === 'under_620') {
      openStop('credit');
      return;
    }
    pick('credit', v, () => {
      setA((prev) => {
        const next: Answers = { ...prev, creditScore: v };
        if (v === 'no_us_credit') {
          next.residency = 'foreignNational';
          next.residencyConfirmed = true;
          residencyPreset.current = true;
        } else if (residencyPreset.current) {
          next.residency = 'usCitizenOrPR';
          next.residencyConfirmed = false;
          residencyPreset.current = false;
          // The Non-US toggle disappears with the preset; a stale intl flag would
          // let a 10-digit US number submit as +5555550140.
          next.phoneIsInternational = false;
          next.phone = '';
        }
        return next;
      });
      sheet('credit', label(CREDIT_BANDS, v));
    });
  };

  const pickRentals = (v: string) => {
    const opts = purchase ? RENTALS_PURCHASE : RENTALS_REFI;
    const reveals = v === 'none' || v === 'one';
    pick(
      'rentals',
      v,
      () => {
        setA((prev) => ({ ...prev, rentalsOwned: v, ownsPrimary: null }));
        sheet('rentals', label(opts, v));
      },
      !reveals
    );
  };

  const pickOwnsPrimary = (v: string) => {
    const yes = v === 'yes';
    pick('ownsPrimary', v, () => {
      set('ownsPrimary', yes);
      const opts = purchase ? RENTALS_PURCHASE : RENTALS_REFI;
      sheet('rentals', `${label(opts, a.rentalsOwned)}, ${yes ? 'owns home' : 'rents'}`);
    });
  };

  const pickVesting = (v: string) =>
    pick('vesting', v, () => {
      set('vesting', v);
      sheet('vesting', label(VESTING, v));
    });

  // ----------------------------------------------------------------
  // numbers step
  // ----------------------------------------------------------------

  const labels = useMemo(() => numberLabels(a), [a]);
  const under15Open = purchase && a.downPayment === 'under15';
  const dpDollars = downPaymentDollars(a);

  const pickDown = (v: string) => {
    start();
    setError('');
    setA((prev) => ({ ...prev, downPayment: v, stretchedTo20: false, fundsSource: v === 'under15' ? '' : prev.fundsSource }));
    track('funnel_step', { step: 'downPayment', value: v });
    if (v === '15') track('funnel_note', { note: 'down15' });
  };

  const under15Choice = (choice: 'yes' | 'no') => {
    track('funnel_panel', { choice });
    if (choice === 'yes') {
      setA((prev) => ({ ...prev, downPayment: '20', stretchedTo20: true }));
    } else {
      openStop('under15');
    }
  };

  const toggleFreeAndClear = () => {
    setError('');
    setA((prev) => {
      const next = !prev.freeAndClear;
      const out: Answers = { ...prev, freeAndClear: next, loanBalance: next ? 0 : null };
      if (next && prev.goal === 'rateTerm' && !prev.switchedToCashOut) {
        out.switchedToCashOut = true;
        // currentLoanType is deliberately KEPT: the payload already suppresses it
        // while switched, and un-tapping the pill must restore the user's answer.
        track('funnel_note', { note: 'freeAndClearSwitch' });
      }
      if (!next && prev.switchedToCashOut) {
        out.switchedToCashOut = false;
        out.cashOutWanted = null;
      }
      return out;
    });
  };

  const continueNumbers = () => {
    start();
    if (a.price == null) return setError(labels.priceError);
    if (a.price < 75_000) return setError(COPY.errors.tooLow);
    if (purchase) {
      if (!a.downPayment || a.downPayment === 'under15') return setError(COPY.errors.down);
      if (!a.fundsSource) return setError(COPY.errors.funds);
    } else if (!a.freeAndClear && a.loanBalance == null) {
      return setError(COPY.errors.balance);
    }
    if (a.monthlyRent == null || a.monthlyRent < 200) return setError(COPY.errors.rent);
    track('funnel_step', { step: 'numbers' });
    if (purchase) {
      sheet('money', `${fmtUSD(a.price)}, ${a.downPayment === '30plus' ? '30%+' : a.downPayment + '%'} down`);
    } else {
      sheet('money', `Worth ${fmtUSD(a.price)}, ${a.freeAndClear ? 'free and clear' : 'owes ' + fmtUSD(a.loanBalance)}`);
    }
    sheet('rent', `${fmtUSD(a.monthlyRent)}/mo`);
    go('fwd');
  };

  // ----------------------------------------------------------------
  // contact + submit
  // ----------------------------------------------------------------

  const continueContact = () => {
    if (a.firstName.trim().length < 2 || a.lastName.trim().length < 2) return setError(COPY.errors.name);
    if (!validEmail(a.email)) return setError(COPY.errors.email);
    track('funnel_step', { step: 'contact' });
    go('fwd');
  };

  const showNonUs = a.residency === 'foreignNational' || a.creditScore === 'no_us_credit';
  const phoneDigits = digitsOnly(a.phone);

  const buildPayload = (honeypot: string) => {
    const flags = flagsOf(a);
    const chips = chipsOf(a);
    const grade = leadGradeOf(a, flags);
    const ratio = roughRatioOf(a);
    const dealStage = purchase ? (a.stage.startsWith('underContract') ? 'underContract' : a.stage) : null;
    const timeline = purchase
      ? a.stage === 'underContract30'
        ? 'within30'
        : a.stage === 'underContract'
          ? '30plus'
          : null
      : null;
    const phone = a.phoneIsInternational ? '+' + phoneDigits : '+1' + phoneDigits;
    const utm = attribution.current;
    const rentalOpts = purchase ? RENTAL_USE_PURCHASE : RENTAL_USE_REFI;
    const rentalsOpts = purchase ? RENTALS_PURCHASE : RENTALS_REFI;
    const rentBasisLabel: Record<RentBasis, string> = {
      lease: 'Lease',
      estimate: 'Estimate',
      history: '12-month history',
      projection: 'Projection',
    };

    return {
      // routing + site contract
      matchedBroker: getBrokerForState(a.stateCode),
      state: STATE_NAMES[a.stateCode] || a.stateName,
      stateCode: a.stateCode,
      firstName: a.firstName.trim(),
      lastName: a.lastName.trim(),
      email: a.email.trim().toLowerCase(),
      phone,
      phoneIsInternational: a.phoneIsInternational,
      // deal
      loanGoal: loanGoalOf(a),
      refinanceType: refiType,
      rentalUse: a.rentalUse,
      bridgeCandidate: a.rentalUse === 'needsWork',
      dealStage,
      timeline,
      ownedSince: refiType === 'cashOut' && !a.switchedToCashOut ? a.ownedSince || null : null,
      currentLoanType: refiType === 'rateTerm' ? a.currentLoanType || null : null,
      propertyType: a.propertyType,
      propertyValue: a.price,
      downPayment: purchase ? a.downPayment : null,
      downPaymentDollars: dpDollars,
      fundsSource: purchase ? a.fundsSource : null,
      loanBalance: purchase ? null : a.freeAndClear ? 0 : a.loanBalance,
      freeAndClear: purchase ? null : a.freeAndClear,
      cashOutWanted: refiType === 'cashOut' ? a.cashOutWanted : null,
      monthlyRent: a.monthlyRent,
      rentBasis: a.rentBasis,
      creditScore: a.creditScore,
      rentalsOwned: a.rentalsOwned,
      ownsPrimary: a.ownsPrimary,
      vesting: a.vesting,
      residency: a.residency,
      residencyConfirmed: a.residencyConfirmed,
      flags,
      leadGrade: grade,
      roughRatioTriage: ratio,
      roughRatioNote: ROUGH_RATIO_NOTE,
      dealSummary: dealSummaryOf(a, flags, chips),
      // display-ready labels (the CRM never formats)
      goalLabel: label(GOAL_OPTIONS, a.goal),
      refinanceTypeLabel: refiType === 'cashOut' ? 'Own it, pulling cash out' : refiType === 'rateTerm' ? 'Own it, replacing the loan' : null,
      rentalUseLabel: label(rentalOpts, a.rentalUse),
      dealStageLabel: purchase ? label(STAGE_PURCHASE, a.stage) : null,
      ownedSinceLabel: refiType === 'cashOut' && !a.switchedToCashOut ? label(OWNED_SINCE, a.ownedSince) || null : null,
      currentLoanTypeLabel: refiType === 'rateTerm' ? label(CURRENT_LOAN, a.currentLoanType) || null : null,
      propertyTypeLabel: label(PROPERTY_TYPES, a.propertyType),
      downPaymentLabel: purchase ? label(DOWN_PAYMENTS, a.downPayment) : null,
      fundsSourceLabel: purchase ? label(FUNDS_SOURCES, a.fundsSource) : null,
      rentBasisLabel: rentBasisLabel[a.rentBasis],
      creditLabel: label(CREDIT_BANDS, a.creditScore),
      rentalsOwnedLabel: label(rentalsOpts, a.rentalsOwned),
      ownsPrimaryLabel: a.ownsPrimary == null ? null : a.ownsPrimary ? 'Yes' : 'No',
      vestingLabel: label(VESTING, a.vesting),
      residencyLabel: a.residencyConfirmed
        ? label(RESIDENCY, a.residency)
        : 'US citizen or permanent resident (default, not changed)',
      propertyValueDisplay: fmtUSD(a.price) || null,
      loanBalanceDisplay: purchase ? null : a.freeAndClear ? '$0 (free and clear)' : fmtUSD(a.loanBalance) || null,
      cashOutWantedDisplay: refiType === 'cashOut' ? fmtUSD(a.cashOutWanted) || null : null,
      monthlyRentDisplay: fmtUSD(a.monthlyRent) || null,
      downPaymentDollarsDisplay: dpDollars == null ? null : a.downPayment === '30plus' ? `${fmtUSD(dpDollars)}+` : fmtUSD(dpDollars),
      // attribution (site contract shape) + funnel tag
      funnel: MATCH_SOURCE,
      source: {
        utmSource: utm.utm_source || null,
        utmMedium: utm.utm_medium || null,
        utmCampaign: utm.utm_campaign || null,
        utmTerm: utm.utm_term || null,
        utmContent: utm.utm_content || null,
        gclid: utm.gclid || null,
        fbclid: utm.fbclid || null,
        landingPageUrl: window.location.href,
        deviceType: getDeviceType(),
      },
      // consent record (server stamps clientIp, userAgent, receivedAt)
      consent: {
        agreed: true,
        text: CONSENT_TEXT,
        agreedAt: consentAt.current || new Date().toISOString(),
        url: window.location.href,
      },
      secondsToComplete: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : null,
      website: honeypot,
      partial: false,
      submissionId: submissionId.current,
      submittedAt: new Date().toISOString(),
    };
  };

  const submit = async () => {
    if (inFlight.current) return;
    if (a.phoneIsInternational) {
      if (phoneDigits.length < 8 || phoneDigits.length > 15) return setError(COPY.errors.phoneIntl);
    } else if (phoneDigits.length !== 10) {
      return setError(COPY.errors.phone);
    }
    const required: Array<keyof Answers> = ['goal', 'stateCode', 'rentalUse', 'propertyType', 'creditScore', 'rentalsOwned', 'vesting'];
    if (required.some((k) => !String(a[k]).trim()) || a.price == null || a.monthlyRent == null) {
      return setError(COPY.errors.skipped);
    }
    if (purchase && (!a.downPayment || a.downPayment === 'under15' || !a.fundsSource)) return setError(COPY.errors.skipped);
    if (!purchase && !a.freeAndClear && a.loanBalance == null) return setError(COPY.errors.skipped);
    if (!consent) return setError(COPY.errors.consent);

    const honeypot = (document.getElementById('mf-website') as HTMLInputElement | null)?.value || '';
    if (!submissionId.current) {
      submissionId.current = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(false);
    setError('');

    const payload = buildPayload(honeypot);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json().catch(() => ({}))) as { assignedBroker?: string | null };
      track('lead_submit', { grade: payload.leadGrade });
      const record: ThankYouRecord = {
        firstName: a.firstName.trim(),
        // ONLY the server's assignment: GA is split server-side and the client-side
        // guess can name the wrong licensed human. No assignment = degraded thank-you.
        specialist: honeypot ? null : (data.assignedBroker ?? null),
        state: a.stateName,
        stateCode: a.stateCode,
        chips: chipsOf(a),
        goal: loanGoalOf(a),
        refinanceType: refiType,
        stage: a.stage,
        creditScore: a.creditScore,
        rentalUse: a.rentalUse,
        vesting: a.vesting,
        propertyType: a.propertyType,
        flags: payload.flags,
      };
      // The webhook already fired: the redirect must happen even if storage access
      // throws (blocked cookies, quota). Showing "That didn't send" after a 2xx would
      // solicit a duplicate lead.
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
      } catch {
        /* thank-you handles a missing record */
      }
      window.location.href = '/match/thank-you/';
    } catch {
      inFlight.current = false;
      setSubmitting(false);
      setSubmitError(true);
    }
  };

  // ----------------------------------------------------------------
  // render: titles
  // ----------------------------------------------------------------

  const titles: Record<StepId, string> = {
    goal: COPY.titles.goal,
    state: COPY.titles.state,
    rental: purchase ? COPY.titles.rentalPurchase : COPY.titles.rentalRefi,
    stage: purchase ? COPY.titles.stagePurchase : a.goal === 'cashOut' ? COPY.titles.ownedSince : COPY.titles.currentLoan,
    property: COPY.titles.property,
    credit: COPY.titles.credit,
    numbers: purchase ? COPY.titles.numbersPurchase : COPY.titles.numbersRefi,
    rentals: COPY.titles.rentals,
    vesting: COPY.titles.vesting,
    contact: COPY.titles.contact,
    phone: COPY.titles.phone,
  };

  const stateResults = useMemo(() => findStates(stateQuery), [stateQuery]);

  const renderStop = () => {
    if (!stop) return null;
    const back = () => {
      setStop(null);
      setPendingSelect('');
      if (stop === 'excluded') {
        setStateQuery('');
        setA((prev) => ({ ...prev, stateCode: '', stateName: '' }));
      }
      if (stop === 'under15') setA((prev) => ({ ...prev, downPayment: '', stretchedTo20: false }));
    };
    const s = stop === 'excluded' ? COPY.stops.excluded(stopState) : COPY.stops[stop];
    return <SoftStop title={s.title} body={s.body} link={s.link} onBack={back} />;
  };

  const renderStep = () => {
    switch (step) {
      case 'goal':
        return <OptionList options={GOAL_OPTIONS} selected={pendingSelect} onPick={pickGoal} />;

      case 'state':
        return (
          <div>
            <input
              ref={stateInputRef}
              className="m-input"
              placeholder={COPY.titles.statePlaceholder}
              autoComplete="off"
              autoCapitalize="words"
              value={stateQuery}
              onChange={(e) => setStateQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && stateResults[0]) pickState(stateResults[0]);
              }}
              aria-label="Property state"
            />
            {stateQuery.trim() && (
              <div className="m-fade-in mt-2 overflow-hidden rounded-xl border border-hair bg-card" role="listbox">
                {stateResults.length === 0 ? (
                  <div className="px-4 py-3 text-[14px] text-ink-muted">{COPY.titles.stateEmpty}</div>
                ) : (
                  stateResults.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      role="option"
                      aria-selected={pendingSelect === s.code}
                      onClick={() => pickState(s)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-[16px] font-medium transition-colors hover:bg-linen ${
                        pendingSelect === s.code ? 'bg-clay-tint' : ''
                      }`}
                    >
                      <span>{s.name}</span>
                      <span className="text-[12px] font-semibold text-ink-muted">{s.code}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        );

      case 'rental':
        return (
          <div>
            <OptionList options={purchase ? RENTAL_USE_PURCHASE : RENTAL_USE_REFI} selected={a.rentalUse || pendingSelect} onPick={pickRental} />
            {purchase && a.rentalUse === 'needsWork' && (
              <>
                <Note text={COPY.notes.needsWork} />
                {/* the option tap already tracked funnel_step; tracking here would
                    double-count this step in GA4 */}
                <ContinueBtn onClick={() => go('fwd')} />
              </>
            )}
          </div>
        );

      case 'stage':
        return (
          <OptionList
            options={purchase ? STAGE_PURCHASE : a.goal === 'cashOut' ? OWNED_SINCE : CURRENT_LOAN}
            selected={pendingSelect}
            onPick={pickStage}
          />
        );

      case 'property':
        return <OptionList options={PROPERTY_TYPES} selected={pendingSelect} onPick={pickProperty} twoColFrom640 />;

      case 'credit':
        return <OptionList options={CREDIT_BANDS} selected={pendingSelect} onPick={pickCredit} />;

      case 'numbers': {
        const priceNote = a.price != null && a.price >= 75_000 && a.price < 100_000 ? COPY.notes.priceUnder100k : null;
        const rentToggle =
          labels.toggle === 'leaseEstimate'
            ? [
                { value: 'lease', label: 'Lease' },
                { value: 'estimate', label: 'Estimate' },
              ]
            : labels.toggle === 'historyProjection'
              ? [
                  { value: 'history', label: '12-month history' },
                  { value: 'projection', label: 'Projection' },
                ]
              : null;
        return (
          <div className="grid gap-5">
            {a.creditScore === '620_659' && refiType === 'cashOut' && <p className="m-note">{COPY.notes.credit620sCashOut}</p>}

            <div>
              <CurrencyInput id="mf-price" label={labels.price} value={a.price} onChange={(v) => set('price', v)} autoFocus />
              {priceNote && <Note text={priceNote} />}
            </div>

            {purchase ? (
              <div>
                <div className="m-field-label">
                  <span>{COPY.titles.downLabel}</span>
                </div>
                <PillRow options={DOWN_PAYMENTS} value={a.downPayment} onChange={pickDown} ariaLabel="Down payment" />
                {under15Open ? (
                  <div className="m-panel m-fade-in mt-3">
                    <div className="m-display text-[15px]">{COPY.under15.title}</div>
                    <p className="mt-1.5 text-[13px] leading-relaxed">{COPY.under15.body}</p>
                    <div className="m-pill-row mt-3">
                      <button type="button" className="m-pill" onClick={() => under15Choice('yes')}>
                        {COPY.under15.yes}
                      </button>
                      <button type="button" className="m-pill" onClick={() => under15Choice('no')}>
                        {COPY.under15.no}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {dpDollars != null && (
                      <p className="m-num mt-2 text-[13px] text-ink-muted">
                        = {fmtUSD(dpDollars)}
                        {a.downPayment === '30plus' ? ' or more' : ''}
                        {a.stretchedTo20 ? ' (you said you can get to 20%)' : ''}
                      </p>
                    )}
                    {a.downPayment === '15' && <Note text={COPY.notes.down15} />}
                    {a.downPayment && (
                      <Reveal title={COPY.titles.fundsLabel}>
                        <PillRow
                          options={FUNDS_SOURCES}
                          value={a.fundsSource}
                          onChange={(v) => {
                            setError('');
                            set('fundsSource', v);
                            track('funnel_step', { step: 'fundsSource', value: v });
                          }}
                          ariaLabel="Where the down payment is coming from"
                        />
                      </Reveal>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div>
                  <CurrencyInput
                    id="mf-balance"
                    label={labels.balance}
                    value={a.freeAndClear ? 0 : a.loanBalance}
                    onChange={(v) => set('loanBalance', v)}
                    disabled={a.freeAndClear}
                    aside={
                      <button
                        type="button"
                        className={`m-pill${a.freeAndClear ? ' is-on' : ''}`}
                        onClick={toggleFreeAndClear}
                        aria-pressed={a.freeAndClear}
                      >
                        {COPY.titles.freeAndClear}
                      </button>
                    }
                  />
                  {a.switchedToCashOut && <Note text={COPY.notes.freeAndClearSwitch} />}
                  {isHighLtv(a) && <Note text={COPY.notes.highLtv} />}
                </div>
                {refiType === 'cashOut' && (
                  <CurrencyInput
                    id="mf-cash"
                    label="Cash you're after, roughly"
                    value={a.cashOutWanted}
                    onChange={(v) => set('cashOutWanted', v)}
                    placeholder="optional"
                  />
                )}
              </>
            )}

            <CurrencyInput
              id="mf-rent"
              label={labels.rent}
              value={a.monthlyRent}
              onChange={(v) => set('monthlyRent', v)}
              onEnter={continueNumbers}
              aside={
                rentToggle ? (
                  <span className="m-pill-row" role="group" aria-label="Rent basis">
                    {rentToggle.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        className={`m-pill${a.rentBasis === t.value ? ' is-on' : ''}`}
                        style={{ minHeight: 30, padding: '0 10px', fontSize: 12 }}
                        onClick={() => set('rentBasis', t.value as RentBasis)}
                        aria-pressed={a.rentBasis === t.value}
                      >
                        {t.label}
                      </button>
                    ))}
                  </span>
                ) : undefined
              }
            />

            {error && <p className="m-error -mt-2">{error}</p>}
            <ContinueBtn onClick={continueNumbers} />
          </div>
        );
      }

      case 'rentals': {
        const opts = purchase ? RENTALS_PURCHASE : RENTALS_REFI;
        const reveal = a.rentalsOwned === 'none' || a.rentalsOwned === 'one';
        return (
          <div>
            <OptionList options={opts} selected={a.rentalsOwned || pendingSelect} onPick={pickRentals} />
            {reveal && (
              <Reveal title={COPY.titles.ownsPrimary}>
                <PillRow
                  options={[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ]}
                  value={a.ownsPrimary == null ? '' : a.ownsPrimary ? 'yes' : 'no'}
                  onChange={pickOwnsPrimary}
                  ariaLabel="Do you own the home you live in"
                />
              </Reveal>
            )}
          </div>
        );
      }

      case 'vesting':
        return (
          <div>
            <div className="mb-3 text-[12px] text-ink-muted">
              {showResidency ? (
                <PillRow
                  options={RESIDENCY}
                  value={a.residency}
                  onChange={(v) => {
                    setA((prev) => {
                      const next = { ...prev, residency: v, residencyConfirmed: true };
                      // If the Non-US toggle is no longer offered, a stale intl flag
                      // must not survive into the phone step.
                      if (v !== 'foreignNational' && prev.creditScore !== 'no_us_credit') {
                        next.phoneIsInternational = false;
                        next.phone = '';
                      }
                      return next;
                    });
                    residencyPreset.current = false;
                    setShowResidency(false);
                    track('funnel_step', { step: 'residency', value: v });
                  }}
                  ariaLabel="Residency"
                />
              ) : (
                <>
                  <span>{label(RESIDENCY, a.residency)}</span>
                  <span aria-hidden> · </span>
                  <button type="button" className="m-link font-medium" onClick={() => setShowResidency(true)}>
                    {COPY.titles.residencyChange}
                  </button>
                </>
              )}
            </div>
            {a.residency === 'foreignNational' && <p className="m-note mb-3">{COPY.notes.foreignNational}</p>}
            <OptionList options={VESTING} selected={pendingSelect} onPick={pickVesting} />
          </div>
        );

      case 'contact':
        return (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                className="m-input"
                placeholder="First name"
                autoComplete="given-name"
                value={a.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                autoFocus
                aria-label="First name"
              />
              <input
                className="m-input"
                placeholder="Last name"
                autoComplete="family-name"
                value={a.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                aria-label="Last name"
              />
            </div>
            <input
              className="m-input"
              placeholder="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={a.email}
              onChange={(e) => set('email', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && continueContact()}
              aria-label="Email"
            />
            {error && <p className="m-error">{error}</p>}
            <ContinueBtn onClick={continueContact} />
          </div>
        );

      case 'phone': {
        const chips = chipsOf(a);
        return (
          <div>
            <div className="m-label mb-2">{COPY.titles.recapLabel}</div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span key={c} className="m-recap">
                  {c}
                </span>
              ))}
            </div>
            <p className="mb-3 text-[14px] leading-snug text-ink">{COPY.titles.phoneLine}</p>
            <div className="flex items-stretch gap-2">
              <input
                className="m-input m-num flex-1"
                placeholder={a.phoneIsInternational ? '+44 7700 900123' : '(555) 555-0140'}
                type="tel"
                inputMode="tel"
                autoComplete={a.phoneIsInternational ? 'tel' : 'tel-national'}
                value={a.phone}
                onChange={(e) => set('phone', a.phoneIsInternational ? formatIntlPhone(e.target.value) : formatUsPhone(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoFocus
                aria-label="Phone number"
              />
              {showNonUs && (
                <button
                  type="button"
                  className={`m-pill${a.phoneIsInternational ? ' is-on' : ''}`}
                  aria-pressed={a.phoneIsInternational}
                  onClick={() => setA((prev) => ({ ...prev, phoneIsInternational: !prev.phoneIsInternational, phone: '' }))}
                >
                  {COPY.titles.nonUs}
                </button>
              )}
            </div>
            {error && <p className="m-error mt-2">{error}</p>}
            {submitError && <p className="m-error mt-2">{COPY.errors.network}</p>}

            <label htmlFor="mf-consent" className="m-consent mt-4">
              <input
                id="mf-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  const next = e.target.checked;
                  setConsent(next);
                  consentAt.current = next ? new Date().toISOString() : null;
                  if (next) setError('');
                }}
              />
              <span>
                {CONSENT_TEXT}{' '}
                <a href="/privacy-policy/" className="m-link" target="_blank" rel="noopener">
                  Privacy
                </a>
                {' · '}
                <a href="/terms-of-service/" className="m-link" target="_blank" rel="noopener">
                  Terms
                </a>
              </span>
            </label>

            <button type="button" onClick={submit} disabled={submitting} className="m-btn mt-4">
              {submitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
            </button>
          </div>
        );
      }
    }
  };

  // ----------------------------------------------------------------
  // shell
  // ----------------------------------------------------------------

  const showChip = stepIndex >= 2 && !!a.stateName;

  return (
    <div ref={cardRef}>
      {/* honeypot: humans never see it; lives in the always-mounted shell */}
      <input
        id="mf-website"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-5000px', width: 1, height: 1, opacity: 0 }}
      />

      {/* card header: badge on steps 1-2, state chip from step 3 */}
      <div className="mb-3 flex min-h-[26px] items-center">
        {showChip ? (
          <span key={a.stateCode} className="m-chip m-chip-in">
            <span className="m-dot" aria-hidden />
            {COPY.chip(a.stateName)}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.02em] text-ink">
            <span className="m-dot" aria-hidden />
            {COPY.badge}
          </span>
        )}
      </div>

      <div className="m-progress mb-5" aria-hidden>
        <div style={{ width: `${progress}%` }} />
      </div>

      {stop ? (
        renderStop()
      ) : (
        <div key={`${step}-${direction}`} className={direction === 'fwd' ? 'm-step-fwd' : 'm-step-back'}>
          <h2 className="m-step-title mb-1">
            <span className="sr-only">{`Step ${stepIndex + 1} of ${STEPS.length}: `}</span>
            {titles[step]}
          </h2>
          {step === 'state' ? (
            <p className="mb-4 text-[14px] text-ink-muted">{COPY.titles.stateSub}</p>
          ) : (
            <div className="mb-4" />
          )}
          {renderStep()}
          {error && step !== 'numbers' && step !== 'contact' && step !== 'phone' && <p className="m-error mt-3">{error}</p>}
        </div>
      )}

      {!stop && stepIndex > 0 && (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => go('back')} className="m-link text-[13px] font-medium">
            {COPY.titles.back}
          </button>
        </div>
      )}
    </div>
  );
}
