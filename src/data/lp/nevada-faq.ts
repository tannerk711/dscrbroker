// Nevada DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// Per Tanner (2026-06-05): keep state-specific tax %s, STR rules, and local ordinances GENERAL and
// directional, not precise. Nevada STR rules are heavily jurisdiction-specific (Clark County / Las Vegas
// strict, other metros differ) and change over time, so never quote a specific ordinance or factor as
// statewide fact. The ONE durable, verified state fact used here: Nevada has NO state income tax (true,
// unlike Arizona). Everything else stays directional and tells the investor to confirm locally.

export interface FAQItem {
  question: string;
  answer: string;
}

export const nevadaFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed NV DSCR specialist. For Nevada, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a Nevada DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right NV lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Does Nevada cash flow well for DSCR investors?',
    answer:
      "It often does, and the tax climate is a real part of it. Nevada has no state income tax, which is one of the reasons so many investors and residents relocate here, and that steady in-migration into the Las Vegas and Reno metros keeps rental demand strong. Carrying costs like property taxes and insurance still vary by county and property, so John runs the actual DSCR on your real numbers before you go under contract instead of using a statewide average that won't match your deal.",
  },
  {
    question: 'Can lenders use projections for my Las Vegas or Reno short-term rental?',
    answer:
      "Yes, at the right lender, typically at a 75% factor on third-party projections. The bigger thing to get right in Nevada is the local short-term-rental rules, which are heavily jurisdiction-specific and change over time. Las Vegas, unincorporated Clark County, Henderson, and Reno each handle STR permitting differently, so you confirm the current rules and any permit or licensing requirement for your specific property's jurisdiction before you write the offer. Once the use is permitted, John matches your file to an STR-friendly lender that accepts projection-based income.",
  },
  {
    question: 'What does this actually cost me? Are there points and fees?',
    answer:
      "Zero fees from DSCRBroker.com to get matched. From the lender side, NV DSCR loans typically run 1-2 points origination plus standard third-party costs (appraisal, title, escrow, recording). John walks you through the full breakdown after he sees your scenario, before anything goes to underwriting. No application fee, no junk fees, no charge to talk through your deal first.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Nevada is a popular state to hold rentals in an entity, and single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'What credit score do I need for a Nevada DSCR loan?',
    answer:
      "Most Nevada DSCR programs in John's network require 660+, with the strongest terms at 700+. Some Foreign National and Bridge-to-DSCR programs accept lower. John runs your scenario across multiple programs and matches you to the right one. Getting matched does not pull your credit. Any credit check is run by John later, only after you submit a formal application and give consent.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, self-employment or entity income tripped the file, an STR's rental projection wasn't accepted, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
