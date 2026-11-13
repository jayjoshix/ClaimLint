# Model-fit gate: ProphetX filing 65632

**Outcome C — UNSUPPORTED_CASE_STUDY.** Engine 0.1.1. No core extension.
The [JSON matrix](support-matrix.json) records clause references and classifications
for every row; [provenance](provenance.md) explains the original documents and
interpretations. This is a fit assessment, not a contract-quality score.

| ID   | Settlement-material requirement                                      | Support                                                                                                                                |
| ---- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| PX01 | Strict USD 100m threshold, equality NO                               | SUPPORTED EXACTLY                                                                                                                      |
| PX02 | Ordinary USD 1/0 YES-position payout                                 | SUPPORTED EXACTLY                                                                                                                      |
| PX03 | Transaction aggregation, fractions, settlement multipliers and cents | UNSUPPORTED (verification can be delegated to trusted offline evidence preparation, not claimed as engine coverage)                    |
| PX04 | Permitted publications and excluded statistics                       | UNSUPPORTED (provenance assertions are trusted, not executable exclusion rules)                                                        |
| PX05 | Reported trade dates, expected ET clock envelope                     | APPROXIMATED — NOT ACCEPTABLE FOR VERIFIED FIXTURE                                                                                     |
| PX06 | Identity and order of the three source tiers                         | SUPPORTED EXACTLY (application separately assessed below)                                                                              |
| PX07 | Per-trade-date fallback, completeness and substitution disclosure    | UNSUPPORTED                                                                                                                            |
| PX08 | Outcome-changing disagreement / disruption                           | UNSUPPORTED                                                                                                                            |
| PX09 | Second-business-day cutoff and expiration                            | UNVERIFIED (governing business-day calendar not established)                                                                           |
| PX10 | Publication snapshot and pre-/post-cutoff correction rule            | APPROXIMATED — NOT ACCEPTABLE FOR VERIFIED FIXTURE (ordinary scalar clause tested, publication/evaluator availability remain distinct) |
| PX11 | Changed/absent data, same-data alternatives, sufficient partial data | UNSUPPORTED                                                                                                                            |
| PX12 | Conditional void and collateral return                               | UNSUPPORTED                                                                                                                            |
| PX13 | Settlement window and review-dependent delay                         | APPROXIMATED — NOT ACCEPTABLE FOR VERIFIED FIXTURE                                                                                     |
| PX14 | Finality subject to Rule 5.2 actions, allocation and resettlement    | UNSUPPORTED                                                                                                                            |
| PX15 | Concurrent emergency powers and dispute boundaries                   | UNSUPPORTED                                                                                                                            |

The gate requires **every** material term to be SUPPORTED EXACTLY or SUPPORTED
WITH JUSTIFIED GENERAL EXTENSION. No requirement is marked as supported after
extension because none was implemented.

A generic `VOIDED` with a collateral-return disposition could represent one real
term, and partitioned source selection could represent date-level fallback. Even
together they would leave the Rule 5.2 allocation/action lifecycle and the
reasonable-determination standard unrepresented. A partial extension would not
earn the verified label. No broad DSL, exchange interpreter or discretionary
adjudicator was added.

The candidate December 2 cutoff is explicitly conditional, not a silently
selected holiday calendar. No missing real rule was replaced by a convenient
policy. The incomplete draft is kept invalid so ordinary CLI reports cannot be
mistaken for verification of the complete contract.
