// ============================================================
// /match/ funnel: every customer-facing word, every option set, and the pure
// helpers that turn answers into recap chips, a lead grade, and a deal summary.
// The React island (components/match/MatchForm.tsx) and the thank-you island
// import from here so copy lives in exactly one place.
//
// Spec: scratchpad match-lp/FINAL-SPEC-v2.md (2026-08-31), built from a 5-concept
// panel + 3 judges + 3 adversarial reviews. Deviations from the spec are noted
// inline with "BUILD CALL".
// ============================================================

import { STATE_NAMES, EXCLUDED_STATES, getBrokerForState } from '../utils/brokerRouting';

export const MATCH_SOURCE = 'dscrbroker-match';
export const GUIDELINES_DATE = 'August 2026';
export const SUBMIT_LABEL = 'Send My Deal to a Specialist';
export const SUBMITTING_LABEL = 'Sending your deal...';
export const STICKY_LABEL_BEFORE = 'Send My Deal';
export const STICKY_LABEL_AFTER = 'Back to your deal';
export const SESSION_KEY = 'match-lead';
export const QA_KEY = 'match_qa';

// ---------- option sets ----------

export interface Opt {
  value: string;
  label: string;
  /** Short form for recap chips / dealSummary. Defaults to label. */
  short?: string;
  /** Muted variant: last option(s) that lead to a stop or a rarer path. */
  muted?: boolean;
}

export const GOAL_OPTIONS: Opt[] = [
  { value: 'purchase', label: 'Buying it', short: 'Purchase' },
  { value: 'cashOut', label: 'Own it, pulling cash out', short: 'Cash-out refi' },
  { value: 'rateTerm', label: 'Own it, replacing the loan', short: 'Rate-and-term refi' },
];

export const RENTAL_USE_PURCHASE: Opt[] = [
  { value: 'longTerm', label: 'Long-term lease' },
  { value: 'shortTerm', label: 'Short-term rental' },
  { value: 'midTerm', label: 'Mid-term or furnished', short: 'Mid-term' },
  { value: 'needsWork', label: 'Needs work first', short: 'Needs work' },
  { value: 'primary', label: "I'll live in all or part of it", muted: true },
];

export const RENTAL_USE_REFI: Opt[] = [
  { value: 'longTerm', label: 'Long-term lease' },
  { value: 'shortTerm', label: 'Short-term rental' },
  { value: 'midTerm', label: 'Mid-term or furnished', short: 'Mid-term' },
  { value: 'vacant', label: 'Vacant right now', short: 'Vacant' },
  { value: 'primary', label: 'I live in all or part of it', muted: true },
];

// BUILD CALL: the spec asked "Under contract yet?" then revealed a close-timing
// pill row. Folding the timing into the options keeps one tap per screen and
// drops a reveal; the two facts that grade the lead (contract + 30-day close)
// are still captured.
export const STAGE_PURCHASE: Opt[] = [
  { value: 'underContract30', label: 'Yes, closing within 30 days', short: 'Under contract, closing within 30 days' },
  { value: 'underContract', label: 'Yes, closing in 30+ days', short: 'Under contract, 30+ days' },
  { value: 'makingOffers', label: 'Making offers' },
  { value: 'looking', label: 'Still looking' },
];

export const OWNED_SINCE: Opt[] = [
  { value: 'under6mo', label: 'Under 6 months', short: 'Bought under 6 months ago' },
  { value: '6to12mo', label: '6 to 12 months', short: 'Bought 6 to 12 months ago' },
  { value: 'over1yr', label: 'Over a year', short: 'Bought over a year ago' },
];

export const CURRENT_LOAN: Opt[] = [
  { value: 'hardMoney', label: 'Hard money or bridge', short: 'Paying off hard money' },
  { value: 'conventional', label: 'Bank or conventional', short: 'Paying off a bank loan' },
  { value: 'dscrOther', label: 'DSCR or other long-term', short: 'Paying off a DSCR loan' },
];

