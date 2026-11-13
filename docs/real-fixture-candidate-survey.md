# Real-fixture candidate survey

Research date: **November 13, 2026**. Model inspected: **ClaimLint 0.1.1,
ClaimSpecV1 1.0**. Research only: no production code, schema, fixtures or tests
were changed. This document does not normalize any candidate or report a
settlement verdict.

## Contents

- [Executive conclusion](#executive-conclusion)
- [Method and interpretation of support](#method-and-interpretation-of-support)
- [Stage 1: 24-contract screen](#stage-1--screening-table)
- [Stage 2: incorporated-rule deep review](#stage-2--deep-review-table)
- [Stage 3: finalist support matrices](#stage-3--finalists-and-settlement-material-matrices)
- [Best candidate](#best-candidate)
- [Negative finding and hypothesis assessment](#negative-finding-and-hypothesis-assessment)
- [Recommendation](#recommendation)
- [Primary source references](#primary-source-references)

## Executive conclusion

**C. NO FULLY SUPPORTED CANDIDATE FOUND IN THE SCREENED SET.**

The main screen covers **24 concrete, parameter-bound contracts** across
ForecastEx, Kalshi, ProphetX, QCEX/Polymarket US, Gemini Titan and
Aristotle/UDX. Eight candidates received deeper review: **seven bound contracts
and one additional CME CPI product family**. CME's other economic families and
historical Nadex products were also considered, separately from the 24-contract
count. No template parameter was invented to reach that count.

The strongest ordinary numeric candidate is **ForecastEx `CPIY_1126_3.6`**,
November 2026 CPI-U year-over-year inflation strictly above 3.6%. Its existence
is corroborated by the exchange's [November 12 daily listings/price file][FX-L].
It is **not a fully supported candidate**: the incorporated Rulebook permits
source/underlying/specification replacement, changed settlement timing and
last-price or fair-allocation settlement. Rule 415 review requires separate
analysis; a discretionary committee's existence alone is not the rejection.
[Product terms][FX-CPI], [Rulebook][FX-R].

The principal recurring barrier is **operator authority to alter the financial
settlement beyond the fixed numeric predicate**, especially exceptional
non-binary allocations and modifications to source, underlying or timing.
This supports the proposed governance-boundary hypothesis **within this sample**.
It does not prove that a fully supported DCM contract cannot exist, that these
contracts are defective, or that discretion is improper.

## Method and interpretation of support

The [CFTC DCM register][DCM] and public product filings were used to identify
venues and contracts. A filing marked Certified records self-certification;
it does not establish affirmative CFTC approval, a live customer listing, or a
trade. ForecastEx's CSV and Kalshi's market pages establish published listings;
the other main-screen entries establish concrete filed terms. QCEX's CFTC
organization code is retained alongside its current QCX/Polymarket US name.
Aristotle/UDX/Underdog names are not counted as separate exchanges.

Stages were kept distinct:

1. Inspect real bound numeric questions and their public terms; score apparent
   ordinary-path fit and eliminate obvious mismatches.
2. Inspect complete product provisions and relevant incorporated settlement,
   review, modification, emergency and finality rules for eight strong or useful
   falsification candidates. A known blocker is enough to reject support; it is
   not a reason to claim all other incorporated material has been verified.
3. Compare three strongest bound candidates against 13 settlement-material
   requirements. Any UNSUPPORTED or UNVERIFIED row prevents a supported label.

The 0-5 initial score measures resemblance to a one-number binary claim **before
the complete-rule gate**, not contract quality or a probability of safety.
Dates below distinguish reference periods from certification dates. Mutable
publisher PDFs were inspected as of the research date; a file's storage timestamp
or filename is not assumed to be its legal effective date. Future amendments are
not predicted. Where historical applicability could not be established, that
specific uncertainty is retained rather than substituted with today's edition.

Current v1 limitations were checked against [the actual types](../src/model.ts)
and [resolver](../src/resolver.ts), not inferred from a marketing description:

- It selects a scalar for one exact period with declared source priorities.
  Its correction policies freeze at fixed determination/settlement instants.
- `availableAt` and `publishedAt` both constrain its evidence snapshot.
- Missing-data actions are `yes`, `no` or `review`; there is no prior-period
  substitution, indefinite wait-for-publication policy or collateral-return result.
- A review policy returns a named process without adjudicating it. There is no
  general `ReviewInitiated`, held-settlement, amended-contract, committee-decision
  or authorized-resettlement input/state.
- Two static yes/no payout amounts in [0,1] do not express a variable last-traded
  price or a committee's fair allocation. Source metadata does not execute
  arbitrary eligibility or aggregation procedures.

Trusting an official published scalar remains legitimate evidence preparation.
Silently computing contractual contingencies outside the model and presenting
them as engine coverage would defeat this research's purpose.

## Stage 1 — screening table

**Count: 24 concrete contracts.** Each row has a bound period/event and threshold
or comparison. A common rulebook abbreviation in a row points to the version
assessment below; it is not a claim that every historical notice was obtained.

### ForecastEx: six exchange-listed instances

The IDs and scheduled expirations occur in the [official November 12 CSV][FX-L].
Metric/comparison rules come from each linked product PDF. The PDFs inspected
are undated; the current Rulebook's cover is **September 22, 2026** (`FX-R`).

| ID  | Product / date                                                   | Source and numeric metric                               | Comparator | Apparent complexity                                                 | Rules / score | Rejection reason                                                                                                 |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------- | ---------- | ------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| F1  | [`CPIY_1126_3.6`][FX-CPI], November 2026                         | BLS, NSA all-items CPI-U 12-month change (%)            | `>3.6`     | One published number; initial release                               | FX-R / 5      | First-release and delayed-release lifecycle; Rules 413-415/409 retain modifications and exceptional allocations. |
| F2  | [`UNR_1226_3.7`][FX-UNR], December 2026                          | BLS, monthly U-3 unemployment (%)                       | `>3.7`     | One Employment Situation statistic                                  | FX-R / 5      | Dynamic release timing and the same governing modification/allocation powers.                                    |
| F3  | [`PREMP_1226_18000`][FX-NFP], December 2026                      | BLS, monthly payroll-employment increase                | `>18000`   | One published change; initial release                               | FX-R / 5      | First-publication selection cannot silently become latest revision before a fixed cutoff; same governance.       |
| F4  | [`RGDP_Q426_1.5`][FX-GDP], Q4 2026                               | BEA, annualized real GDP growth, **third estimate** (%) | `>1.5`     | One designated release version                                      | FX-R / 4      | Release-dependent timing and governing powers; advance GDP is not this underlying.                               |
| F5  | [`IJC_111426_170000`][FX-IJC], week ending November 14, 2026     | DOL, weekly initial jobless claims                      | `>170000`  | One weekly statistic                                                | FX-R / 4      | Wait-for-release lifecycle and modifications/exceptional settlement.                                             |
| F6  | [`FF_012827_3.125`][FX-FF], FOMC meeting ending January 27, 2027 | Federal Reserve, target-range midpoint (%)              | `>3.125`   | Midpoint identification, rather than one universally reported bound | FX-R / 4      | Additional rate interpretation plus the same governance/timing branches.                                         |

The CSV's daily `settlement_price` field is a daily mark, not evidence that these
future event outcomes were settled. Zero open interest does not turn an
exchange-listed instrument into a toy example. Identifier suffixes alone were
not used to invent a reporting month or FOMC meeting date.

### Kalshi: four distinct published monthly numeric markets

These exact choices appear on the exchange's own November 2026 pages, inspected
November 13. They are not four invented instantiations of a PDF template. The
linked family PDFs supply source/metric and exception terms; exact market-bound
amendments still require verification before normalization. `K-R` is the current
published v1.31 snapshot, with applicability caveats below.

| ID  | Product / reference date                            | Source and numeric metric                                                 | Comparator | Apparent complexity       | Rules / score | Rejection reason                                                                                                                              |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------- | ---------- | ------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | [CPI in November 2026, Above 0.1%][K-CPI-L]         | BLS, monthly seasonally adjusted CPI-U change; [CPI terms][K-CPI]         | `>0.1`     | One reported decimal      | K-R / 5       | PDF contains nonlinear missing-data fallback, movable expiry and discretionary payout/review provisions. Current bound amendments unverified. |
| K2  | [Core CPI in November 2026, Above 0.2%][K-CORE-L]   | BLS, seasonally adjusted CPI-U less food/energy change; [CORECPI][K-CORE] | `>0.2`     | One reported decimal      | K-R / 5       | Release-dependent expiration and explicit post-trading source/underlying/specification replacement.                                           |
| K3  | [Unemployment in November 2026, Above 4.1%][K-U3-L] | BLS, seasonally adjusted U-3; [U3 terms][K-U3]                            | `>4.1`     | One reported rate         | K-R / 5       | Prior-month missing-data substitution, dynamic expiration and incorporated settlement powers.                                                 |
| K4  | [November 2026 jobs, Above 80,000][K-NFP-L]         | BLS, total nonfarm payroll-employment change; [PAYROLLS][K-NFP]           | `>80000`   | One reported count change | K-R / 5       | Prior-month substitution, moving expiry and incorporated settlement powers.                                                                   |

These are different metric families, not repeated strikes used to inflate venue
coverage. The previously reviewed Zoom/ANNUALKPI contract is **not** counted or
re-reviewed as a new candidate.

### ProphetX: six concrete certifications materially different from volume

Exact PDFs are linked from the [official filings index][PX-I]. `PX-R` means
Rulebook v4.0 effective October 23, 2026. Certification does not establish trading.

| ID  | Product / document date and reference event                                                      | Source and numeric metric                                       | Comparator                       | Apparent complexity                | Rules / score | Rejection reason                                                                                              |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------- | ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| P1  | [Federal-funds upper bound above 4% after December 8-9, 2026 FOMC][PX-FF]; October 30            | Federal Reserve Board, upper target bound (%)                   | `>4`                             | One policy rate                    | PX-R / 4      | Target-range discontinuation expressly pays last-traded price; publication-dependent clock and Rule 5.2.      |
| P2  | [Raise rates by 25bp at that meeting][PX-HIKE]; October 30                                       | Federal Reserve, upper-bound change                             | Actual rule: `0 < change <=25bp` | Two observations and an interval   | PX-R / 2      | Title is not literal equality; interval, derived change and alternate payout do not fit one scalar predicate. |
| P3  | [At least two FOMC cuts in 2027][PX-CUTS]; October 30                                            | Federal Reserve, count of qualifying downward actions           | `>=2`                            | Count/duplicate-action aggregation | PX-R / 1      | Dynamic early determination, counting methodology and discontinuation payout.                                 |
| P4  | [Hannah Hidalgo over 24.5 points, Notre Dame/Villanova, November 1, 2026][PX-PLAYER]; October 16 | NCAA box score; conditional ESPN/AP substitutes                 | `>24.5`                          | One player statistic               | PX-R / 3      | 48-hour resettlement, delayed tier activation and void/collateral-return paths.                               |
| P5  | [Combined score over 139.5, same game][PX-TOTAL]; October 16                                     | NCAA final score with substitutes; combined points including OT | `>139.5`                         | Sum of two scores                  | PX-R / 2      | Aggregation, postponement/void, resettlement and conditional timing.                                          |
| P6  | [People's Party at least 26% in Spain's November 29, 2026 election][PX-SPAIN]; November 2        | Electoral declaration in BOE, then JEC; vote-share calculation  | `>=26`                           | Ratio, grouping and rounding       | PX-R / 1      | Declaration/re-election lifecycle and last-traded-price fallback, beyond a one-number read.                   |

The prior Gemini-volume contract is **not** counted as a new candidate. These
alternatives test whether simpler ProphetX underlyings materially change fit.

### QCEX / QCX / Polymarket US: five bound filed questions

Each linked certification contains a fully specified question in its terms,
not merely an unbound family title. CFTC certification date: **October 6, 2026**.
`Q-R` is the publisher's current September 30, 2026 Rulebook snapshot.

| ID  | Product / reference period                                           | Source and numeric metric                                 | Comparator | Apparent complexity                           | Rules / score | Rejection reason                                                                                                               |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------- | ---------- | --------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | [November 2026 CPI-U all-items 12-month change, filing 64983][Q-CPI] | BLS, NSA US city-average CPI-U YoY (%)                    | `<=3.4`    | One government statistic                      | Q-R / 5       | Prior-period substitution, conditional error correction, dynamic expiration and post-trading source/underlying/payout changes. |
| Q2  | [October 2026 U-3, filing 64976][Q-U3]                               | BLS, seasonally adjusted unemployment (%)                 | `>=4.3`    | One government rate                           | Q-R / 5       | Same first-release/error, prior-period and modification branches.                                                              |
| Q3  | [October 15, 2026 PMMS, filing 64978][Q-PMMS]                        | Freddie Mac, published 30-year fixed mortgage average (%) | `>7.25`    | One weekly statistic                          | Q-R / 5       | Prior-week fallback, conditional corrections and dynamic/source/payout changes.                                                |
| Q4  | [November 2026 egg price, filing 64957][Q-EGGS]                      | BLS, large Grade A eggs, US city average NSA, USD/dozen   | `>2.25`    | One price; denominator retained in definition | Q-R / 4       | Prior-month fallback, error exception and modification lifecycle.                                                              |
| Q5  | [September 2026 ground-beef price, filing 64959][Q-BEEF]             | BLS, 100% ground beef, US city average NSA, USD/lb        | `>6.9`     | One price; denominator retained in definition | Q-R / 4       | Same exceptional branches; no unit conversion is silently inferred.                                                            |

The Exchange is the contractual Source Agency and references BLS/Freddie Mac;
calling the underlying publisher the only possible authority would omit that
distinction and the substitution provisions. [QCEX CPI source provisions][Q-CPI].

### Gemini Titan and Aristotle/UDX: three bound filed questions

| ID  | Venue / product                                                                    | Certification date / period                           | Source and numeric metric                                     | Comparator                         | Apparent complexity                            | Rules / score | Rejection reason                                                                                              |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| G1  | Gemini, [November 2026 CPI-U YoY, filing 65955][G-CPI]                             | October 29; nominal measurement December 10, 09:00 ET | Mecone's re-anchored official BLS figure, then BLS            | `>3.7`                             | One statistic with conditional source snapshot | G-R / 5       | Fair-price missing-data branch, moving measurement, one-hour corrections and irreversible fallback selection. |
| G2  | Gemini, [US CPI Index up November 3 versus November 2, filing 66393][G-REL]        | CFTC record October 29; two 17:00 ET observations     | Mecone continuous MCPI index                                  | Measured value `>` reference value | Two data-dependent operands                    | G-R / 2       | A fixed strike cannot express the comparison; stale-data/fair-price contingencies add blockers.               |
| U1  | Aristotle/UDX, [Toronto at least 0.5 goals versus Montreal, filing 64557][U-GOALS] | September 23; game originally September 29, 19:00 ET  | NHL official total, including specified OT/shootout treatment | `>=0.5`                            | One official count                             | U-R / 4       | Dynamic expiry, conditional substitutes, fair-price cancellation/missing-data settlement.                     |

The two Gemini products are different: G1 excludes prediction-based estimates
between official BLS releases; G2 actually references the continuously changing
index. They cannot share an assumed BLS-only definition.

### Additional falsification attempts, not added to the 24-bound-contract count

**CME:** the [November 19, 2025 certification][CME-CERT], effective December 5,
certifies six real economic families: CPI-U, unemployment, nonfarm payrolls,
advance GDP, core PCE and FOMC. The [current specification compilation][CME-SPEC]
and [Chapter 22][CME-22] were inspected. These are genuine products, but symbolic
strikes/months are not counted as six bound contracts. The [official daily
bulletin][CME-B] shows December 2026 CPI and NFP strike-zero rows; the precise
underlying reference-period binding was not established from those rows alone.
No nonzero price code was guessed into a percentage strike.

CME CPI is a useful challenge to the hypothesis: its ordinary `>=` BLS read,
USD 1/0 payout and ten-business-day contingency ending in NO appear unusually
close. Nevertheless, Rule 2203.A expressly retains discretionary valuation
settlement despite the contingency provisions. This fails independently of
unresolved binding. [Chapter 22][CME-22], [economic specifications][CME-SPEC].

**Historical Nadex/CDNA:** [official economic product specifications][NADEX]
cover initial claims, NFP, GDP, unemployment and CPI. Their USD 100/0 payout is
outside the current per-contract payout bound, and [June 24, 2022 filing 48668][NADEX-DEL]
records delisting. They were eliminated rather than rescaled into a different
contract or described as current offerings.

## Stage 2 — deep-review table

**Eight deeper reviews:** F1, F2, K3, P1, Q1, G1, U1, plus CME CPI. The first
seven are included in the bound screen; CME is a separately identified family.
Relevant rules were read, not inferred from help pages. Version limitations are
explicit; none of these reviews certifies a complete legal-document chain.

| Candidate                  | Product and incorporated version inspected                                                                                                     | Settlement, review and modification findings                                                                                                                                                                                                                   | Emergency, cancellation and finality findings                                                                                                                                                                                               | Gate                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| F1 ForecastEx CPI          | Full two-page [CPIY terms][FX-CPI]; September 22, 2026 [77-page Rulebook][FX-R], Rules 409, 412-415, 602-603                                   | Initial publication; waits for delayed source; 413 changes agency/underlying/specifications after trading begins; 414 acceleration/delay and last-price/fair allocation; 415 discretionary invocation and settlement hold                                      | 409 emergency timing/rule/liquidation powers; 603(b)(2)(iii) expressly addresses non-0/1 payouts. **603(e) effected-settlement finality is an exact positive feature**, not an invented post-settlement reversal power                      | Unsupported                                                  |
| F2 ForecastEx unemployment | Full [UNR terms][FX-UNR] and same actual Rulebook sections                                                                                     | One BLS rate avoids needing aggregation; delayed source/schedule and 413-415 powers remain. Initial-only correction treatment was not established from this product PDF                                                                                        | Same 409/603 analysis. Conditional-contract refund provisions were not falsely applied to this unconditional statistic                                                                                                                      | Unsupported                                                  |
| K3 Kalshi unemployment     | Full [U3 terms][K-U3]; current [DCM v1.31][K-R], Rules 2.8, 6.3, 7.1-7.2, 13.1; [Klear v1.6][K-DCO], 2.12/6.9                                  | Prior-month fallback and variable expiry; 6.3(c) last-price/fair allocation where criterion cannot determine payout; 7.1 discretionary review; 7.2 changes source/underlying/specifications after trading and moves expiry                                     | 2.8 can cancel/refund, alter terms and shorten/extend dates; Klear 2.12 can change settlement mechanisms/prices; 6.9 permits error adjustments after funds transfer. Exact bound amendment chain unverified                                 | Unsupported; applicability uncertainty separate              |
| P1 ProphetX upper rate     | Full October 30 [exact filing][PX-FF]; [v4.0 effective October 23][PX-R], 2.8-2.9, 4.6-4.7, 5.2                                                | One rate and deterministic statement-over-table priority; product itself supplies discontinuation last-price payout and publication-dependent timing. 5.2 selects reliable information and authorizes delay/void/allocation                                    | 5.2 permits reversal/amendment/resettlement after disruption; 2.8-2.9 emergency terms/expiration changes. Order-system appeals in 4.7 are not a settlement appeal                                                                           | Unsupported                                                  |
| Q1 QCEX CPI                | Full three-page [bound terms][Q-CPI]; current September 30 [84-page Rulebook][Q-R], 2.8, 5.3(j), 5.7, 10.3-10.4 and arbitration context        | Initial print except clear technical/operational/interference error: wait for correction or seven days, then review. Prior-month substitution. 10.3 changes source/underlying/settlement date/payout condition; 10.4 review and obvious-error outcome reversal | 2.8 emergency rules; ordinary trade cancellation is not automatically market VOID. Complete historical notices and all clearing provisions were not established; no affirmative full-support claim follows                                  | Unsupported independently of those gaps                      |
| G1 Gemini CPI              | Full six-page [exact terms][G-CPI], related [series][G-SER]; [v1.9 April 29 redline][G-R], 2.9, 6.3, 7.1-7.2; October applicability unverified | Mecone at 09:00, then frozen BLS fallback; one-hour primary corrections; rescheduled release moves clock; product itself mandates last fair price in specified missing-data states; discretionary 7.1 route                                                    | Read edition has broad emergency and source/specification powers. Static publisher PDF is older v1.5, not proof of governing October rules. Do not infer a post-effected reversal merely from pre-settlement committee discretion           | Unsupported already in exact product                         |
| U1 UDX Toronto goals       | Full public [Exhibit A][U-GOALS]; current [v1.4 cover October 1][U-R], 3.m, 5.a.iv-v; September governing version unverified                   | One official team total; conditional substitutes after 48 hours, moving expiration, cancellation/no-source fair-price settlement. Settlement Committee has full discretion under read edition                                                                  | 3.m can change expiration, underlying and final settlement price. Filename says July 30 while actual cover says October 1: not retroactively applied to September game. Irrelevant dead-heat clauses were not used to reject this threshold | Unsupported already in exact product                         |
| CME CPI family             | [Dated initial certification][CME-CERT], [current Chapter 22][CME-22] and [specifications][CME-SPEC]; incorporated Chapters 2, 4, 7, 8-F       | 2200 incorporates general rules/8-F; deterministic contingency A does not erase **2203.A valuation override**; 2202.H distinguishes determination and payment. No CPI-specific committee-review trigger established                                            | 230.j/k, 402.C, 701 permit emergency settlement action; 419 incorporates conflicting government directives into open contracts. Complete historical version/bound period/correction chain unverified                                        | Unsupported under both inspected launch/current 2203.A texts |

### Version and incorporation qualifications

- **ForecastEx:** current Rulebook cover is September 22, 2026; older
  [March 2026 amendment text][FX-HIST] corroborates the material powers but was
  not substituted for the current book. Product PDFs are undated. A future or
  historical trade-specific notice chain is not established merely by a current URL.
- **Kalshi:** the publisher's [public document index][K-INDEX] exposed DCM
  **v1.31** and DCO **v1.6**, each stored November 4. Their covers confirm versions;
  storage time does not establish legal effectiveness. Stale search/page references
  to v1.29 were not treated as governing. Current v1.31 Rule 6.3(c), rather than
  old templates' 6.3(b), contains the relevant allocation language. Historical
  cross-references remain a binding-verification task, not invented equivalence.
- **ProphetX:** v4.0 applicability at October 23 is corroborated by
  [CFTC filing 65098][PX-V] and its [dated amendment certification][PX-AMEND].
  Relevant authority is established without assuming today's undated version.
- **QCEX:** official [trust disclosures][Q-I] link the current September 30 book.
  Its date precedes October 6 filings, but does not by itself establish every
  intervening notice or clearing rule. The product's own modification clause
  independently prevents support.
- **Gemini:** the [static publisher Rulebook][G-OLD] is v1.5, December 9, 2025;
  a later CFTC v1.9 text was inspected. Neither was asserted to be the latest
  governing October edition. The [member agreement][G-AGREE] incorporates amended
  rules and product terms. The exact product's fair-price branch is sufficient
  for rejection despite that provenance gap.
- **UDX:** the official redirect's filename and PDF cover disagree. The cover's
  October 1 v1.4 is the inspected edition, not established September authority.
  The exact product already contains the disqualifying fair-price path.
- **CME:** [26-025][CME-025] and [26-051][CME-051] demonstrate amendments after
  initial certification. The latter changes contingency B; it was not incorrectly
  applied to CPI's selected A contingency. Current incorporated chapters:
  [2][CME-2], [4][CME-4], [7][CME-7], [8-F][CME-8F]. Both launch and current
  2203.A retain the decisive valuation power; every intervening edition is not claimed.

### Governance powers: A, B and C are different questions

Here **A** means expressible in current v1; **B** means a faithful handoff to an
explicit review process without deciding its result; **C** means a material
branch not represented by current inputs/policies/results. **U** means not
established, not permission to assume the power absent. For Gemini/UDX, `C/U`
means unsupported in the read Rulebook edition, with historical applicability
unverified. Product-level blockers are separately established above.

| Power checked                                           | ForecastEx                                                            | Kalshi                | ProphetX                                                                             | QCEX                                                                | Gemini                         | UDX                                                             | CME CPI                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Replace Source Agency                                   | C: 413                                                                | C: 7.2                | U for a named replacement procedure; C for broader terms/reliable-information powers | C: product/10.3                                                     | C/U: 7.2                       | C/U: 5.a.iv                                                     | U: no exhaustive replacement rule established                                              |
| Replace underlying                                      | C: 413                                                                | C: 7.2                | C: emergency specification changes                                                   | C: product/10.3                                                     | C/U: 7.2                       | C/U: 5.a.iv                                                     | U for a specific replacement mechanism; emergency settlement powers separately established |
| Change existing specifications after trading            | C: 413                                                                | C: 7.2                | C: 2.8                                                                               | C: explicit product clause                                          | C/U: 7.2                       | C/U: 5.a.iv                                                     | C: 230.j/k                                                                                 |
| Accelerate settlement/expiration                        | C: 414                                                                | C: 7.2(c)             | C: product/emergency lifecycle                                                       | C: 10.3                                                             | C/U: 7.2                       | C: product                                                      | C: emergency liquidation under 230.k; 2203.A itself concerns price at expiry               |
| Delay settlement/expiration                             | C: product/414                                                        | C: product/7.2        | C: product/5.2                                                                       | C: product/10.3-10.4                                                | C: product d(1)(vii)           | C: product                                                      | C: 2203.A/table                                                                            |
| Determine non-binary allocation                         | C: 414/603                                                            | C: 6.3(c)             | C: product/5.2                                                                       | U: changed payout criteria do not establish fractional allocation   | C: product d(1)(v)             | C: product                                                      | U for explicit intermediate payout; C for discretionary valuation price under 2203.A       |
| Void or return contract funds                           | U for these unconditional statistics; no general refund inferred      | C: 2.8(d)             | C: 5.2; sports products explicit                                                     | U: trade-cancel powers alone insufficient evidence of market refund | U for full governing version   | U for collateral return; fair-price cancellation is established | U for CPI refund; contingency A is NO, not refund                                          |
| Invoke discretionary outcome review                     | C for arbitrary invocation; B only for a represented specific trigger | Same distinction, 7.1 | Same distinction, 5.2                                                                | Same distinction, 10.4                                              | Same distinction, product h(1) | Same distinction, 5.a.v                                         | U for a distinct CPI committee-review route                                                |
| Substitute judgment for source result / ordinary payout | C: 414/415                                                            | C: 6.3(c)/7.1         | C: 5.2                                                                               | C: 10.4                                                             | C: explicit fair-price clause  | C: explicit fair-price clause                                   | C: 2203.A                                                                                  |
| Emergency alteration affecting resolution               | C: 409                                                                | C: 2.8; Klear 2.12    | C: 2.8-2.9                                                                           | C: 2.8                                                              | C/U: 2.9                       | C/U: 3.m                                                        | C: 230.k/402.C/701                                                                         |

These powers have contractual conditions, notice requirements and institutional
constraints. The table does not characterize them as unlimited or presume they
will be exercised. Nor does authority to list a **new strike** alone prove power
to change an existing position; the post-trading modification clauses are the
material evidence here.

### Why Rule 415 cannot simply become `REVIEW_REQUIRED`

A named committee may be a legitimate external endpoint. For example, an
explicit source-discontinuation clause can potentially map a supplied
`metricDiscontinuation` event to a named review process, **B**, provided that is
the actual contractual trigger and no mandatory financial disposition is lost.
It would be wrong to reject that limited handoff just because humans decide it.

ForecastEx Rule 415 is broader: an operator can initiate review before settlement,
and settlement is held pending its process. Current v1 has no independent input
that says the Exchange actually invoked that process, including when ordinary
source data looks valid. A dispute description supplies a name, not that state.
Always returning review would suppress ordinary contractual resolution; returning
review only for an invented source-outage trigger would omit other invocations.
The current model therefore cannot faithfully express the complete 415 branch.
[Rule 415, p.39][FX-R].

Even if that routing issue were set aside, **Rule 414's variable allocation and
Rule 413's changed source/underlying remain independent blockers**. Routing a
mandatory fair-price outcome to review cannot claim that the financial outcome
was represented. The same distinction was applied to the other venues rather
than treating all review as disqualifying.

## Stage 3 — finalists and settlement-material matrices

These are the three strongest **bound single-statistic near-fits**, not survivors
of a passed gate. Statuses refer to the requirement actually stated in each row.
EXACT ordinary identity does not waive exceptional authority assessed in other
rows. No UNKNOWN/APPROXIMATED row is hidden inside an affirmative support label;
uncertainty is explicitly UNVERIFIED.

### Finalist 1: ForecastEx `CPIY_1126_3.6`

Bound listing: [official CSV][FX-L]; question corroborated by the
[official market page][FX-M]. November 2026 NSA CPI-U YoY **>3.6%**.

| Requirement            | Status      | Evidence / model assessment                                                                                                                                                                        |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numeric metric         | EXACT       | [CPIY p.1][FX-CPI], one published BLS percentage.                                                                                                                                                  |
| Comparator             | EXACT       | Exceeds; bound threshold 3.6 in listing.                                                                                                                                                           |
| Reporting period       | EXACT       | Named calendar month November 2026.                                                                                                                                                                |
| Source authority       | EXACT       | Ordinary BLS identity; replacement authority separately fails below.                                                                                                                               |
| Source fallback        | UNSUPPORTED | [413(a), p.38][FX-R] permits new agency/underlying/specifications rather than predetermined fallback.                                                                                              |
| Corrections            | UNSUPPORTED | Initial release controls; current freeze policies do not select the first release while ignoring an otherwise eligible later correction. A fixed snapshot is not a delayed first-publication rule. |
| Publication timing     | UNSUPPORTED | [Product p.2][FX-CPI] follows actual release and amended source schedule.                                                                                                                          |
| Missing data           | UNSUPPORTED | Wait-for-release lifecycle plus [414][FX-R] cannot be replaced by a fixed yes/no/review action.                                                                                                    |
| Review/dispute         | UNSUPPORTED | [415, p.39][FX-R] defines a process but its independent initiation/held state is not a current input.                                                                                              |
| Modification authority | UNSUPPORTED | [413(a)][FX-R] explicitly extends to changes after first trading day.                                                                                                                              |
| Emergency handling     | UNSUPPORTED | [409, pp.35-37][FX-R], changed resolution/rules and liquidation powers.                                                                                                                            |
| Payout                 | UNSUPPORTED | Ordinary USD 1/0 fits; [414 and 603(b)(2)(iii)][FX-R] admit variable exceptional allocation.                                                                                                       |
| Finality               | EXACT       | [603(e), p.52][FX-R] makes effected settlement irrevocable and unconditional. This positive term does not cure pre-settlement branches.                                                            |

### Finalist 2: QCEX CPI-U November 2026 at most 3.4%, filing 64983

The [CFTC record][Q-CPI-REC] and [three-page bound terms][Q-CPI] fix one BLS
statistic, month, comparator and strike. This was a strong alternative to
ForecastEx, not a reused Zoom-style KPI contract.

| Requirement            | Status      | Evidence / model assessment                                                                                                                                                                                                                          |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numeric metric         | EXACT       | Product p.1: NSA all-items US city-average CPI-U 12-month change.                                                                                                                                                                                    |
| Comparator             | EXACT       | Product pp.1-2: at most 3.4, `<=`. No interval is substituted for this bound instance.                                                                                                                                                               |
| Reporting period       | EXACT       | November 2026, one named month.                                                                                                                                                                                                                      |
| Source authority       | EXACT       | Ordinary product identifies Exchange as Source Agency and BLS primary publication; modifications assessed separately.                                                                                                                                |
| Source fallback        | UNSUPPORTED | Product p.1 permits additional/substitute sources; p.3 permits a new source and underlying.                                                                                                                                                          |
| Corrections            | UNSUPPORTED | Product p.2: first publication except a clear technical/operational/interference error, with conditional correction window and review. No such error-state/lifecycle policy exists in v1.                                                            |
| Publication timing     | UNSUPPORTED | Product p.2: earlier of actual release day or 90 days after period, with further adjustment authority.                                                                                                                                               |
| Missing data           | UNSUPPORTED | Product p.2 substitutes the latest prior month's statistic, or routes announced nonpublication/discontinuation to review. A prior-period value is not evidence for the named v1 period.                                                              |
| Review/dispute         | UNSUPPORTED | Specific discontinuation review can be a limited B handoff; complete [10.4][Q-R] additionally permits arbitrary actual invocation, held settlement and obvious-error reversal.                                                                       |
| Modification authority | UNSUPPORTED | Product p.3 and [10.3][Q-R] change source, underlying, payout condition and terms after trading.                                                                                                                                                     |
| Emergency handling     | UNSUPPORTED | Read [2.8][Q-R] permits temporary emergency rules; no corresponding action state. Historical notice completeness remains unverified.                                                                                                                 |
| Payout                 | EXACT       | Product and read Rulebook specify ordinary USD 1/0. No fractional allocation is established. Changing the criterion is a separate modification blocker, not proof of non-binary payout.                                                              |
| Finality               | UNVERIFIED  | Product ordinary final-settlement clause is positive. Rule 10.4 starts before settlement and permits obvious-error outcome reversal; that is not explicit proof of post-effected financial resettlement. Full governing finality remains unverified. |

The full governing-version/clearing chain remains **UNVERIFIED**. The explicit
product-level unsupported clauses already defeat support; missing documents are
not represented as contract defects.

### Finalist 3: Gemini November 2026 CPI-U YoY above 3.7%, filing 65955

[Exact certification][G-CPI], Attachment A(b)-(h), not a generic title-based
interpretation. This contract fixes an observation time and a correction window,
making it a useful attempt to falsify the variable-time objection.

| Requirement            | Status      | Evidence / model assessment                                                                                                                                                                         |
| ---------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numeric metric         | EXACT       | (b)(1), (d)(1)(ii): the official BLS one-decimal statistic, not the prediction-based between-release index.                                                                                         |
| Comparator             | EXACT       | (d)(1)(i): strictly >3.7, equality NO.                                                                                                                                                              |
| Reporting period       | EXACT       | (b)(1): November 2026.                                                                                                                                                                              |
| Source authority       | EXACT       | Ordinary (b)(3): Mecone re-anchored official number; BLS conditional fallback. Wider authority/version separately qualified.                                                                        |
| Source fallback        | UNSUPPORTED | (d)(1)(iii): fallback chosen at 09:00 is frozen against later Mecone arrival. One global priority/correction cutoff cannot preserve both that selection and the separate correction window.         |
| Corrections            | UNSUPPORTED | (d)(1)(iv)/(vi): include primary corrections within one hour, retain frozen fallback; distinguish correction from late first primary publication.                                                   |
| Publication timing     | UNSUPPORTED | (d)(1)(vii): rescheduled release moves the measurement/expiration/trading clocks, including nonstandard release times.                                                                              |
| Missing data           | UNSUPPORTED | (d)(1)(v): omitted statistic or release absent after 30 days produces discretionary last fair price.                                                                                                |
| Review/dispute         | UNSUPPORTED | (h)(1): arbitrary pre-settlement Rule 7.1 initiation; no independent invocation state. A named route alone does not execute this branch.                                                            |
| Modification authority | UNSUPPORTED | Product invokes 7.2; the read [v1.9 Rulebook][G-R] permits changed source/underlying/specifications. Exact October applicability is also UNVERIFIED.                                                |
| Emergency handling     | UNVERIFIED  | Read v1.9 Rule 2.9 is outside v1's action model, but the complete governing October edition was not established.                                                                                    |
| Payout                 | UNSUPPORTED | Ordinary USD 1/0 fits; exact product (d)(1)(v) explicitly requires a last-fair-price branch.                                                                                                        |
| Finality               | UNVERIFIED  | Ordinary revisions after the hour are excluded. Full governing-book finality and exception interaction are not established; pre-settlement discretion alone is not proof of post-effected reversal. |

## Best candidate

**Closest ordinary-path candidate: ForecastEx `CPIY_1126_3.6`. No candidate
qualifies for normalization as fully supported.** It has a precise agency
statistic and uncomplicated strict threshold, but every settlement-material
requirement does not fit. The CPIY product cannot be described as supported
merely because the BLS publication and USD 1/0 ordinary payout fit.

There is no recommendation to bind convenient fixed times, turn initial release
into latest-before-cutoff, map refunds to NO, choose fair allocations, or route
every event to review. Resolving one historical-version uncertainty would not
remove the already documented unsupported branches in these finalists.

## Negative finding and hypothesis assessment

The investigation tried several ways to falsify the hypothesis rather than
assuming common exchange governance made the search pointless:

- Government statistics removed the corporate-action/definition machinery of
  company KPIs. The numeric ordinary paths often fit, but governance remained.
- ForecastEx unemployment tested whether avoiding CPI's explicit first-release
  treatment escaped the shared Rulebook. It did not.
- CME CPI supplied a deterministic missing-release NO contingency. An express
  valuation override still controlled exceptional settlement.
- Gemini CPI supplied fixed nominal measurement and a bounded correction window.
  Its source-selection lock, rescheduling and fair-price terms remained material.
- QCEX CPI used an inclusive comparator and public government number. The
  prior-period/error/modification branches remained outside the model.
- ProphetX's single policy rate and single player statistic removed the previous
  volume contract's per-date aggregation. Different exceptional branches remained.
- Historical Nadex products broadened the search beyond current retail DCMs;
  they failed payout scope/current-availability checks without inventing a rescale.

The recurring causes, in descending practical importance for this sample, were:

1. **Discretionary financial settlement and post-trading changes:** last-price,
   fair-price/fair-allocation outcomes or changes to source, underlying and terms.
2. **Stateful governance:** independently initiated review, settlement holds,
   emergency action and, for some read rules, outcome reversal.
3. **Event-dependent timing and data selection:** rescheduled/delayed release,
   first-publication selection, error-specific correction windows and frozen fallback.
4. **Other product requirements:** prior-period substitution, counting/ratios,
   collateral return, and incomplete governing-version provenance.

These are ClaimLint model boundaries or verification gaps, **not allegations of
contractual ambiguity, unlawful conduct or exchange design defects**. Some
individual clauses are exactly representable and some review handoffs are
legitimate. No screened **whole incorporated settlement contract** fits today's
executable language.

The screened sample is purposeful, not statistically representative. Several
contracts share the same rulebook, so 24 contracts are not 24 independent tests
of governance design. Current and historical editions were not exhaustively
reconstructed for every venue. Neither this negative result nor regulatory
designation proves that all real contracts necessarily retain an unmodellable
escape hatch. No such universal conclusion is made.

## Recommendation

**Stop the open-ended hunt for a wholly deterministic DCM fixture and position
ClaimLint's research around deterministic settlement-core coverage versus
explicit governance boundaries.** This preserves the useful numeric verification
without claiming that it represents unmodelled exchange powers. It is one scope
recommendation, not authorization or a proposal to change the current engine.

## Primary source references

All links were inspected or retrieved on November 13, 2026. Reader failures were
supplemented with original public PDF downloads where available. Confidential
attachments were not fabricated. Source bodies used for research reside only in
the ignored research cache or pre-existing case-study archives; this change adds
no fixtures or production data. Mutable links are not permanent version pins.

[DCM]: https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations?Date_From=&Date_To=&Show_All=0&Status=Designated
[FX-L]: https://data.forecastex.com/prices/daily_prices_20261112.csv
[FX-CPI]: https://data.forecastex.com/regulatory/CPIYTermsandConditions.pdf
[FX-UNR]: https://data.forecastex.com/regulatory/UNRTermsandConditions.pdf
[FX-NFP]: https://data.forecastex.com/regulatory/PREMPTermsandConditions.pdf
[FX-GDP]: https://data.forecastex.com/regulatory/RGDPTermsandConditions.pdf
[FX-IJC]: https://data.forecastex.com/regulatory/IJCTermsandConditions.pdf
[FX-FF]: https://data.forecastex.com/regulatory/FFTermsandConditions.pdf
[FX-R]: https://data.forecastex.com/regulatory/ForecastEx%20_LLC_Rulebook.pdf
[FX-HIST]: https://www.cftc.gov/filings/orgrules/rules03022640208.pdf
[FX-M]: https://forecastex.com/markets/CPIY/CPIY_1126_3.6
[K-CPI-L]: https://kalshi.com/markets/kxcpi/cpi/kxcpi-26nov
[K-CORE-L]: https://kalshi.com/markets/kxcpicore/cpi-core/kxcpicore-26nov
[K-U3-L]: https://kalshi.com/markets/kxu3/unemployment/kxu3-26nov
[K-NFP-L]: https://kalshi.com/markets/kxpayrolls/jobs-numbers/kxpayrolls-26nov
[K-CPI]: https://kalshi-public-docs.s3.amazonaws.com/contract_terms/CPI.pdf
[K-CORE]: https://kalshi-public-docs.s3.amazonaws.com/contract_terms/CORECPI.pdf
[K-U3]: https://kalshi-public-docs.s3.amazonaws.com/contract_terms/U3.pdf
[K-NFP]: https://kalshi-public-docs.s3.amazonaws.com/contract_terms/PAYROLLS.pdf
[K-R]: https://kalshi-public-docs.s3.amazonaws.com/regulatory/rulebook/Kalshi%20DCM%20Rulebook%20v.1.31.pdf
[K-DCO]: https://kalshi-public-docs.s3.amazonaws.com/regulatory/rulebook/DCO%20Rulebook%201.6.docx.pdf
[K-INDEX]: https://kalshi-public-docs.s3.amazonaws.com/?list-type=2&prefix=regulatory%2Frulebook&max-keys=1000
[PX-I]: https://www.prophetx.co/lobby/t-c/filings
[PX-FF]: https://framerusercontent.com/assets/eWcLViyKuTu9V8wDb7vIIPDIIw.pdf
[PX-HIKE]: https://framerusercontent.com/assets/m08fC1Arpqnjwwa5borWqtUeOiU.pdf
[PX-CUTS]: https://framerusercontent.com/assets/LEAFwmhwjXaNZkU4UkV4LbOaGm8.pdf
[PX-PLAYER]: https://framerusercontent.com/assets/xJ8RY5bIMsViuMDnZ02GTByf1SQ.pdf
[PX-TOTAL]: https://framerusercontent.com/assets/2BqCZq0v1Ob7MySRKALokJ0IqIQ.pdf
[PX-SPAIN]: https://framerusercontent.com/assets/baryYYFMUGkMDu1tTXfaofK6aw.pdf
[PX-R]: https://framerusercontent.com/assets/KqKth9m1WKMrm4vVYg6zYaHG1g.pdf
[PX-V]: https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizationRules/65098
[PX-AMEND]: https://www.cftc.gov/filings/orgrules/rules10082632763.pdf
[Q-CPI-REC]: https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizationProducts/64983
[Q-CPI]: https://www.cftc.gov/filings/ptc/ptc10062631959.pdf
[Q-U3]: https://www.cftc.gov/filings/ptc/ptc10062632047.pdf
[Q-PMMS]: https://www.cftc.gov/filings/ptc/ptc10062632058.pdf
[Q-EGGS]: https://www.cftc.gov/filings/ptc/ptc10062631937.pdf
[Q-BEEF]: https://www.cftc.gov/filings/ptc/ptc10062631948.pdf
[Q-I]: https://polymarket.us/trust
[Q-R]: https://polymarketexchange.com/files/legal/latest/rulebook
[G-CPI]: https://www.cftc.gov/filings/ptc/ptc10292637974.pdf
[G-SER]: https://www.cftc.gov/filings/ptc/ptc10292637979.pdf
[G-REL]: https://www.cftc.gov/filings/ptc/ptc10302640552.pdf
[G-R]: https://www.cftc.gov/filings/orgrules/rules0415261525.pdf
[G-OLD]: https://www.gemini.com/static/titan/gemini_titan_rulebook.pdf
[G-AGREE]: https://www.gemini.com/titan/self-clearing-member-agreement
[U-GOALS]: https://www.cftc.gov/filings/ptc/ptc09232629413.pdf
[U-R]: https://www.underdogsports.com/exchange/rulebook
[CME-CERT]: https://www.cmegroup.com/content/dam/cmegroup/market-regulation/rule-filings/2025/11/25-172.pdf
[CME-SPEC]: https://www.cmegroup.com/markets/prediction-markets/files/event-contract-specifications.pdf
[CME-22]: https://www.cmegroup.com/rulebook/CME/I/22.pdf
[CME-B]: https://www.cmegroup.com/daily_bulletin/preliminary_voi/Event_Contracts_Swap_based.pdf
[CME-025]: https://www.cmegroup.com/content/dam/cmegroup/market-regulation/rule-filings/2026/1/26-025.pdf
[CME-051]: https://www.cmegroup.com/content/dam/cmegroup/market-regulation/rule-filings/2026/1/26-051.pdf
[CME-2]: https://www.cmegroup.com/content/dam/cmegroup/rulebook/CME/I/2/2.pdf
[CME-4]: https://www.cmegroup.com/content/dam/cmegroup/rulebook/CME/I/4/4.pdf
[CME-7]: https://www.cmegroup.com/content/dam/cmegroup/rulebook/CME/I/7/7.pdf
[CME-8F]: https://www.cmegroup.com/content/dam/cmegroup/rulebook/CME/I/8F/8F.pdf
[NADEX]: https://www.cftc.gov/sites/default/files/filings/ptc/21/11/ptc112921nadexdcm001.pdf
[NADEX-DEL]: https://www.cftc.gov/IndustryOversight/IndustryFilings/PTCDCMRules/48668
