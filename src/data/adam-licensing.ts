// Adam C. Cunningham / Tall Timbers Realty and Financial Services licensing block.
// Kept deliberately simple (Tanner's call, 2026-08-11). Language is based on the
// approved Tall Timbers footer copy (clients/tall-timbers-funnel, Footer.astro):
// "Loans are originated by Adam C. Cunningham, Mortgage Loan Originator, NMLS #312817,
// through our network of wholesale lender partners."
//
// Renders ONLY where Adam is the matched specialist (thank-you page, gated by the
// `licensing` field on his SpecialistProfile). Never show this for a non-Adam broker,
// and never show John's Barrett block for Adam.

export const ADAM_LICENSING_LINE =
  'Adam C. Cunningham | Mortgage Loan Originator | NMLS #312817 | Tall Timbers Realty and Financial Services | Equal Housing Opportunity | This is not a commitment to lend. All loans are subject to credit approval. | nmlsconsumeraccess.org';

export const ADAM_LICENSING_PARAGRAPH =
  'Loans are originated by Adam C. Cunningham, Mortgage Loan Originator, NMLS #312817, through a network of wholesale lender partners. Tall Timbers Realty and Financial Services is not affiliated with any government agency. All terms are subject to credit approval and this is not a commitment to lend. Not all applicants will qualify. For licensing information visit nmlsconsumeraccess.org.';
