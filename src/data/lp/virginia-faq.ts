// Virginia DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// VA facts verified 2026-06-05: Virginia HAS a graduated state income tax (top rate 5.75%) so do NOT claim "no state
// income tax." Effective property tax is moderate (~0.80%-0.87% average, near/below the ~1.10% US average). STR: there
// is NO single statewide STR ban-preemption; localities regulate via transient-occupancy tax and local STR registries
// under Va. Code 58.1-3510.4 / 58.1-3510.6 (this is a TAX-registry statute, not a "cities can't ban STRs" preemption),
// so do not claim VA prevents localities from regulating STRs. The genuine angle: military / federal-government / port
// employment makes the renter base unusually stable; Hampton Roads (Virginia Beach, Norfolk, Newport News) posts the
// state's strongest rental yields (~7-12%), and supply is tight (multifamily deliveries down sharply). Note: a landlord
// near a military air installation must give a written noise-zone/APZ disclosure. John is VA-licensed (VA MC-7357).

export interface FAQItem {
  question: string;
  answer: string;
}

export const virginiaFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed Virginia DSCR specialist. For VA, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a Virginia DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right VA lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Why is Hampton Roads such a strong DSCR market?',
    answer:
      "The renter base is unusually stable because the demand drivers don't blink with the economy. Hampton Roads (Virginia Beach, Norfolk, Newport News) is anchored by the largest naval concentration in the country plus shipyards, port jobs, and healthcare, so military and federal employment keeps occupancy high and turnover predictable. That's why the region has posted the strongest rental yields in the state, often in the 7% to 12% range on single-family rentals, while new supply has stayed tight. John runs the actual DSCR on your specific deal so you see where it pencils against those rents before you go under contract.",
  },
  {
    question: 'What are the short-term rental rules in Virginia?',
    answer:
      "Virginia handles short-term rentals locally rather than with one statewide code. Localities can require registration and charge transient-occupancy tax under the state's short-term rental statutes, and rules vary a lot between Virginia Beach, Richmond, and a Northern Virginia county. Before you write the offer, you confirm that locality's STR ordinance, registration, and any HOA restrictions for the exact address. One Virginia-specific item to know: if the property sits near a military air installation, the landlord must give the tenant a written noise-zone or accident-potential-zone disclosure. Once the use is permitted, John matches your file to an STR-friendly lender that can use a rental projection.",
  },
  {
    question: 'Does Virginia cash flow well for DSCR investors?',
    answer:
      "It depends heavily on the metro, which is exactly why running the real DSCR matters here. Virginia property tax averages roughly 0.80% to 0.87% effective, near or below the roughly 1.10% national average, which keeps the PITIA reasonable in your DSCR calculation. Hampton Roads tends to pencil best on yield, Richmond has led the state in multifamily absorption with tight supply, and Northern Virginia carries higher prices but a deep, high-income renter pool. John runs your actual numbers by submarket so you see where the deal lands before you commit.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'What credit score do I need for a Virginia DSCR loan?',
    answer:
      "Most Virginia DSCR programs in John's network require 660+, with the strongest terms at 700+. Some Foreign National and Bridge-to-DSCR programs accept lower. John runs your scenario across multiple programs and matches you to the right one. Getting matched does not pull your credit. Any credit check is run by John later, only after you submit a formal application and give consent.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, self-employment or entity income tripped the file, an STR's rental projection wasn't accepted, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
