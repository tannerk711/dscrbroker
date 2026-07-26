# City Data Layer, DSCRBroker.com

One JSON file per state. This folder is the single source of truth for every city SEO page
under `/states/{state}/{city}/`.

**Adding a state is a data task, not a code task.** Drop `{state-slug}.json` in this folder
following the schema below and two things happen automatically on the next build:

1. `src/pages/states/[state]/[city].astro` generates a page for every city in the file
   (it globs `src/data/cities/*.json`).
2. The state page at `/states/{state-slug}/` renders its "DSCR Loans by City" section
   (`[state].astro` globs this folder too; states without a city file render nothing new).

Zero template changes. Zero config changes. The sitemap picks the new routes up automatically
(`@astrojs/sitemap` filter only excludes `/lp/` and `/thank-you`).

## Before you write a new state file

1. Verify the state is on John's licensing list (`src/data/john-licensing.ts`) AND not in
   `EXCLUDED_STATES` (`src/utils/brokerRouting.ts`). Both must pass.
2. The state must already exist in `src/data/states.json` (the city template pulls the
   state-level `licensingNote` from there for the footer disclaimer bar).
3. Research real data with sources. No invented numbers. Every city carries a
   `dataSources` array naming where each metric came from.

## Validation and derived-number verification

Run after any data change:

```
node scripts/verify-city-data.mjs          # report problems
node scripts/verify-city-data.mjs --fix    # also rewrite derived numbers in place
```

The script validates the schema shape, recomputes every derived number (see Math
conventions), and sweeps all strings for compliance violations (em/en dashes, rate
positioning, "50+ lenders", close-day counts, banned words, "soft pull"). Fix everything it
flags before building.

## Schema

Top level:

| Field | Type | Rules |
|---|---|---|
| `state` | string | Full state name, matches `states.json` |
| `abbreviation` | string | Two-letter USPS |
| `stateSlug` | string | Matches the `slug` in `states.json`. Lowercase, hyphens |
| `dataUpdated` | string | `YYYY-MM`. Bump whenever metrics are refreshed |
| `cities` | array | 10-12 city objects, ordered by investor demand (order = display order) |

Each city object:

| Field | Type | Rules |
|---|---|---|
| `city` | string | Display name ("St. Petersburg", periods fine) |
| `slug` | string | Lowercase, hyphens only ("st-petersburg"). Becomes the URL segment |
| `county` | string | For the property tax card |
| `metro` | string | MSA name |
| `hook` | string | 1-2 sentence hero subhead. Investor-to-investor, includes a real number |
| `metaDescription` | string | 140-160 chars. Unique per city. City + DSCR + one real stat/angle + soft CTA |
| `market` | object | See market fields below |
| `overview` | string | 2-3 paragraphs separated by `\n\n`. 150-260 words. City-specific facts |
| `regulationBadge` | string | `"friendly"` \| `"moderate"` \| `"tenant"` (city-level climate) |
| `regulationNote` | string | One sentence, practical impact for investors |
| `neighborhoods` | array | 3-5 of `{ name, medianPrice, medianRent, note }` |
| `localAngle` | object | `{ tag, title, body }`. The city's regulation/STR/insurance/warrantability angle. Required |
| `programFit` | array | 3-4 slugs from the 8 program pages (see list below) |
| `dealExample` | object | See deal fields below. NO `closingDays`, no close-time language anywhere |
| `faqItems` | array | 4-6 of `{ question, answer }`. 60-120 word answers, genuinely city-specific |
| `dataSources` | array | 3-6 strings, format `"Source, metric, Month Year"` |

`market` object (all researched, sources noted in `dataSources`):

| Field | Type | Notes |
|---|---|---|
| `medianPrice` | number | Dollars |
| `medianRent` | number | Dollars/month |
| `priceToRent` | number | DERIVED: `medianPrice / (medianRent * 12)`, 1 decimal |
| `vacancyRate` | number | Percent. Metro-level OK if city-level unavailable |
| `yoyPrice` | number | Percent change, negative allowed (honest corrections build trust) |
| `yoyRent` | number | Percent change |
| `estDSCR` | number | DERIVED: see Math conventions |
| `propertyTaxRate` | number | Effective percent for an INVESTOR purchase (non-homestead in FL, post-Prop-13-reset in CA, full county+city+ISD stack in TX) |
| `insuranceMonthly` | number | Realistic monthly premium at the median price. Do not lowball FL/coastal |

