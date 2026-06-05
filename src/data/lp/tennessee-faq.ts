// Tennessee DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// TN facts verified 2026-06-05: Tennessee has NO state income tax (the Hall tax on investment income was fully
// repealed effective 2021), this is TRUE, the cash-flow angle is real. Effective property tax is very low
// (~0.48%-0.49% statewide average, among the lowest in the US). STR: the TN Short-Term Rental Unit Act prohibits
// local governments from banning STR units outright (grandfather protections), but Nashville/Davidson County is
// restrictive on NON-owner-occupied STRs in residential zones (stopped issuing those permits) and caps per census
// block. So: STR-friendly framing belongs to Knoxville/Chattanooga/Memphis/Gatlinburg, NOT Nashville non-owner-occupied.
// John is TN-licensed (TN 204577).

export interface FAQItem {
  question: string;
  answer: string;
}

export const tennesseeFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed Tennessee DSCR specialist. For TN, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a Tennessee DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right TN lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Does Tennessee really cash flow better because of the taxes?',
    answer:
      "The tax math genuinely helps in Tennessee. The state has no state income tax (the old Hall tax on investment income was fully repealed in 2021), and effective property tax averages around 0.48% to 0.49%, among the lowest in the country and well under the roughly 1.10% national average. Lower property tax means a lower PITIA, which directly helps your DSCR ratio pencil. Pair that with affordable metros like Memphis, Knoxville, and Chattanooga and the cash-flow numbers can work where they wouldn't in a high-tax state. John runs the actual DSCR on your numbers so you see exactly where the deal lands.",
  },
  {
    question: 'Can I run a short-term rental in Nashville?',
    answer:
      "Nashville is the strict one, so this matters. Tennessee's Short-Term Rental Unit Act limits how far local governments can restrict STRs, but Nashville / Davidson County is tight on non-owner-occupied short-term rentals in residential zones and caps permits per census block. Owner-occupied STRs are far more accessible there. If you want a non-owner-occupied STR play, Knoxville, Chattanooga, Memphis, and the Smokies (Gatlinburg, Pigeon Forge, Sevierville) are generally friendlier. You confirm the local permit rules and any HOA restrictions for the exact address before you write the offer. Once the use is permitted, John matches your file to an STR-friendly lender that can use a rental projection.",
  },
  {
    question: 'What does this actually cost me? Are there points and fees?',
    answer:
      "Zero fees from DSCRBroker.com to get matched. From the lender side, TN DSCR loans typically run 1-2 points origination plus standard third-party costs (appraisal, title, recording). John walks you through the full breakdown after he sees your scenario, before anything goes to underwriting. No application fee, no junk fees, no charge to talk through your deal first.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'What credit score do I need for a Tennessee DSCR loan?',
    answer:
      "Most Tennessee DSCR programs in John's network require 660+, with the strongest terms at 700+. Some Foreign National and Bridge-to-DSCR programs accept lower. John runs your scenario across multiple programs and matches you to the right one. Getting matched does not pull your credit. Any credit check is run by John later, only after you submit a formal application and give consent.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, self-employment or entity income tripped the file, an STR's rental projection wasn't accepted, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
