// Colorado DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// CO facts verified 2026-06-05:
//  - Colorado has a FLAT state income tax of 4.40% (NOT zero) -- never claim "no state income tax."
//  - Effective property tax is among the lowest in the US (~0.49-0.55% avg, below the ~0.90% US avg).
//  - STR law is LOCAL/PATCHWORK: no statewide STR license. State law (defines STR as <30 days) delegates
//    regulation to counties/cities. HB23-1287 (effective Aug 2025) clarified county authority over STRs;
//    HB25-1247 lets counties raise lodging taxes with voter approval. Denver restricts STRs to PRIMARY
//    RESIDENCES (no investor STRs). Mountain towns (Steamboat, Summit County, etc.) have their own caps/permits.
//  - Barrett Financial Group is CO-licensed; John is the matched CO specialist.

export interface FAQItem {
  question: string;
  answer: string;
}

export const coloradoFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed CO DSCR specialist. For Colorado, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a Colorado DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right CO lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Does Colorado cash flow well for DSCR investors?',
    answer:
      "The math helps more than most states. Colorado has one of the lowest effective property tax rates in the country, averaging roughly 0.49% to 0.55% versus the roughly 0.90% national average. Low property tax means a lower PITIA in your DSCR calculation, which helps the ratio pencil. Pair that with strong in-migration into the Denver metro, Colorado Springs, and Fort Collins, and you have durable rental demand. John runs the actual DSCR on your numbers so you see where the deal lands before you go under contract.",
  },
  {
    question: 'Can I run my Colorado property as a short-term rental?',
    answer:
      "It depends entirely on the jurisdiction, and this is where a specialist matters. Colorado has no statewide short-term rental license. The state delegates STR regulation to counties and cities, so the rules change block to block. Denver only allows short-term rentals on your primary residence, which rules out a pure investor STR inside city limits. Mountain towns like Steamboat Springs and Summit County run permit caps and licensing of their own. If your plan is STR income, John matches you to a lender that accepts the projected rental income (often via an AirDNA-style market analysis at a reduced factor) and flags that you need to confirm the local STR ordinance and any HOA rules before you write the offer.",
  },
  {
    question: 'Does Colorado have no state income tax, so my returns look better?',
    answer:
      "No. That is a common myth. Colorado has a flat state income tax of 4.40%. It is not a no-income-tax state. The good news for DSCR is that your personal income tax situation does not drive the loan anyway. DSCR qualifies on the property's rent, so John structures the file around the asset, not your 1040.",
  },
  {
    question: 'What does this actually cost me? Are there points and fees?',
    answer:
      "Zero fees from DSCRBroker.com to get matched. From the lender side, CO DSCR loans typically run 1-2 points origination plus standard third-party costs (appraisal, title, escrow, recording). John walks you through the full breakdown after he sees your scenario, before anything goes to underwriting. No application fee, no junk fees, no charge to talk through your deal first.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, self-employment or entity income tripped the file, an STR's rental projection wasn't accepted, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
