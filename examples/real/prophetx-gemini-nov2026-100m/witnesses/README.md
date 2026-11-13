# Synthetic model-boundary witnesses

Every value in this directory is invented. No file is an actual Gemini report, a ProphetX settlement, or a supported normalization of the real contract.

`scalar-claim.json` is a valid **synthetic scalar projection**. It tests the documented strict threshold and fixed correction cutoff only after assuming a complete monthly USD amount. Its whole-period source precedence cannot implement the real contract's per-trade-date source selection. It deliberately leaves missing-data and review rules absent rather than inventing substitutes for void/collateral return or Rule 5.2.

`above.json`, `exact.json` and `below.json` are typed EvidenceSets for that synthetic claim. The cent values demonstrate `100000000.01 => YES`, `100000000 => NO` and `99999999.99 => NO` within the projection. Canonical strings omit trailing fractional zeros.

The clock envelope assumes the filing's expected ET hours continue to apply. The start is October 31 at 17:00 EDT (`21:00Z`); the half-open end is November 30 at 17:00 EST (`22:00Z`). This envelope lasts 721 hours because the first covered trade date spans the DST transition. The literal filing ends at `16:59:59` and attributes volume by reported trade date, so the half-open envelope is an explanatory assumption, not replacement contract language. The cutoff assumes two following weekdays; this does not establish an incorporated holiday calendar. The assumed settlement instant is only a test context.

`per-date-fallback.json` contains 30 invented daily USD contributions, already multiplied by an assumed USD 1 settlement value. The first date contributes USD 60 million from primary, the second USD 50 million from secondary because primary is absent, and all other dates contribute primary zero. Contractual per-date selection gives USD 110 million. Relabelling incomplete primary/secondary totals as competing complete monthly observations gives USD 60/50 million and changes the scalar answer to NO. That relabelling is **invalid normalization**, not an engine defect or a real ProphetX result.

The tests also show that daily periods are rejected by a whole-period claim and that the current schema cannot express a void/collateral-return policy. They do not map the contract's defined void outcome to UNDEFINED or NO. Fixed-seed properties use independent integer cents and operate only on this synthetic projection.
