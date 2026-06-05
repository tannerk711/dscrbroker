// New Jersey DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// Per Tanner (2026-06-05): keep state-specific tax %s, rent-control rules, and landlord-tenant law
// GENERAL and directional, not precise. NJ has heavy carrying costs and active local rent regulation
// that vary by municipality and change over time. Speak to the durable angle (NYC-commuter transit
// demand, dense high-rent market, structuring matters because carrying costs are high) without quoting
// a number, a statute, or a specific town's ordinance.

export interface FAQItem {
  question: string;
  answer: string;
}

export const newJerseyFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed NJ DSCR specialist. For New Jersey, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a New Jersey DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right NJ lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Which New Jersey markets do investors usually finance with DSCR?',
    answer:
      "The NYC-commuter belt drives most of it. Jersey City and Hoboken pull premium rents tied to the PATH and ferry into Manhattan, Newark has been one of the fastest-appreciating large markets on transit and redevelopment momentum, and college and central-Jersey towns like New Brunswick and Edison hold steady tenant demand. John has matched files across the dense urban multifamily market and the suburban single-family market, so he sizes the deal to the metro you're actually buying in.",
  },
  {
    question: 'New Jersey has high carrying costs. Does my deal still pencil on DSCR?',
    answer:
      "It can, and this is exactly where structuring earns its keep. New Jersey's property taxes and insurance run high relative to a lot of states, which pushes up the PITIA in your DSCR calculation and can squeeze the ratio. The offset is rent: the NYC-commuter markets command strong rents that often carry the deal. John runs the actual DSCR on your real numbers, not a statewide average, and if it's tight he'll talk through programs and structures (interest-only, different LTV, no-ratio options) that can make the file work before you go under contract.",
  },
  {
    question: 'Does rent control or local rental regulation affect my DSCR loan?',
    answer:
      "New Jersey has active local rental regulation, and the rules differ a lot from one municipality to the next and change over time, so confirm the current ordinance in your specific town before you close. That's an operating matter for your rental, not a DSCR underwriting gate. On the loan side, John's job is matching your file to a lender whose program fits. He'll flag what tends to matter for New Jersey files and point you to confirm anything local with the municipality.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'What credit score do I need for a New Jersey DSCR loan?',
    answer:
      "Most New Jersey DSCR programs in John's network require 660+, with the strongest terms at 700+. Some Foreign National and Bridge-to-DSCR programs accept lower. John runs your scenario across multiple programs and matches you to the right one. Getting matched does not pull your credit. Any credit check is run by John later, only after you submit a formal application and give consent.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, self-employment or entity income tripped the file, a rental projection wasn't accepted, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
