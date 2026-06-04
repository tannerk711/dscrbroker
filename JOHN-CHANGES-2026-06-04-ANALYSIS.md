# John's Change Batch — Analysis + Implementation Plan (2026-06-04)

Source: `John 1-Shot - dscrbroker - 06-04-26.pdf` (4 forwarded emails, May 24–30, with screenshots + AI-conversation dumps).

---

## TL;DR — the one thing to know first

**John is reviewing two different pages and treating them as one.**

- Emails 1 (headline) reference **`dscrbroker.com` / the main homepage** (`index.astro`).
- Emails 2 & 3 (comparison table, the 4 underwriting boxes, "Specialist Who Has Run These Deals", "70+ Lenders Navigating Them") are the **Florida LP only** (`lp/florida-dscr.astro`). These sections do **not** exist on the indexed homepage.
- Email 4 (the "You Qualify If" green-check card, the form headline) is the **main homepage** (`WhoQualifies.astro`).

So this batch splits across two surfaces. That matters because the FL LP is John's personal, `noIndex` page; the homepage is the public SEO asset for all 50 states. **Most of John's "deep dive" edits land on the FL LP** (and should flow into the `dscr-client-lp` skill so future state LPs inherit them). A handful touch the homepage.

**Reality check on volume:** roughly half of what John "requests" is already live. The comparison row he wants (`70+` vs `Single program`) already renders exactly that way. The boxes he wants edited already exist. This is a small surgical batch dressed up in three long Gemini transcripts.

---

## What's VALUABLE (apply these)

| # | Change | Where | Why it's good |
|---|--------|-------|---------------|
| V1 | **"run" → "funded"** everywhere it appears in body copy (e.g. "deals that get declined elsewhere still get **done**" → keep; "A Specialist Who Has **Run** These Deals" → "...Has **Funded** These Deals"). | FL LP: `DSCRUnderwritingReality.astro`, `BenefitsFL.astro` | "Funded" is the outcome word. Stronger than "run/set/done". Investor cares about close, not effort. Low-risk, on-positioning. |
| V2 | **"set and done" → "funded"** ("set" removed, "done" → "funded"). | Wherever "set"/"done" pairs appear | Same logic. Tighter. |
| V3 | **Tax-returns row → "NO tax returns required" with a green check for us.** Currently the row reads "Tax returns required: us=No(✗red), generic=No(✗red), bank=Yes(✓... wait, Yes=✗)". John wants OUR column to show a **green check**, which means flipping the feature to a positive ("No tax returns required") so "yes/green" = good. | FL LP: `ComparisonTable.astro` | Legit UX fix. Right now our column shows a RED ✗ on the tax-returns row, which visually reads as a negative against us even though it's a positive. Flipping the polarity so we get a green ✓ is correct. |
| V4 | **Bold the "Single program" cells** in the Generic + Big-Bank columns so the contrast with our "70+" pops. | FL LP: `ComparisonTable.astro` | Cheap visual emphasis on the single strongest differentiator. Fine. |
| V5 | **DSCR tier chart wording cleanup** ("DSCR 1.25+ Strong Deal – Lowest Investor Rates" etc.). | FL LP: `DSCRUnderwritingReality.astro` tiers | **PARTIAL.** Keep the tier-cleanup wording, but **the "Lowest Investor Rates" label is the rejected change (3rd time).** Strip rates, keep the deal-strength descriptions. See REJECTED below. |
| V6 | **"You Qualify If" — add the lower credit floor + income-source clarity.** John: "We can offer down to 620," "Self-employed, W-2, retired, or any income source," "We can now offer 0-3 months reserves." | Homepage: `WhoQualifies.astro` | The 620 floor and "any income source" line are **already in the card.** The **reserves** point is the real change: current card says "6 months of reserves" — John now offers **0–3 months**. That's a factual product update and must be fixed. |
| V7 | **Property-type clarity: drop "mixed-use," keep townhome as SFR.** John: "Let's drop mixed-use and town home is technically SFR." | Homepage `WhoQualifies.astro` + FL LP comparison if referenced | Factual product correction from the lender. Apply. Mixed-use isn't a DSCR fit; including it invites bad leads. |
| V8 | **Form headline with more "value-add" but still short/punchy.** John dislikes Gemini's options, asks for our take. | Homepage hero form (`index.astro` line 151) + `qualify.astro` | Real ask, real lever. Current: "Get Your Deal Reviewed." We can do better without breaking positioning. See recommendation below. |

