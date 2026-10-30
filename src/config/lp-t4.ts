// ============================================================================
// /qualify/ ("LP-T4"): DSCR funnel template 4 page structure + the V3
// (fhaloans-clone) form, rebranded for DSCRBroker.com. Built on branch
// form-templates, migrated to main 2026-10-30 (FORM-LP-BRIEF.md section 8).
//
// LIVE: leadDelivery below is 'live', so the form POSTs to /api/lead and the
// layout carries the site gtag stack + Hotjar. New leads are tagged
// leadSource 'qualify-lp-t4' so GHL tells them from the old /qualify form.
//
// Every string here obeys clients/dscrbroker/CLAUDE.md and
// context/positioning-anchors.md: no rates, no credit-pull language beyond the
// canonical line, licensed activity attributed to "your matched specialist",
// no site phone number, no em dashes, no new close-time day counts, no banned
// words. The FAQ section was CUT 2026-10-26 (Tanner): its facts (all from the
// John-approved index.astro answers) now live in advantages.blocks, the page's
// one dense reference surface, FHA-page value-per-second style.
//
// Say-it-once at PAGE level (Tanner, 2026-09-02): every message has one surface.
// advantages.blocks inherits the FAQ's exemption: it is the reference deep-dive,
// so TrustBand specs may restate inside it.
//   credit pull ......... advantages.blocks only (hero.sub cut, Tanner 2026-10-26)
//   620 / no tax returns / LLC ...... specs (TrustBand); restated in the deep-dive
//   70+ / $0 fees / 1 specialist / 8 programs ...... NO surface (the stats
//     band was cut 2026-09-09, Tanner's call)
//   duration ("2 minutes") ...... NO surface (hero.sub cut, Tanner 2026-10-26)
//   not a lender ...... notice bar (short, form-adjacent) + footer (full legal)
//   "covers your state" ...... nowhere (routing cannot promise it for NY/MI/ND/SD/UT)
//
// The FORM copy (questions, options, buttons) lives in flow.ts and the V3
// components and is Tanner's own edit pass (2026-09-04). Never change it here.
// ============================================================================

import type { LeadConfig, LeadDelivery } from '../lib/form-templates/live-submit';

export const year = new Date().getFullYear(); // build-time, same convention as template 4

// ---------------------------------------------------------------------------
// Lead delivery + tracking switch. 'test' (the form-templates branch): leads
// stay in localStorage, the page makes zero network requests (hard rule 2).
// 'live' (/qualify/ on main since 2026-10-30): the form POSTs to /api/lead
// (the existing production broker Zaps), persists the API's assignedBroker for
// /thank-you/, and the layout loads the site gtag stack + Hotjar. See
// src/lib/form-templates/live-submit.ts.
// ---------------------------------------------------------------------------
export const leadDelivery: LeadDelivery = 'live';

export const lead: LeadConfig = {
  delivery: leadDelivery,
  leadSource: 'qualify-lp-t4', // GHL tells this page's leads from the old /qualify form
  thankYouPath: '/thank-you/',
  // NY MI ND SD UT (EXCLUDED_STATES in src/utils/brokerRouting.ts): the state step
  // accepts the state as typed, then this screen replaces the contact steps. No
  // lead is recorded and nothing is posted. Honest, no fake workaround.
  notCovered: {
    headline: 'Not in {state} yet.',
    body: 'The DSCRBroker.com network does not have a licensed DSCR specialist for {state} right now, so there is no one to match you with there. New York, Michigan, North Dakota, South Dakota, and Utah are the five states not yet covered. If the property is in another state, go back and change it.',
    backLabel: 'Change the state',
  },
  sendingLabel: 'SENDING...',
  failed: 'Your request did not go through. Check your connection and tap the button again.',
};

export const brand = {
  name: 'DSCRBroker.com',
  logoText: 'DSCRBroker',
  logoSuffix: '.com',
  // Topbar shows the wordmark alone (tagline + audience line cut, Tanner 2026-10-26);
  // the footer still uses the tagline under the wordmark.
  tagline: 'Independent DSCR lender network',
};

export const seo = {
  title: `Check Your ${year} DSCR Loan Eligibility | DSCRBroker.com`,
  description:
    'DSCR rental property loans, qualified on the rent instead of your tax returns. Answer a few questions and get matched with a licensed DSCR specialist. No SSN. No credit pull.',
};

// Notice bar (V3 / fhaloans-proven utility bar): the form-adjacent not-a-lender line.
export const notice = 'DSCRBroker.com is a matching service, not a lender or mortgage broker.';

