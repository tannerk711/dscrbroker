// Florida DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.

export interface FAQItem {
  question: string;
  answer: string;
}

export const floridaFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed FL DSCR specialist. For Florida, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a Florida DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent ÷ PITIA) on your specific deal and matches it to the right FL lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Can I finance a non-warrantable Florida condo on DSCR?',
    answer:
      "Often yes. After SB 4-D (2022), SB 154 (2023), and the post-Surfside Fannie/Freddie guideline updates, a lot of older FL condos became non-warrantable: building <50% owner-occupied, pending litigation, low reserves, deferred structural inspections, milestone inspection failures. Conventional financing dies on those. John knows which lenders in his network fund non-warrantable FL condos under DSCR/Non-QM, typically up to 70% LTV, and which buildings are flat dead even on Non-QM. Miami Beach, Sunny Isles, Naples, and Surfside-aftermath buildings are the typical use cases.",
  },
  {
    question: 'Will lenders accept AirDNA projections for my Disney-area Airbnb?',
    answer:
      "Yes, at the right lender, typically at a 75% factor. But STR zoning is the bigger issue, and John talks through that on the first call. Orange County (Orlando proper) prohibits short-term rentals in most residential zones. Osceola County (Kissimmee, Four Corners, Davenport, Celebration) permits them. Destin and 30A have permit-zoned STR districts. The county is what you confirm with the city/county clerk before you write an offer. Once it's permit-eligible, John matches your file to an STR-friendly lender that accepts AirDNA-based income.",
  },
  {
    question: 'What does this actually cost me? Are there points and fees?',
    answer:
      "Zero fees from DSCRBroker.com to get matched. From the lender side, FL DSCR loans typically run 1-2 points origination plus standard third-party costs (appraisal, title, FL doc stamps, intangible tax). John walks you through the full breakdown after he sees your scenario, before anything goes to underwriting. No application fee, no junk fees, no charge to talk through your deal first.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'What credit score do I need for a Florida DSCR loan?',
    answer:
      "Most Florida DSCR programs in John's network require 660+, with the strongest terms at 700+. Some Foreign National and Bridge-to-DSCR programs accept lower. John runs your scenario across multiple programs and matches you to the right one. Getting matched does not pull your credit. Any credit check is run by John later, only after you submit a formal application and give consent.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few FL-specific issues: condo turned out to be non-warrantable, STR zoning didn't permit short-term rental use, coastal/flood-zone exposure tripped the program, or the lender's overlay didn't fit your scenario. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