## What's LOW-VALUE / NOISE (acknowledge, don't act)

| # | Item | Verdict |
|---|------|---------|
| N1 | **Three full Gemini transcripts on headline theory** ("answer 2 questions in 3 seconds," "users scan keyword clusters"). | Generic copywriting 101. The actual decision inside them is small (he likes "DSCR Loans for RE Investors" as an H1 anchor). Don't re-architect the hero around an AI essay. |
| N2 | **"DSCR Loans for RE Investors" as the new H1.** | **Already handled in spirit.** Homepage H1 is "DSCR Loans, Structured by a Specialist" — which is *stronger* than "for RE Investors" because it carries the differentiator (specialist), not just the keyword. The badge already says "70+ DSCR Lenders. All 50 States." and the subhead already says "for real estate investors." Changing the H1 to "for RE Investors" would TRADE the positioning hook for a keyword we already cover elsewhere. Recommend: **keep current H1**, optionally add "for Real Estate Investors" to the badge/subhead if John wants the literal phrase visible. Flag this as a judgment call for Tanner. |
| N3 | **"Structured to Maximize Cash Flow" sub-headline** (the option Gemini put "in red"). | Borderline. "Maximize cash flow" is fine and on-positioning (it's about deal structure, not rates). Could work as a subhead accent. Low priority; optional. |
| N4 | **Headline split into H1 + dual-benefit sub ("maximize cash flow or cash-out refi fast").** | This is FL-LP / qualify-page territory, and the homepage subhead already does the job. Optional polish, not a needle-mover. |
| N5 | **Form sub-headlines from Gemini** ("Get Your Deal Reviewed / 2 Minutes. No Credit Pull. Fast Quotes."). | "Fast Quotes" flirts with rate-quote positioning. Our canonical is "2 minutes. No SSN. No credit pull." Keep ours. Only the *main* form headline is in play (V8). |

## What's REJECTED (do NOT apply — positioning/compliance)

| # | Item | Why rejected |
|---|------|--------------|
| R1 | **"Lowest Investor Rates" / "Good Rates" labels on the DSCR tier chart.** John has now sent this **three times** (Change 5 on 5/22, again 5/23, now again here in Email 2's "DSCR 1.25+ Strong Deal -Lowest Investor Rates"). | Hard no. (a) Public marketing surface, no thank-you carve-out. (b) Makes the site quote rates = banned positioning. (c) DSCR ratio does NOT determine rate (FICO/LTV/loan type do) — it's factually wrong. Keep the tiers, keep "Strong Deal / Solid / Workable / No-Ratio," strip every rate word. This is already the live state of the code — do not let the new wording reintroduce it. |
| R2 | **"Fast Quotes" in the form sub-headline.** | "Quotes" on the entry form positions the directory as quoting. Banned. |

---

## Already-done check (so we don't "fix" things that are fine)

- ✅ Comparison row "Lender options on your deal: 70+ vs Single program vs Single program" — **already live** exactly as John's screenshot shows.
- ✅ "70+ Lenders, One Specialist Navigating Them" box — **already live** (`DSCRUnderwritingReality.astro` box 4).
- ✅ 620 credit floor + "any income source" line in "You Qualify If" — **already live.**
- ✅ Canonical lender count is **70+** site-wide (the old CLAUDE.md "normalize to 50+" note is STALE — everything live is 70+; John uses 70+; leave it).

---

## Open question for Tanner (one decision needed)

**The "0–3 months reserves" change (V6) is a real product/eligibility update from the lender.** It loosens the qualify criteria. Confirm John means: *minimum reserves are now 0–3 months* (down from 6). If yes, the card line "6 months of reserves in liquid assets" becomes **"As little as 0–3 months of reserves (program-dependent)."** This is the only change that alters a stated qualification, so it gets an explicit sign-off.

---

## Implementation plan (in order, all reversible)

Run through `client-change-intake` discipline: log before/after, positioning-scan each, then apply.

### Phase 1 — FL LP copy (`run/set/done` → `funded`) — V1, V2
1. `DSCRUnderwritingReality.astro`: Box label "A Specialist Who Has **Run** These Deals Before" → "...Has **Funded** These Deals Before". Sweep body copy for "run/set/done" where "funded" is the stronger outcome word (keep "still get **done**" if it reads better, or change to "still get **funded**" — recommend "funded" for consistency).
2. `BenefitsFL.astro`: same sweep.

### Phase 2 — FL LP comparison table polish — V3, V4
3. `ComparisonTable.astro`: flip the tax row to **"NO tax returns required"** with `us: 'yes'` (green ✓), `generic: 'yes'` (green ✓), `bank: 'no'` (red ✗). Verify the legend still reads correctly.
4. Bold the "Single program" value cells (add `font-bold` to the `value`-kind cell render, or specifically to those two columns).

### Phase 3 — DSCR tier wording (keep cleanup, strip rates) — V5 / R1
5. `DSCRUnderwritingReality.astro` tiers: adopt John's cleaner phrasing **minus any rate label**:
   - DSCR 1.25+ → "Strong deal. Broadest program access." (current is fine — keep)
   - DSCR 1.00–1.24 → "Solid deal. Qualifies comfortably." (keep)
   - DSCR 0.75–0.99 → "Workable. Still funds, even with negative cash flow." (keep)
   - DSCR below 0.75 → "No-ratio option. Cash flow stops being the gate." (keep)
   - **Net: likely zero change here — current copy already matches his intent without the banned rate labels. Confirm and move on.**

### Phase 4 — Homepage "You Qualify If" — V6, V7
6. `WhoQualifies.astro`:
   - Reserves: "6 months of reserves in liquid assets" → **"As little as 0–3 months of reserves (program-dependent)"** (pending Tanner confirm).
   - Property types: "SFR, 2-8 unit, condo, townhome, **or mixed-use**" → drop "mixed-use" → "SFR, 2-8 unit, condo, or townhome (townhome qualifies as SFR)".
   - Update the matching `notIdealItems` if mixed-use logic shifts.
7. Sweep FL LP / state data for the same "mixed-use" and "6 months reserves" claims so the site stays consistent.

### Phase 5 — Form headline value-add — V8
8. Replace homepage hero form headline "Get Your Deal Reviewed" and `qualify.astro` equivalent.
   - **Recommended:** **"See What Your Deal Qualifies For"** (value = outcome, not effort; on-positioning; short).
   - Alternates: "Structure My Deal" / "Get My Deal Structured" (matches canonical CTA family) · "Match Me With a DSCR Specialist."
   - Keep the sub-headline canonical: "2 minutes. No SSN. No credit pull." (do NOT adopt "Fast Quotes").

### Phase 6 — Homepage H1 (judgment call, likely no-op) — N2
9. Decision for Tanner: keep "DSCR Loans, Structured by a Specialist" (recommended) vs. swap to "DSCR Loans for Real Estate Investors." If he wants the literal "RE Investor" phrase visible, add it to the badge/subhead rather than sacrificing the H1's differentiator.

### Phase 7 — propagate + log
10. Push the universal FL-LP edits (funded, tax-row polarity, bold single-program) into the `dscr-client-lp` skill scaffold so future state LPs inherit them.
11. Write `CHANGE-LOG-2026-06-04.md` (before/after per change), append a Pivots line + Lessons line to the project `CLAUDE.md` (note: R1 rejected for the 3rd time; canonical count is 70+ not 50+).
12. `npm run build` — zero errors. Start dev server, open in Chrome, eyeball homepage + FL LP.

---

## Effort estimate
~6 small edits across 4 files + 1 skill-scaffold sync + log. ~20–30 min of build time. No structural changes, no new components. All reversible.
