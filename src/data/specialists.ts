// Matched-specialist identity data for the paid-traffic /match/ thank-you page.
//
// Source of truth for these facts is the live thank-you (src/components/form/ThankYou.tsx,
// BROKER_PROFILES). That component is converting production code and is deliberately NOT
// refactored; this module mirrors only the IDENTITY facts (name, title, NMLS, company, logo,
// headshot, licensing) plus Adam's approved deal stories. If a broker's identity changes,
// update both files in the same commit.
//
// Honesty rules baked in:
//  - No review counts or star ratings (none are verified for this surface).
//  - John's thank-you quotes use the "Marcus T., Texas" realistic-fictional deal-example
//    format per the project data conventions, so they are NOT carried here.
//  - Adam's three quotes are the approved Tall Timbers deal stories (clients/tall-timbers-funnel)
//    and render only when Adam is the matched broker.
//  - Licensing text is verbatim-only, imported from its single sources.

import { JOHN_LICENSING_LINE, JOHN_LICENSING_PARAGRAPH } from './john-licensing';
import { ADAM_LICENSING_LINE, ADAM_LICENSING_PARAGRAPH } from './adam-licensing';

export interface MatchSpecialist {
  /** Legal identity: the individual licensed loan officer. Used for NMLS attribution. */
  name: string;
  /** Short first-name form for conversational copy ("John will call"). */
  firstName: string;
  title: string;
  nmls: string;
  company: string;
  companyLogo: string;
  /** Dark logos need a light chip behind them. */
  logoOnLightChip?: boolean;
  headshot: string;
  /** Approved client stories. Empty array = render nothing. */
  stories: { quote: string; author: string }[];
  licensing: { line: string; paragraph: string };
}

const JOHN: MatchSpecialist = {
  name: 'John Peisner',
  firstName: 'John',
  title: 'Senior Loan Officer',
  nmls: '239185',
  company: 'Barrett Financial Group',
  companyLogo: '/images/BFGLogo-Primary.png',
  headshot: '/images/jp-headshot-final.jpg',
  stories: [],
  licensing: { line: JOHN_LICENSING_LINE, paragraph: JOHN_LICENSING_PARAGRAPH },
};

const ADAM: MatchSpecialist = {
  name: 'Adam C. Cunningham',
  firstName: 'Adam',
  title: 'Mortgage Loan Originator',
  nmls: '312817',
  company: 'Tall Timbers Realty and Financial Services',
  companyLogo: '/images/tall-timbers-logo.png',
  logoOnLightChip: true,
  headshot: '/images/adam-cunningham.webp',
  stories: [
    {
      quote:
        "First lender walked away on my Tampa duplex. Adam's team got on the phone, walked through what went wrong, and matched the file to a lender whose overlays fit. Closed at 75% LTV.",
      author: 'Marcus T., Florida',
    },
    {
      quote:
        'Bought a 5-bedroom pool home with zero rental history. Most lenders ghosted me. They flagged the county STR permitting up front, then matched me with a lender that took AirDNA income. First STR in the books.',
      author: 'Lauren K., Florida',
    },
    {
      quote:
        'I live in Toronto and own two Florida rentals. No SSN, no US credit history. Adam walked me through Foreign National DSCR, used my Canadian credit reference letter, and closed the canal-front.',
      author: 'Carlos V., Toronto',
    },
  ],
  licensing: { line: ADAM_LICENSING_LINE, paragraph: ADAM_LICENSING_PARAGRAPH },
};

/** broker key (from brokerRouting / the server's assignedBroker) -> specialist. */
export const SPECIALISTS_BY_BROKER: Record<string, MatchSpecialist> = {
  broker_a: JOHN,
  broker_b: JOHN,
  broker_c: JOHN,
  broker_d: JOHN,
  broker_e: JOHN,
  broker_f: ADAM,
};

// Returns null for any unrecognized key: rendering a fallback specialist would show
// one broker's name, NMLS, and licensing for a lead that routed to someone else (a
// future broker_g, contract drift, corrupted storage). The thank-you's no-specialist
// branch is the honest degraded state.
export function getSpecialist(brokerKey: string | null | undefined): MatchSpecialist | null {
  return (brokerKey && SPECIALISTS_BY_BROKER[brokerKey]) || null;
}