`dealExample` object:

| Field | Type | Notes |
|---|---|---|
| `label` | string | "Purchase" \| "Cash-Out Refinance" \| "BRRRR Refinance" (vary across cities) |
| `propertyType` | string | e.g. "3-bed / 2-bath SFR", "Duplex (2-unit)" |
| `neighborhood` | string | Should match one of the `neighborhoods` names |
| `purchasePrice` | number | For refis this is the appraised value |
| `downPaymentPct` | number | 20-30. For refis this reads as equity retained |
| `downPayment` | number | DERIVED |
| `loanAmount` | number | DERIVED |
| `loanType` | string | Never contains a rate |
| `interestOnly` | boolean | Switches the P&I factor |
| `monthlyPI` | number | DERIVED |
| `monthlyTax` | number | DERIVED from purchasePrice and market.propertyTaxRate |
| `monthlyInsurance` | number | Researched, property-level |
| `monthlyHOA` | number | 0 unless condo/townhome |
| `monthlyPITIA` | number | DERIVED |
| `monthlyRent` | number | Property-level realistic rent (STR deals: projected monthly STR income) |
| `dscr` | number | DERIVED, 2 decimals |
| `monthlyCashFlow` | number | DERIVED, negative allowed (No-Ratio deals can honestly show sub-1.0) |
| `specialistFocus` | array | 3 bullets: what the matched specialist structured. Attribution rules apply |

Valid `programFit` slugs (must match `/programs/` routes):
`standard-dscr`, `no-ratio-dscr`, `interest-only-dscr`, `str-dscr`, `foreign-national-dscr`,
`bank-statement-dscr`, `portfolio-dscr`, `bridge-to-dscr`

## Math conventions (internal assumptions, NEVER stated as rates in copy)

- 30-year amortizing P&I: `monthlyPI = loanAmount * 0.00699`
- Interest-only P&I: `monthlyPI = loanAmount * 0.00625`
- `monthlyTax = purchasePrice * propertyTaxRate / 100 / 12`
- `market.estDSCR = medianRent / (medianPrice * 0.8 * 0.00699 + medianPrice * propertyTaxRate / 100 / 12 + insuranceMonthly)` (20% down at median)
- `dealExample.dscr = monthlyRent / monthlyPITIA` (2 decimals)
- `monthlyCashFlow = monthlyRent - monthlyPITIA`
- `priceToRent = medianPrice / (medianRent * 12)` (1 decimal)

The verify script recomputes all of these. Author the inputs, let `--fix` settle the deriveds.

## Data source comment convention

JSON has no comments, so sources live in data:

- Per city: `dataSources: ["Zillow Home Value Index, Dallas median price, June 2026", ...]`
- Estimates that could not be sourced fresh are suffixed `(est.)` inside the entry, e.g.
  `"Insurance estimate from TX Dept of Insurance averages, 2025 (est.)"`
- Refresh cadence: quarterly. Bump `dataUpdated` on refresh.

## Copy rules that apply to EVERY string in these files

Full detail in the project `CLAUDE.md` (Positioning Thesis + Copy & Tone Rules) and
`context/positioning-anchors.md`. The non-negotiables:

1. No em-dash or en-dash characters. Periods, commas, hyphens-in-words only.
2. No rates, no rate ranges, no "compare rates" positioning. The site sells structuring
   and specialist matching. Describing what the licensed specialist does with rates is
   allowed; the site claiming rates is not.
3. Licensed activity (quoting, structuring, underwriting, credit pulls, presenting to
   lenders) is attributed to "your matched specialist" / "DSCR lenders", never "we".
4. "70+ lenders", never "50+".
5. No close-time day counts. "Fast closings on clean files" is the ceiling.
6. No phone numbers.
7. No "soft pull" / credit-pull claims about the form.
8. Banned words: discover, unlock, elevate, seamlessly, leverage (verb), cutting-edge,
   delve, comprehensive, transformative, robust, curated, tailored, empower, journey,
   innovative, revolutionizing, disrupting, hassle-free, stress-free, dream home,
   one-stop shop.