export const cta = {
  // "Match Me With a Broker" is the canonical CTA for THIS page (Tanner 2026-10-08
  // locked decision: replaces "Match Me With a Specialist" and V3's "GET MY BROKER!").
  primary: 'Match Me With a Broker',
  header: 'Get Started', // canonical header secondary
  sticky: 'Match Me With a Broker',
};

// Tanner's headline (2026-10-26 review). The sub and the Equal Housing mark were
// cut the same pass: DSCRBroker is not a lender, so the page does not display the
// EHO mark anywhere (the footer keeps the verbatim legal paragraph about brokers).
export const hero = {
  h1: 'DSCR Rental Property Loans for Real Estate Investors',
};

// TrustBand: the program SPEC SHEET (facts about DSCR programs). The ONLY surface
// for these three claims. No strip, no CTA (the form is 100px above it).
export const specs = [
  { icon: 'shield', label: '620+ credit score' },
  { icon: 'doc-x', label: 'No tax returns or W-2s' },
  { icon: 'llc', label: 'Close in your LLC' },
] as const;

// No eyebrow subtitles on any section (Tanner 2026-09-09: "01 / The network"
// style labels are cringe; sections open on the H2).

// Advantages, rebuilt 2026-10-26 (Tanner): FHA-page density. The four icon cards
// and the FAQ section are gone; their facts live in `blocks`, the page's one
// dense reference surface. Prose carries the broker thesis (lenders sell one box,
// brokers shop the whole menu); blocks carry the program facts, all sourced from
// the John-approved FAQ answers and the old cards.
export const advantages = {
  h2: 'Why investors use a DSCR specialist instead of calling ten lenders',
  prose: [
    'Every lender draws its own lines. One wants the ratio at 1.0 or better, another writes no-ratio at 30% down. One takes short-term rental projections, another wants a lease in hand. One closes in an LLC with a personal guarantee, another will not. Send the same deal to three lenders and you get three different answers, and none of them tells you which box was the right one.',
    'Here is the part most investors learn the expensive way: a loan officer at a lender can only offer that lender\'s programs. Whatever your deal looks like, their job is to fit it into the one box they sell. A DSCR broker works the other side of the counter. Brokers have access to the whole lender menu, so the deal gets matched to the program instead of squeezed into one.',
    'The specialists behind DSCRBroker.com have been placing DSCR files for years. They know each lender\'s overlays before anything is submitted, and they have the relationships to get a borderline file a real look instead of an automated no. That is how your deal lands on the right program at the sharpest pricing available for it, without you working through ten lenders to find out.',
  ],
  cta: cta.primary,
  // Six cards, FHA-advantages style (prose left, boxed cards right): dense body
  // under a coin icon. 2026-10-26 reformat pass: the flat titled-paragraph list
  // read as a text wall, so the facts went back into white cards.
  blocks: [
    {
      icon: 'ledger',
      title: 'The rent does the qualifying',
      body: "A DSCR loan qualifies on the property's rental income, not your personal income. The lender divides the monthly rent by the full monthly payment: principal, interest, taxes, insurance, and dues. At 1.0 or better the property carries itself. No W-2s, no tax returns, no employment verification.",
    },
    {
      icon: 'shield',
      title: 'Credit floors, no pull to match',
      body: 'Most DSCR lenders want a 660 FICO. Some programs go down to 620, and a 740+ score opens the broadest set of programs in the network. Getting matched does not involve a credit pull: any credit check is run by your specialist later, only after a formal application and your consent.',
    },
    {
      icon: 'portfolio',
      title: 'Down payment sets the menu',
      body: 'Standard DSCR loans take 20% down. No-ratio programs, where the rent does not have to cover the payment, take 30%. Foreign national programs run 25 to 30%. A bigger down payment improves the ratio and widens your options. There are no zero-down DSCR programs.',
    },
    {
      icon: 'llc',
      title: 'Close in your LLC',
      body: "Most lenders allow closing in an LLC, corporation, or revocable trust, and you typically still sign a personal guarantee with title in the entity's name. Entity rules shift lender to lender, so your specialist confirms them before the file goes anywhere.",
    },
    {
      icon: 'home',
      title: 'Short-term rentals count',
      body: 'Airbnb and VRBO income qualifies under specific programs: market projections on a purchase, your own booking history on a refinance. If the numbers support the payment, the property qualifies like any other rental.',
    },
    {
      icon: 'handshake',
      title: 'The exception files',
      body: '5 to 8 units, foreign nationals, a ratio just under 1.0. Automated underwriting throws these files out. A specialist knows which lenders in the network write them and how to present the file so it gets a real read. And each property qualifies on its own rent, so the next deal is never waiting on your personal debt-to-income.',
    },
  ],
};

