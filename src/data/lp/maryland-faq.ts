// Maryland DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// Per Tanner (2026-06-05): keep state-specific tax %s, STR rules, and landlord-tenant law GENERAL and
// directional, not precise. Those change constantly and a specific cite goes stale. Speak to the durable
// angle (D.C./Baltimore commuter demand, stable government/hospital/university tenant base, a regulatory
// environment where knowing the file matters) without quoting a number or a bill.

export interface FAQItem {
  question: string;
  answer: string;
}

export const marylandFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed MD DSCR specialist. For Maryland, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a Maryland DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right MD lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Which Maryland markets do investors usually finance with DSCR?',
    answer:
      "Baltimore is the classic cash-flow play thanks to strong rent-to-price ratios and steady tenant demand from students, hospital workers, and city employees. The D.C.-adjacent suburbs (Silver Spring, Rockville, Columbia, Frederick) draw commuter tenants who want Metro access and stable employment nearby. John has matched files across both the city rowhome market and the suburban single-family market, so he sizes the deal to the metro you're actually buying in.",
  },
  {
    question: 'Does Maryland cash flow well for DSCR investors?',
    answer:
      "It can, and the tenant demand is the reason. Maryland leans on a stable employment base. Federal government, healthcare systems, universities, and the broader D.C. job market. That tends to keep occupancy steady, which is exactly what a DSCR file wants. Carrying costs like property taxes and insurance vary a lot by county and by property, so John runs the actual DSCR on your real numbers before you go under contract instead of using a statewide average that won't match your deal.",
  },
  {
    question: 'Maryland has landlord-tenant rules that trip people up. Does that affect my DSCR loan?',
    answer:
      "Maryland's landlord-tenant and registration requirements are more involved than some states, and they shift over time, so the right move is to confirm the current rules in your specific county and municipality before you close. That's an operating matter for your rental, not a DSCR underwriting gate. On the loan side, John's job is matching your file to a lender whose program fits your scenario. He'll flag what tends to matter for Maryland files so there are no surprises, and he'll point you to confirm anything local with the county.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'What credit score do I need for a Maryland DSCR loan?',
    answer:
      "Most Maryland DSCR programs in John's network require 660+, with the strongest terms at 700+. Some Foreign National and Bridge-to-DSCR programs accept lower. John runs your scenario across multiple programs and matches you to the right one. Getting matched does not pull your credit. Any credit check is run by John later, only after you submit a formal application and give consent.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, self-employment or entity income tripped the file, a rental projection wasn't accepted, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
