// California DSCR Landing Page FAQ
// IMPORTANT: zero rate language. No "rates from X%", no "compare rates", no "lowest rate".
// All licensed-broker activity (pre-qualify, structure, lock, pull credit) attributed to John / "your matched specialist".
// No insurance pre-quoting claims. The broker does not pre-run insurance.
// CA facts verified 2026-06-05:
//  - Prop 13 caps the BASE property tax at ~1% of assessed value and limits annual increases to ~2%,
//    BUT a purchase triggers REASSESSMENT to the new purchase price. A buyer's tax bill is set on what
//    THEY paid, not what the seller paid, often hundreds/month higher. This tightens DSCR -- the real CA hook.
//  - California has a HIGH progressive state income tax (up to 13.3%). NEVER claim "no state income tax."
//  - High coastal prices push many long-term-rental DSCRs under 1.0; the cash-flow play is the inland metros
//    (Inland Empire/Riverside, Sacramento, Fresno, Bakersfield, Stockton-Modesto). No-ratio DSCR is common in CA.
//  - STR rules are LOCAL (LA, San Diego, SF each have their own permit/cap regimes). No statewide STR ban.
//  - Barrett Financial Group is CA-licensed; John is the matched CA specialist.

export interface FAQItem {
  question: string;
  answer: string;
}

export const californiaFAQ: FAQItem[] = [
  {
    question: 'Are you a lender, a broker, or a lead-gen site?',
    answer:
      "DSCRBroker.com is a matching service. We route your scenario to a licensed CA DSCR specialist. For California, that's John Peisner at Barrett Financial Group, NMLS #239185. John handles the pre-qualification, the file, and the lender placement. We connect you to him. We don't quote, lock, underwrite, or sell your lead to multiple lenders.",
  },
  {
    question: 'Do I need tax returns for a California DSCR loan?',
    answer:
      "No. DSCR loans qualify on the property's rental income, not your personal income or tax returns. John runs the DSCR ratio (rent divided by PITIA) on your specific deal and matches it to the right CA lender. This is why DSCR works for self-employed, LLC-held, and depreciation-heavy investors who get squeezed by conventional underwriting.",
  },
  {
    question: 'How does Prop 13 reassessment affect my DSCR in California?',
    answer:
      "This is the number that quietly kills California deals, and it's exactly what a specialist catches. Under Prop 13 the property tax is roughly 1% of assessed value with annual increases capped, but buying the property RESETS the assessment to your purchase price. So the seller might be paying tax on a value from years ago, while your tax bill is based on what you just paid, often several hundred dollars a month higher. That extra PITIA goes straight into the DSCR ratio. John re-runs your DSCR on the reassessed tax number, not the seller's old one, so the deal pencils on the real payment instead of blowing up at closing.",
  },
  {
    question: 'My California rental barely cash flows. Can I still get a DSCR loan?',
    answer:
      "Often, yes. California prices push a lot of long-term rentals under a 1.0 DSCR, especially on the coast. Two things help. First, John points serious cash-flow buyers toward the inland metros (the Inland Empire, Sacramento, Fresno, Bakersfield, the Stockton-Modesto area) where rent-to-price ratios actually work. Second, when the ratio still comes in under 1.0, he can place the file in a no-ratio DSCR program that doesn't require the ratio to clear 1.0, priced for a lower LTV. He runs your actual numbers and tells you which path fits before you go under contract.",
  },
  {
    question: 'Can I run my California property as a short-term rental?',
    answer:
      "It depends on the city, and California is strict. There's no statewide ban, but the major metros each run their own permit and cap regimes. Los Angeles limits short-term rentals largely to your primary residence under its Home-Sharing Ordinance, San Diego runs a license-by-tier (and in some zones, lottery) system, and San Francisco requires hosts to register and primarily allows primary-residence rentals. If your plan is STR income, John matches you to a lender that accepts the projected rental income (often via an AirDNA-style market analysis at a reduced factor) and flags that you need to confirm the local STR ordinance and any HOA rules before you write the offer.",
  },
  {
    question: 'Does California have no state income tax, so my returns look better?',
    answer:
      "No, the opposite. California has one of the highest progressive state income taxes in the country, up to 13.3% at the top bracket. The good news for DSCR is that your personal income tax situation does not drive the loan. DSCR qualifies on the property's rent, so John structures the file around the asset, not your 1040.",
  },
  {
    question: 'What does this actually cost me? Are there points and fees?',
    answer:
      "Zero fees from DSCRBroker.com to get matched. From the lender side, CA DSCR loans typically run 1-2 points origination plus standard third-party costs (appraisal, title, escrow, recording). California's higher loan amounts can push some files into jumbo-DSCR territory with their own reserve requirements, which John flags up front. He walks you through the full breakdown after he sees your scenario, before anything goes to underwriting. No application fee, no junk fees, no charge to talk through your deal first.",
  },
  {
    question: 'I was declined by another DSCR lender. Can John still close my deal?',
    answer:
      "Often, yes. This is where a specialist beats a single-lender broker. Declines usually come from one of a few issues: the lender's overlay didn't fit your scenario, the reassessed property tax tipped the DSCR under their floor, self-employment or entity income tripped the file, or a property condition flag killed it. John talks through what actually killed the deal, fixes the underwriting issue, and routes it to a lender whose program fits. He closes deals every month that someone else already declined.",
  },
];