export const howItWorks = {
  h2: 'Connect with DSCR Investor Loan Experts',
  steps: [
    {
      title: 'Answer a few questions',
      body: 'Property type, credit range, price, and the state.',
    },
    {
      title: 'Get matched',
      body: 'A licensed DSCR specialist reaches out by text or call to talk through the deal.',
    },
    {
      title: 'Your specialist structures the deal',
      body: 'They run the numbers on the rent, walk you through the programs that fit, and put terms in writing if the deal works.',
    },
  ],
  // Logo bar under the H2 (replaced the duplex photo, then the boxed collage,
  // Tanner 2026-10-26): the brokerages whose specialists he works with, on one
  // white bar. Barrett + Tall Timbers were already in public/images/; PMF and
  // NEXA from each company's own site; Future Mortgage from Tanner's inbox drop.
  // `h` is the per-logo render height (px): optical normalization, since the
  // marks range from a 3:1 wordmark (PMF) to a stacked 1.9:1 block (NEXA).
  logos: [
    { src: '/images/BFGLogo-Primary.png', alt: 'Barrett Financial Group', h: 38 },
    { src: '/images/lp/logos/future-logo.png', alt: 'Future Mortgage', h: 34 },
    { src: '/images/lp/logos/pmf-logo.png', alt: 'Pro Mortgage Funding', h: 38 },
    { src: '/images/tall-timbers-logo.png', alt: 'Tall Timbers Realty and Financial Services', h: 42 },
    { src: '/images/lp/logos/nexa-logo.png', alt: 'NEXA Lending', h: 48 },
  ],
};

export const finalCta = {
  heading: 'Ready when you are.',
  body: 'Answer a few questions about the property. Your matched specialist takes it from there, with no obligation at any step.',
  cta: cta.primary,
};

export const footer = {
  links: [
    { label: 'Home', href: '/' },
    { label: 'Privacy Policy', href: '/privacy-policy/' },
    { label: 'Terms of Service', href: '/terms-of-service/' },
  ],
  // VERBATIM from src/components/global/Footer.astro (live site legal).
  disclaimer:
    'DSCRBroker.com is a referral and matching service. We are not a lender, bank, or mortgage broker. We connect borrowers with licensed DSCR loan professionals. All loan decisions are made by the matched broker and their wholesale lending partners. Loan terms and approval are subject to individual lender guidelines and borrower qualifications. DSCRBroker.com does not charge borrowers any fees.',
  housing:
    'Equal Housing Opportunity. All participating brokers in the DSCRBroker.com network are equal opportunity lenders. Loans are available regardless of race, color, religion, national origin, sex, handicap, or familial status, in accordance with the Fair Housing Act.',
  copyright: `© ${year} DSCRBroker.com. All rights reserved.`,
};

// ---------------------------------------------------------------------------
// Icons: 24-viewBox stroke path sets (ported from template 4). Rendered by
// src/components/lp-t4/Icon.astro. stroke currentColor, width 1.8, round caps.
// ---------------------------------------------------------------------------
export const icons = {
  shield: ['M12 3 4 6v6c0 4.6 3.4 8.1 8 9 4.6-.9 8-4.4 8-9V6z', 'm9 12 2 2 4-4'],
  'doc-x': ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'm10 12 4 4', 'm14 12-4 4'],
  llc: ['M4 21h16', 'M6 21V8l6-4 6 4v13', 'M10 21v-4h4v4', 'M9 11h.01', 'M15 11h.01', 'M9 14.5h.01', 'M15 14.5h.01'],
  ledger: ['M6 3h12v18H6z', 'M9 8h6', 'M9 12h6', 'M9 16h4', 'M3.5 7H6', 'M3.5 12H6', 'M3.5 17H6'],
  portfolio: ['M3 8h18v12H3z', 'M9 8V5h6v3', 'M3 13h18', 'M12 12v3'],
  home: ['M3 11 12 4l9 7', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  handshake: ['M2 8h4l6 6', 'M22 8h-4l-2-2-4 4 1.5 1.5a1.5 1.5 0 0 0 2 0', 'm12 14 2 2a1.5 1.5 0 0 1-2 2', 'm10 16 2 2a1.5 1.5 0 0 1-2 2', 'M6 8v7', 'M18 8v7'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof icons;
