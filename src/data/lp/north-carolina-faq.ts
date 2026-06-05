// North Carolina DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// NC facts verified 2026-06-05: NC has a FLAT state income tax of 4.25% (2025) so do NOT claim "no state income tax."
// Property tax is moderate (~0.63%-0.80% effective, below the ~1.10% US average). STR regulation is a LOCAL mosaic:
// there is NO statewide STR preemption law in force (SB 667 died "Introduced-Dead" 2023; SB 291 was filed in the
// 2025-26 session but is NOT enacted, so do not cite it as law). Do not claim NC bans cities from regulating STRs.
// The genuine angle: relocation- and tech-job-driven population growth (Triangle: Apple/Google/Meta/Amazon expansions;
// Charlotte: banking + finance). Demand shifting to suburbs/secondary metros. John is NC-licensed (NC B-203722).

export interface FAQItem {
  question: string;
  answer: string;
}

export const northCarolinaFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed North Carolina DSCR specialist. For NC, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a North Carolina DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right NC lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'Is the Charlotte and Triangle growth real, or am I buying at the top?',
    answer:
      "The job-and-population growth is the real story in North Carolina. The Triangle is absorbing major tech expansions (Apple's Research Triangle campus, plus Google, Meta, and Amazon hiring), and Charlotte remains a banking and finance hub. That keeps a steady stream of relocating renters who can afford solid rents. Demand has been shifting toward suburbs and secondary metros as renters chase space and affordability. John runs the actual DSCR on the specific deal and submarket you're looking at, so you see where it pencils before you go under contract, instead of betting on the headline.",
  },
  {
    question: 'What are the rules for a short-term rental in North Carolina?',
    answer:
      "North Carolina does not have a single statewide short-term rental code. Rules are set locally, so a beach town, a mountain town like Asheville, and a Charlotte suburb can each handle registration, zoning, and occupancy differently. Before you write the offer, you confirm the local STR ordinance and any HOA restrictions for that specific address. Once the use is permitted, John matches your file to an STR-friendly lender that can use a rental projection, typically at a conservative factor. He'll tell you straight whether a given submarket's STR rules make the deal workable.",
  },
  {
    question: 'Does North Carolina cash flow well for DSCR investors?',
    answer:
      "It can, especially in the more affordable secondary metros. North Carolina property tax runs roughly 0.63% to 0.80% effective on average, below the roughly 1.10% national average, which lowers the PITIA in your DSCR calculation and helps the ratio pencil. Strong in-migration across Charlotte and the Triangle keeps occupancy healthy. The pricier core submarkets pencil tighter, which is exactly why running the real DSCR matters. John runs your actual numbers so you see where the deal lands before you go under contract.",
  },
  {
    question: 'Can I close in my LLC?',
    answer:
      "Yes. Most DSCR programs in John's network are LLC-friendly and many actually prefer the property to vest in an entity. Single-member LLC, multi-member LLC, or holding company structures are all standard on DSCR. Personal guarantee may apply depending on the program. John walks through the entity structure on the call so the vesting is clean before you go under contract.",
  },
  {
    question: 'What credit score do I need for a North Carolina DSCR loan?',
    answer:
      "Most North Carolina DSCR programs in John's network require 660+, with the strongest terms at 700+. Some Foreign National and Bridge-to-DSCR programs accept lower. John runs your scenario across multiple programs and matches you to the right one. Getting matched does not pull your credit. Any credit check is run by John later, only after you submit a formal application and give consent.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, self-employment or entity income tripped the file, an STR's rental projection wasn't accepted, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
