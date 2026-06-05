// Arizona DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// AZ facts verified 2026-06-04: SB 1350 (2016) preempts AZ cities from banning short-term rentals;
// SB 1168 (2022) restored limited local regulation (registration, safety, local contact). AZ has a
// flat state income tax (2.5%), so do NOT claim "no state income tax." Property tax is low (~0.63%,
// below the ~1.10% US average). Barrett Financial Group was founded in Arizona; John is AZ-licensed.

export interface FAQItem {
  question: string;
  answer: string;
}

export const arizonaFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed AZ DSCR specialist. For Arizona, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for an Arizona DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right AZ lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Can lenders use AirDNA projections for my Scottsdale or Sedona short-term rental?',
    answer:
      "Yes, at the right lender, typically at a 75% factor. Arizona is one of the more short-term-rental-friendly states: under SB 1350 (2016), cities and towns cannot ban short-term rentals outright. Cities can still require registration, a local contact, and safety compliance (SB 1168, 2022), and HOAs can have their own rules, so you confirm the local registration and any HOA restrictions before you write the offer. Once the use is permitted, John matches your file to an STR-friendly lender that accepts AirDNA-based income. Scottsdale, Sedona, Flagstaff, and the Phoenix metro are the typical use cases.",
  },
  {
    question: 'Does Arizona cash flow well for DSCR investors?',
    answer:
      "It can, and the math helps. Arizona property tax runs around 0.63% on average, well below the roughly 1.10% national average, which lowers the PITIA in your DSCR calculation and helps the ratio pencil. Strong population growth across the Phoenix metro and Tucson plus historically low vacancy is why a lot of investors build Arizona rental portfolios. John runs the actual DSCR on your numbers so you see where the deal lands before you go under contract.",
  },
  {
    question: 'What does this actually cost me? Are there points and fees?',
    answer:
      "Zero fees from DSCRBroker.com to get matched. From the lender side, AZ DSCR loans typically run 1-2 points origination plus standard third-party costs (appraisal, title, escrow, recording). John walks you through the full breakdown after he sees your scenario, before anything goes to underwriting. No application fee, no junk fees, no charge to talk through your deal first.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'What credit score do I need for an Arizona DSCR loan?',
    answer:
      "Most Arizona DSCR programs in John's network require 660+, with the strongest terms at 700+. Some Foreign National and Bridge-to-DSCR programs accept lower. John runs your scenario across multiple programs and matches you to the right one. Getting matched does not pull your credit. Any credit check is run by John later, only after you submit a formal application and give consent.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, self-employment or entity income tripped the file, an STR's rental projection wasn't accepted, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