// Values reuse the site's existing propertyType vocabulary where one exists so
// the brokers' Zap -> GHL maps keep reading the same strings.
export const PROPERTY_TYPES: Opt[] = [
  { value: 'single_family', label: 'Single family or townhome', short: 'SFR / townhome' },
  { value: 'condo', label: 'Condo' },
  { value: 'multi_family_small', label: '2 to 4 units' },
  { value: 'multi_family_large', label: '5 to 8 units' },
  { value: 'portfolio', label: 'Portfolio (2+ properties)', short: 'Portfolio' },
  { value: 'commercial', label: 'Commercial or 9+ units', muted: true },
  { value: 'manufactured', label: 'Manufactured or mobile home', muted: true },
];

export const CREDIT_BANDS: Opt[] = [
  { value: '740_plus', label: '740+' },
  { value: '700_739', label: '700 to 739' },
  { value: '660_699', label: '660 to 699' },
  { value: '620_659', label: '620 to 659' },
  { value: 'under_620', label: 'Under 620', muted: true },
  { value: 'no_us_credit', label: 'No US credit yet', short: 'No US credit', muted: true },
];

export const DOWN_PAYMENTS: Opt[] = [
  { value: 'under15', label: 'Under 15%' },
  { value: '15', label: '15%' },
  { value: '20', label: '20%' },
  { value: '25', label: '25%' },
  { value: '30plus', label: '30%+' },
];

export const FUNDS_SOURCES: Opt[] = [
  { value: 'liquid', label: 'In the bank', short: 'in the bank' },
  { value: 'saleOrHeloc', label: 'Coming from a sale or HELOC', short: 'from a sale or HELOC' },
  { value: 'partnerOrGift', label: 'Partner or gift', short: 'partner or gift' },
];

export const RENTALS_PURCHASE: Opt[] = [
  { value: 'none', label: 'None yet' },
  { value: '1to3', label: '1 to 3', short: '1 to 3 rentals' },
  { value: '4to10', label: '4 to 10', short: '4 to 10 rentals' },
  { value: '10plus', label: 'More than 10', short: '10+ rentals' },
];

export const RENTALS_REFI: Opt[] = [
  { value: 'one', label: 'Just this one' },
  { value: '2to3', label: '2 to 3', short: '2 to 3 rentals' },
  { value: '4to10', label: '4 to 10', short: '4 to 10 rentals' },
  { value: '10plus', label: 'More than 10', short: '10+ rentals' },
];

export const VESTING: Opt[] = [
  { value: 'individual', label: 'My name', short: 'Personal name' },
  { value: 'entity', label: 'An LLC or entity', short: 'LLC' },
  { value: 'undecided', label: "Haven't decided", short: 'Vesting undecided' },
];

export const RESIDENCY: Opt[] = [
  { value: 'usCitizenOrPR', label: 'US citizen or permanent resident' },
  { value: 'visa', label: 'Visa holder' },
  { value: 'foreignNational', label: 'Foreign national' },
];

// ---------- states ----------

export interface MatchState {
  code: string;
  name: string;
  excluded: boolean;
  broker: string;
}

export const MATCH_STATES: MatchState[] = Object.entries(STATE_NAMES)
  .map(([code, name]) => ({
    code,
    name: code === 'DC' ? 'Washington, DC' : name,
    excluded: EXCLUDED_STATES.has(code),
    broker: getBrokerForState(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function findStates(query: string, limit = 6): MatchState[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const exactCode = MATCH_STATES.find((s) => s.code.toLowerCase() === q);
  const byName = MATCH_STATES.filter((s) => {
    // DC displays as "Washington, DC" but people also type "district"
    const searchable = s.code === 'DC' ? `${s.name} district of columbia` : s.name;
    const n = searchable.toLowerCase();
    if (n.startsWith(q)) return true;
    // any word prefix: "north" -> the Dakotas + Carolina, "dc" handled by code
    return n.split(/[\s,]+/).some((w) => w.startsWith(q));
  });
  const out: MatchState[] = [];
  if (exactCode) out.push(exactCode);
  for (const s of byName) if (!out.includes(s)) out.push(s);
  return out.slice(0, limit);
}

// ---------- copy ----------

export const COPY = {
  eyebrow: 'Rent qualifies the loan, not your tax returns.',
  h1a: '70+ DSCR lenders.',
  h1b: 'One specialist picks yours.',
  subline:
    "A DSCR specialist who covers your property's state reads your deal, matches it to the lender whose guidelines already fit, then calls or texts you about it.",
  badge: 'About 2 minutes. No SSN. No credit pull.',
  trustLine: 'Free matching service, not a lender.',
  topbarRight: '45 states + DC',
  chip: (state: string) => `Specialist covers ${state}.`,

  titles: {
    goal: 'Buying it, or already own it?',
    state: "Where's the property?",
    stateSub: 'It decides which specialist calls.',
    statePlaceholder: 'State',
    stateEmpty: 'US states and Washington, DC only. Check the spelling?',
    rentalPurchase: 'How will it be rented?',
    rentalRefi: 'How is it rented?',
    stagePurchase: 'Under contract yet?',
    ownedSince: 'When did you buy it?',
    currentLoan: "What's the loan on it now?",
    property: 'What kind of property?',
    credit: 'Ballpark middle credit score?',
    numbersPurchase: 'Price, down payment, rent.',
    numbersRefi: 'Value, balance, rent.',
    rentals: 'How many rentals do you own?',
    ownsPrimary: 'Do you own the home you live in?',
    vesting: 'Closing in your name or an LLC?',
    contact: 'Who should the specialist ask for?',
    phone: 'Last one. Best number for the call or text?',
    recapLabel: "Your deal, as they'll see it:",
    phoneLine:
      'Goes to one specialist, not a lead list. Their name, company, and NMLS number are on the next screen.',
    nonUs: 'Non-US number',
    residencyChange: 'Change',
    fundsLabel: 'That money is:',
    downLabel: 'Down payment',
    freeAndClear: 'Free and clear',
    continue: 'Continue',
    back: 'Back',
  },

  notes: {
    needsWork:
      "DSCR wants it rent-ready. Heavy rehab usually starts as a bridge loan that refinances into DSCR once it's done.",
    credit620sCashOut:
      "At 620 to 659 most lenders don't do cash-out. A few do, at more equity; your specialist knows which.",
    down15: '15% exists at the top credit tier. Most files land at 20 to 25%.',
    priceUnder100k: 'Fewer lenders go this small. Your specialist will tell you straight whether one fits.',
    highLtv:
      "That's above where most DSCR refis top out. Your specialist will say whether the appraisal changes it.",
    freeAndClearSwitch: 'No loan on it means the money coming out is cash-out. Switched you to that.',
    foreignNational:
      'Expect 25 to 35% down and about a year of payments in reserve. A smaller set of lenders does these, and your specialist knows which.',
  },

  under15: {
    title: "Under 15% down, DSCR doesn't reach.",
    body: 'Most programs start at 20%, a few at 15% with top credit. If a HELOC, a sale, or a partner gets you to 20%, keep going.',
    yes: 'I can get to 20%',
    no: 'Not this time',
  },

  errors: {
    price: 'Add the price.',
    offerPrice: 'Add the offer price.',
    targetPrice: 'Add a target price.',
    value: "Add what it's worth today. A rough number is fine.",
    tooLow: "Under $75,000, there's no DSCR program to send it to.",
    down: 'Pick a down payment.',
    funds: "Where's the down payment coming from?",
    balance: "Add what's owed, or tap Free and clear.",
    rent: 'Add the monthly rent. Lease or estimate, either works.',
    name: 'Add your first and last name.',
    email: "That email doesn't look right.",
    phone: 'Enter a 10-digit number.',
    phoneIntl: 'Enter the number with your country code, like +44 7700 900123.',
    consent: 'Check the box so the specialist has your permission to call or text.',
    network: "That didn't send. Tap the button once more.",
    skipped: 'A step got skipped. Use Back to answer it.',
  },

  stops: {
    excluded: (state: string) => ({
      title: `Not in ${state} yet.`,
      body: `The network has no licensed DSCR specialist for ${state} properties. Nothing was sent.`,
      link: 'Property in a different state? Change it.',
    }),
    primary: {
      title: "DSCR is for rentals you don't live in.",
      body: "Live in any part of it and lenders treat it as a primary residence: that's a conventional or FHA loan, not DSCR, and not matched here. Nothing was sent.",
      link: 'Renting all of it out after all? Go back.',
    },
    commercial: {
      title: "Commercial and 9+ units aren't placed here.",
      body: 'The specialists in this network place residential rentals and small multifamily up to 8 units. Nothing was sent.',
      link: "Mixed-use that's mostly residential? Pick the unit count instead.",
    },
    manufactured: {
      title: "Manufactured homes aren't placed here.",
      body: 'Nearly every DSCR program excludes manufactured and mobile homes. Nothing was sent.',
      link: 'Stick-built after all? Go back.',
    },
    credit: {
      title: "Under 620, DSCR lenders won't place it today.",
      body: 'Most start at 640, a few at 620. When your middle score crosses 620, come back. Nothing was sent.',
      link: 'Picked the wrong band? Go back.',
    },
    under15: {
      title: 'Not this deal, then.',
      body: "At under 15% down there's no DSCR program to send it to. When the down payment reaches 20%, the form is here. Nothing was sent.",
      link: 'Picked the wrong number? Go back.',
    },
  },
};

// TCPA consent. Names both brokerages because routing happens after consent and
// the visitor cannot know which company will call. Ships verbatim as the
// consent record's text. The privacy/terms links render beside it, not inside it.
export const CONSENT_TEXT =
  "I agree to be contacted about this deal by the licensed DSCR loan specialist matched to my property's state (Barrett Financial Group, NMLS #181106, or Tall Timbers Realty and Financial Services) and by DSCRBroker.com, by call, text, or email at the number and email I entered, including with automated technology. Consent is not a condition of any purchase or loan. Message and data rates may apply; reply STOP to opt out. Submitting this form does not pull my credit.";

// ---------- answers model ----------

export type RentBasis = 'lease' | 'estimate' | 'history' | 'projection';

export interface Answers {
  goal: '' | 'purchase' | 'cashOut' | 'rateTerm';
  stateCode: string;
  stateName: string;
  rentalUse: string;
  stage: string;
  ownedSince: string;
  currentLoanType: string;
  propertyType: string;
  creditScore: string;
  price: number | null;
  downPayment: string;
  stretchedTo20: boolean;
  fundsSource: string;
  loanBalance: number | null;
  freeAndClear: boolean;
  switchedToCashOut: boolean;
  cashOutWanted: number | null;
  monthlyRent: number | null;
  rentBasis: RentBasis;
  rentalsOwned: string;
  ownsPrimary: boolean | null;
  vesting: string;
  residency: string;
  residencyConfirmed: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneIsInternational: boolean;
}

export const EMPTY_ANSWERS: Answers = {
  goal: '',
  stateCode: '',
  stateName: '',
  rentalUse: '',
  stage: '',
  ownedSince: '',
  currentLoanType: '',
  propertyType: '',
  creditScore: '',
  price: null,
  downPayment: '',
  stretchedTo20: false,
  fundsSource: '',
  loanBalance: null,
  freeAndClear: false,
  switchedToCashOut: false,
  cashOutWanted: null,
  monthlyRent: null,
  rentBasis: 'estimate',
  rentalsOwned: '',
  ownsPrimary: null,
  vesting: '',
  residency: 'usCitizenOrPR',
  residencyConfirmed: false,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  phoneIsInternational: false,
};

export const isPurchase = (a: Answers) => a.goal === 'purchase';
export const loanGoalOf = (a: Answers): 'purchase' | 'refinance' =>
  a.goal === 'purchase' ? 'purchase' : 'refinance';
export const refinanceTypeOf = (a: Answers): 'cashOut' | 'rateTerm' | null => {
  if (a.goal === 'purchase') return null;
  if (a.goal === 'cashOut' || a.switchedToCashOut) return 'cashOut';
  return 'rateTerm';
};

export const fmtUSD = (n: number | null | undefined) =>
  n == null ? '' : '$' + Math.round(n).toLocaleString('en-US');

export const label = (opts: Opt[], value: string) => opts.find((o) => o.value === value)?.label ?? '';
export const short = (opts: Opt[], value: string) => {
  const o = opts.find((x) => x.value === value);
  return o ? (o.short ?? o.label) : '';
};

const TOTAL_TYPES = new Set(['multi_family_small', 'multi_family_large', 'portfolio']);

/** Field labels for the numbers screen, exactly per spec. */
export function numberLabels(a: Answers) {
  const total = TOTAL_TYPES.has(a.propertyType) ? 'Total ' : '';
  const isPortfolio = a.propertyType === 'portfolio';
  let price = 'Purchase price';
  let priceError = COPY.errors.price;
  if (isPurchase(a)) {
    if (a.stage === 'makingOffers') {
      price = 'Offer price';
      priceError = COPY.errors.offerPrice;
    } else if (a.stage === 'looking') {
      price = 'Target price, roughly';
      priceError = COPY.errors.targetPrice;
    }
    price = total + (total ? price.charAt(0).toLowerCase() + price.slice(1) : price);
  } else {
    price = isPortfolio ? 'Total value, roughly' : 'Worth today, roughly';
    priceError = COPY.errors.value;
  }
  const balance = isPortfolio ? 'Total owed' : 'Still owed';

  let rent = total ? 'Total monthly rent' : 'Monthly rent';
  let toggle: 'leaseEstimate' | 'historyProjection' | null = 'leaseEstimate';
  if (a.rentalUse === 'shortTerm') {
    rent = 'Average monthly revenue';
    toggle = 'historyProjection';
  } else if (a.rentalUse === 'needsWork') {
    rent = "Rent once it's done";
    toggle = null;
  } else if (isPurchase(a) && a.stage === 'looking') {
    rent = "Rent you'd expect";
    toggle = null;
  } else if (a.rentalUse === 'vacant') {
    rent = 'Expected monthly rent';
    toggle = null;
  }
  return { price, priceError, balance, rent, toggle };
}

export function defaultRentBasis(a: Answers): RentBasis {
  if (a.rentalUse === 'shortTerm') return isPurchase(a) ? 'projection' : 'history';
  return 'estimate';
}

export function downPaymentDollars(a: Answers): number | null {
  if (!isPurchase(a) || a.price == null) return null;
  const pct = a.downPayment === '30plus' ? 0.3 : Number(a.downPayment) / 100;
  if (!pct) return null;
  return Math.round(a.price * pct);
}

/** Refi loan-to-value, counting requested cash-out. */
export function refiLtv(a: Answers): number | null {
  if (isPurchase(a) || a.price == null || a.price <= 0) return null;
  const owed = a.freeAndClear ? 0 : a.loanBalance;
  if (owed == null) return null;
  return (owed + (a.cashOutWanted ?? 0)) / a.price;
}

export function isHighLtv(a: Answers): boolean {
  const ltv = refiLtv(a);
  if (ltv == null) return false;
  return refinanceTypeOf(a) === 'cashOut' ? ltv > 0.75 : ltv > 0.8;
}

// ---------- flags, chips, grade, summary ----------

export function flagsOf(a: Answers): string[] {
  const f: string[] = [];
  const rt = refinanceTypeOf(a);
  if (a.stretchedTo20) f.push('stretchedTo20');
  if (a.downPayment === '15') f.push('down15');
  if (a.price != null && a.price < 100_000) f.push('priceUnder100k');
  if (isHighLtv(a)) f.push('highLtv');
  if (a.fundsSource === 'partnerOrGift') f.push('partnerOrGift');
  if (a.residency === 'foreignNational') f.push('foreignNational');
  if (a.residency === 'visa') f.push('visa');
  if (a.creditScore === 'no_us_credit') f.push('noUsCredit');
  if (a.creditScore === '620_659') f.push('credit620s');
  if (a.creditScore === '620_659' && rt === 'cashOut') f.push('credit620sCashOut');
  if ((a.rentalsOwned === 'none' || a.rentalsOwned === 'one') && a.ownsPrimary === false)
    f.push('firstRentalNoPrimary');
  if (a.rentalUse === 'shortTerm') f.push('shortTermRental');
  if (a.rentalUse === 'midTerm') f.push('midTerm');
  if (a.rentalUse === 'vacant') f.push('vacantRefi');
  if (a.rentalUse === 'needsWork') f.push('needsWork');
  if (a.ownedSince === 'under6mo') f.push('seasoningUnder6mo');
  if (a.switchedToCashOut) f.push('switchedToCashOut');
  // Gated on rateTerm: a kept-but-switched loan type must not flag a
  // free-and-clear deal as a bridge payoff.
  if (rt === 'rateTerm' && a.currentLoanType === 'hardMoney') f.push('hardMoneyPayoff');
  if (a.stage === 'looking') f.push('stillLooking');
  if (a.stage === 'underContract30') f.push('closeWithin30');
  if (a.propertyType === 'condo') f.push('condo');
  if (a.propertyType === 'multi_family_large') f.push('units5to8');
  if (a.propertyType === 'portfolio') f.push('portfolio');
  return f;
}

export function chipsOf(a: Answers): string[] {
  const c: string[] = [];
  const rt = refinanceTypeOf(a);
  c.push(isPurchase(a) ? 'Purchase' : rt === 'cashOut' ? 'Cash-out refi' : 'Rate-and-term refi');
  if (a.stateName) c.push(a.stateName);
  if (a.propertyType) c.push(short(PROPERTY_TYPES, a.propertyType));
  if (a.rentalUse) c.push(short(isPurchase(a) ? RENTAL_USE_PURCHASE : RENTAL_USE_REFI, a.rentalUse));
  if (isPurchase(a) && a.stage) c.push(short(STAGE_PURCHASE, a.stage));
  if (rt === 'cashOut' && a.ownedSince) c.push(short(OWNED_SINCE, a.ownedSince));
  if (rt === 'rateTerm' && a.currentLoanType) c.push(short(CURRENT_LOAN, a.currentLoanType));
  if (isPurchase(a)) {
    if (a.price != null) c.push(fmtUSD(a.price));
    if (a.downPayment) {
      const pct = a.downPayment === '30plus' ? '30%+' : `${a.downPayment}%`;
      const src = a.fundsSource ? `, ${short(FUNDS_SOURCES, a.fundsSource)}` : '';
      c.push(`${pct} down${a.stretchedTo20 ? ' (stretch)' : ''}${src}`);
    }
  } else if (a.price != null) {
    const owed = a.freeAndClear ? 'free and clear' : a.loanBalance != null ? `owes ${fmtUSD(a.loanBalance)}` : '';
    c.push(`Worth ${fmtUSD(a.price)}${owed ? `, ${owed}` : ''}`);
    if (a.cashOutWanted != null && a.cashOutWanted > 0) c.push(`wants ${fmtUSD(a.cashOutWanted)} out`);
  }
  if (a.monthlyRent != null) {
    const basis: Record<RentBasis, string> = {
      lease: 'lease',
      estimate: 'estimate',
      history: '12-mo history',
      projection: 'projection',
    };
    let b: string = basis[a.rentBasis];
    if (a.rentalUse === 'needsWork') b = "once it's done";
    else if (a.rentalUse === 'vacant' || (isPurchase(a) && a.stage === 'looking')) b = 'expected';
    c.push(`${fmtUSD(a.monthlyRent)}/mo, ${b}`);
  }
  if (a.creditScore) c.push(short(CREDIT_BANDS, a.creditScore));
  if (a.rentalsOwned) {
    const opts = isPurchase(a) ? RENTALS_PURCHASE : RENTALS_REFI;
    let r = short(opts, a.rentalsOwned);
    if (a.rentalsOwned === 'none' || a.rentalsOwned === 'one') {
      r = `${label(opts, a.rentalsOwned)}, ${a.ownsPrimary ? 'owns home' : a.ownsPrimary === false ? 'rents' : ''}`.replace(/, $/, '');
    }
    c.push(r);
  }
  if (a.vesting) {
    let v = short(VESTING, a.vesting);
    if (a.residencyConfirmed && a.residency === 'foreignNational') v += ' · Foreign national';
    if (a.residencyConfirmed && a.residency === 'visa') v += ' · Visa holder';
    c.push(v);
  }
  return c.filter(Boolean);
}

export function leadGradeOf(a: Answers, flags: string[]): 'A' | 'B' | 'C' {
  const weak = new Set([
    'stretchedTo20',
    'priceUnder100k',
    'credit620s',
    'firstRentalNoPrimary',
    'stillLooking',
    'noUsCredit',
    'partnerOrGift',
    'highLtv',
  ]);
  const weakCount = flags.filter((f) => weak.has(f)).length;
  if (weakCount >= 2) return 'C';
  const propertyExists = isPurchase(a) ? a.stage.startsWith('underContract') : true;
  const moneyReal = isPurchase(a)
    ? ['20', '25', '30plus'].includes(a.downPayment) && a.fundsSource === 'liquid' && !a.stretchedTo20
    : (() => {
        const ltv = refiLtv(a);
        return (ltv != null && ltv <= 0.75) || (a.freeAndClear && a.cashOutWanted == null);
      })();
  const creditOk = ['660_699', '700_739', '740_plus'].includes(a.creditScore);
  const dated = isPurchase(a) ? a.stage.startsWith('underContract') : true;
  if (propertyExists && moneyReal && creditOk && dated && weakCount === 0) return 'A';
  return 'B';
}

export function roughRatioOf(a: Answers): number | null {
  if (a.price == null || a.monthlyRent == null || a.price <= 0) return null;
  let loan: number | null = null;
  if (isPurchase(a)) {
    const pct = a.downPayment === '30plus' ? 0.3 : Number(a.downPayment) / 100;
    if (!pct) return null;
    loan = a.price * (1 - pct);
  } else if (a.freeAndClear && a.cashOutWanted == null) {
    loan = 0.75 * a.price;
  } else {
    const owed = a.freeAndClear ? 0 : a.loanBalance;
    if (owed == null) return null;
    loan = owed + (a.cashOutWanted ?? 0);
  }
  if (loan <= 0) return null;
  const payment = loan * 0.0085 + a.price * 0.0015;
  return Math.round((a.monthlyRent / payment) * 100) / 100;
}

export const ROUGH_RATIO_NOTE =
  'Triage only. Built from the loan size the answers imply, not from a priced file.';

export function dealSummaryOf(a: Answers, flags: string[], chips: string[]): string {
  const prefixes: string[] = [];
  if (flags.includes('closeWithin30')) prefixes.push('CLOSING IN 30');
  if (flags.includes('hardMoneyPayoff')) prefixes.push('BRIDGE PAYOFF');
  if (flags.includes('needsWork')) prefixes.push('REHAB FIRST');
  return [...prefixes, ...chips].join(' · ');
}

// ---------- thank-you "have this ready" ----------

export interface ThankYouRecord {
  firstName: string;
  specialist: string | null; // broker key (broker_a..f) as assigned by the server
  state: string;
  stateCode: string;
  chips: string[];
  goal: string;
  refinanceType: 'cashOut' | 'rateTerm' | null;
  stage: string;
  creditScore: string;
  rentalUse: string;
  vesting: string;
  propertyType: string;
  flags: string[];
}

export function haveReadyLines(r: ThankYouRecord): string[] {
  const lines: string[] = [];
  if (r.goal === 'purchase') {
    if (r.stage.startsWith('underContract'))
      lines.push("The address and the contract. Lead with the close date; they'll tell you straight if it's realistic.");
    else if (r.stage === 'makingOffers')
      lines.push("The address you're targeting and the rent it should pull. Ask what you need in hand to write the offer.");
    else lines.push('Your target market and price range. Ask what it takes to get pre-qualified before you write an offer.');
  } else if (r.refinanceType === 'cashOut') {
    lines.push('When you bought it and how you paid. Title seasoning decides how fast the cash comes out and how much.');
  } else {
    lines.push("Your current statement: balance, payment, and any prepayment penalty still running. If it's hard money, lead with the balloon date.");
  }
  const f = new Set(r.flags);
  if (f.has('credit620s')) lines.push("At 620 to 659, expect fewer lenders and more down. They'll tell you which programs are real.");
  if (f.has('shortTermRental')) lines.push("12 months of platform history if you've got it. Without it, expect a market projection at a haircut.");
  if (r.vesting === 'entity') lines.push("The LLC name and whether it's already formed.");
  if (r.vesting === 'undecided') lines.push('Decide name or LLC before the call if you can. It changes the paperwork, not the placement.');
  if (f.has('stretchedTo20')) lines.push('You said you can get to 20% down. Say how (HELOC, sale, savings) in the first minute.');
  if (f.has('foreignNational') || f.has('noUsCredit'))
    lines.push('Your passport, and either a credit report from home or bank reference letters covering the last two years.');
  if (f.has('condo')) lines.push('Whether the HOA has any litigation and roughly what share of units are rentals.');
  if (f.has('units5to8')) lines.push('The rent roll. Most lenders want every unit leased.');
  if (f.has('portfolio')) lines.push('The address list with state, rent, and balance per property.');
  if (f.has('firstRentalNoPrimary')) lines.push('Fewer lenders take a first rental from someone who rents. Say so early; it narrows the list fast.');
  return lines;
}
