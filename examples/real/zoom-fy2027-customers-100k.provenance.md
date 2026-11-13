# Zoom FY2027 customers over USD 100,000 TTM revenue: provenance

**Result: the numeric clause is representable; the complete settlement contract
is not faithfully representable in ClaimSpecV1.** This is a source-backed
research case, not a passing executable real-contract fixture. Core code is
unchanged. The adjacent `.draft.json` deliberately leaves required terms unbound
instead of manufacturing a valid specification.

## Identity and retrieval

| Item                                    | Value                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| Exchange / series                       | KalshiEX LLC / `KXZMA`                                                                |
| Event                                   | `KXZMA-27FEBCUST100K`                                                                 |
| Market                                  | `KXZMA-27FEBCUST100K-4800`                                                            |
| Question                                | Zoom FY2027 customer count over USD 100,000 trailing-twelve-month revenue, Above 4800 |
| Market page                             | <https://kalshi.com/markets/kxzma>                                                    |
| Referenced full-rules link              | <https://assets.kalshi.com/contract_terms/ANNUALKPI.pdf> (tracking query removed)     |
| Retrieved publisher counterpart         | <https://kalshi-public-docs.s3.amazonaws.com/contract_terms/ANNUALKPI.pdf>            |
| Discovery / original-document retrieval | 2026-11-12 / 2026-11-13                                                               |

The market's indexed public extract supplied its identifiers, annual/Q4 qualifier,
Fiscal.ai verification label, early-close statement, latest displayed close, and
projected payout delay. Direct page extraction returned a client-rendered shell;
no complete market HTML or market/series API body was archived. The
[discovery extract](sources/zoom-fy2027-customers-100k/discovery-extract.json) is
explicitly a normalized research record, not original HTML.

The full-rules link was not independently recovered from a complete market
response. A same-named document was obtained from Kalshi's official S3 host and
its regional counterpart. Those two retrieved bodies are byte-identical. The
`assets.kalshi.com` request itself failed, so byte equivalence with that particular
endpoint is **not** asserted. The current publisher-hosted family rules are not
proof of every parameter or amendment governing a specific position.

Some initial retrieval attempts failed; later attempts preserved the original
bodies listed below. Unsuccessful requests remain recorded in the source metadata.

## Preserved primary documents

Each original has its URL, UTC retrieval timestamp, size, and SHA-256 in the
linked manifest. Original PDF and complete-SEC-filing bytes are excluded from
line-ending conversion and automatic formatting. Bodies remain optional local
archives, excluded from Git and npm; source links below go to their publishers.
Tests validate public metadata and hash any bodies present locally, with explicit
archive-completeness skips when absent. See [archive policy](../../docs/source-archives.md).

| Original                                                                                                                                                                                                  | Contribution and limits                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ANNUALKPI publisher rules](https://kalshi-public-docs.s3.amazonaws.com/contract_terms/ANNUALKPI.pdf), [manifest](sources/zoom-fy2027-customers-100k/kalshi-annualkpi-s3-manifest.json)                   | Three pages; current retrieved family clauses. SHA-256 `eeb8ad625303ec4f16adb2755e55baabf659ec42fbb8fcbe5ec586758fe56ec6`. Specific market binding and effective version still need confirmation.                                                                              |
| [2025 ANNUALKPI certification](https://www.cftc.gov/sites/default/files/filings/ptc/25/08/ptc08142528785.pdf), [manifest](sources/zoom-fy2027-customers-100k/kalshi-annualkpi-cftc-manifest.json)         | Official [CFTC filing](https://www.cftc.gov/sites/default/files/filings/ptc/25/08/ptc08142528785.pdf), August 13, 2025. Its Appendix A differs materially from the retrieved publisher template; it is historical, not a substitute current version.                           |
| [FY2026 Zoom annual report](https://www.sec.gov/Archives/edgar/data/1585521/000114036126018249/ef20072035_ars.pdf)                                                                                        | Original [SEC annual report](https://www.sec.gov/Archives/edgar/data/1585521/000114036126018249/ef20072035_ars.pdf). KPI: PDF page 58 / printed 54. Fiscal calendar: PDF page 79 / printed 75.                                                                                 |
| [FY2027 Q2 10-Q](https://www.sec.gov/Archives/edgar/data/1585521/000158552126000121/0001585521-26-000121.txt)                                                                                             | Original [SEC complete filing](https://www.sec.gov/Archives/edgar/data/1585521/000158552126000121/0001585521-26-000121.txt), primary document `zm-20260731.htm`. Note 1 explicitly identifies FY2027 as ending January 31, 2027. MD&A supplies the metric context.             |
| [FY2026 Q4/full-year results](https://www.sec.gov/Archives/edgar/data/1585521/000158552126000026/0001585521-26-000026.txt)                                                                                | Original [SEC 8-K](https://www.sec.gov/Archives/edgar/data/1585521/000158552126000026/0001585521-26-000026.txt), Exhibit 99.1, release dated February 25, 2026. Annual customer count and customer definitions.                                                                |
| [FY2027 Q2 results](https://www.sec.gov/Archives/edgar/data/1585521/000158552126000119/0001585521-26-000119.txt), [Zoom source manifest](sources/zoom-fy2027-customers-100k/zoom-original-manifest.json)  | Original [SEC 8-K](https://www.sec.gov/Archives/edgar/data/1585521/000158552126000119/0001585521-26-000119.txt), Exhibit 99.1, release dated August 25, 2026. Quarterly definition/count comparison.                                                                           |
| [Historical Kalshi rulebook filing](https://www.cftc.gov/sites/default/files/filings/orgrules/24/11/rules1114248723.pdf)                                                                                  | Official [CFTC filing](https://www.cftc.gov/sites/default/files/filings/orgrules/24/11/rules1114248723.pdf), November 14, 2024, includes v1.14. Clean-copy PDF pages 106–109 cover settlement, review and source/expiry changes. **Not established as governing this market.** |
| [March 2026 rule amendment](https://kalshi-public-docs.s3.amazonaws.com/regulatory/notices/rules03022640155.pdf), [rulebook manifest](sources/zoom-fy2027-customers-100k/rulebook-original-manifest.json) | Official [Kalshi filing](https://kalshi-public-docs.s3.amazonaws.com/regulatory/notices/rules03022640155.pdf). Shows a review reference to Rule 7.1. Its natural-person-death provision is not applied to this KPI. This does not supply the complete governing rulebook.      |

## KPI: documented fact and interpretation

The [company-metric record](zoom-fy2027-customers-100k.kpi.json) records these
source-backed facts:

- The outcome is a **customer count**. USD 100,000 is the qualifying customer's
  revenue threshold, not the outcome unit or a market strike in dollars.
- The relevant population is Enterprise customers contributing more than that
  threshold over trailing twelve months. This is distinct from total Enterprise
  customers, net expansion, and Contact Center/Workvivo customer ARR metrics.
- A customer is a distinct buying entity; a paid user, organization, or distinct
  organizational unit may qualify. Enterprise business units are reached through
  direct sales, resellers or strategic partners.
- The archived annual/Q4 and quarterly definitions inspected are consistent.
  No change was identified between those materials; no claim is made about all
  history or the future FY2027 Q4 definition.
- FY2027 ends **January 31, 2027**. Interpreting a conventional annual interval
  gives February 1, 2026 through January 31, 2027 as calendar dates. The cited
  fiscal-year note does not supply an issuer timezone for exact instant mapping.
- FY2026 annual count 4,468 and FY2027 Q2 count 4,625 are historical context.
  Neither resolves the target annual FY2027 market. The target Q4/full-year
  report was still future at the research date.

SEC acceptance time is not silently used as company-publication time. Company
filings establish definition/calendar context; they do not make Fiscal.ai's
independently computed data authoritative under a rule requiring explicit
company reporting.

## Authority, timing and policy mapping

The [rule-coverage ledger](zoom-fy2027-customers-100k.rule-coverage.json) maps
each retrieved family clause to support, uncertainty, or a v1 limitation.

| Topic                    | Documented family rule                                                                                                                                                 | ClaimSpecV1 decision                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Condition                | Above is strict `>`; the market label supplies 4800.                                                                                                                   | `condition = { comparator: ">", strike: "4800" }`; `unit = count`.                                                                                                |
| Annual report            | Explicit company disclosure for the fiscal year; third-party derived figures do not qualify.                                                                           | Metric and annual-period labels retained. No quarterly customer snapshots are summed to fabricate this period-end count.                                          |
| Authority                | Broad company/regulator/news agency list, with a separate disclosure hierarchy. Specific numbers outrank vague statements even across that hierarchy.                  | `sources` remains unbound in the draft. The summary's Fiscal.ai label is not assigned priority 1. A channel/agency mapping cannot be silently inferred.           |
| Disclosure precedence    | Earnings release, prepared call remarks, concurrent presentation, company-specific numeric Q&A, government filings, in that order.                                     | Preserved as five ranked **disclosure types** in the coverage ledger; not confused with ranked news agencies.                                                     |
| Corrections              | First official report controls; later corrections do not affect resolution. A separate quarterly-sum path includes intra-year revisions if annual reporting is absent. | No existing correction policy expresses first-publication selection. The draft leaves it absent **because it is unsupported**, not because the contract omits it. |
| Reported ranges          | Closed ranges use a midpoint; exclusive open ranges produce Yes only when sufficient to establish Yes, otherwise No.                                                   | Single-value evidence cannot faithfully retain these cases; no range is coerced to a fabricated observed scalar.                                                  |
| Same-report disagreement | Differing values within one report may invoke Rule 7.1.                                                                                                                | Discretion is not replaced with automatic review or an unspecified source tie-break.                                                                              |
| Discontinuation          | Exchange-determined last fair market price.                                                                                                                            | Not representable as a fixed yes/no payout or an automatic review policy.                                                                                         |
| Corporate action         | Use the entity publishing the year's earnings after specified corporate changes.                                                                                       | Static identity plus a yes/no/review contingency is not reporting-entity substitution.                                                                            |
| Ordinary payout          | USD 1 settlement value and ordinary binary payout.                                                                                                                     | Draft has yes-side USD 1/0 payout; it does **not** claim to represent exceptional allocations.                                                                    |
| Review / missing value   | Rule 7.1 review and payout determination are discretionary.                                                                                                            | An automatic `missingData=review` would invent stronger behavior than the text. Governing complete Rule 7.1 remains unverified.                                   |

The template provides 10 a.m. ET expiration, earlier expiry under Rule 7.2, and
settlement no later than the following day unless under review. Its unbound
`<date>` is described as at least one year after expected fiscal-year end. The
market extract instead displays latest close May 25, 2027, 1 a.m. EDT, plus an
early-close statement and projected 30-minute payout. These are not interchangeable
clocks. The date/source association and any overriding bound terms require
confirmation. This apparent mismatch is **B normalization uncertainty**, not an
established category A defect.

The template itself identifies several genuine **C model limitations**: dynamic
expiry, first-publication finality, conditional authority/precision, ranges,
reporting-entity substitution and fair-price allocation. There is no faithful
full v1 fixture merely by assigning fixed clocks or routing every exception to
review. No scope expansion or engine patch was made to hide these boundaries.

## Evidence and executable regression coverage

Eight candidate EvidenceSets are explicitly **synthetic**: above 4800, equality,
below, unavailable publication, later publication, wrong fiscal period,
first-report correction, and specific-number disclosure disagreement. Future
timestamps and UTC period labels are test assumptions, not Kalshi dates or a
prediction of Zoom results. Local channel IDs refer to the family hierarchy.

The correction example is meaningful now that the full family rule is obtained:
initial 4,801 followed by 4,799 would retain the first report if eligible under
the actual terms. A test-only synthetic completion demonstrates that v1's fixed
correction policies instead produce NO or review when both releases precede the
cutoff. This is an explicit **model-boundary witness**, not a fabricated real
contract or an engine bug. The synthetic completion is not shipped as a valid
real ClaimSpec.

Disclosure disagreement uses an earnings release and government filing with
specific conflicting values in a hypothetical reporting event; it does not
invent conflicting authoritative Fiscal.ai publications. Full-year versus
prior-period cases remain separate.

All eight resolutions of the incomplete draft return `INVALID_SPEC`, not real
payout determinations. The [captured CLI assessment](zoom-fy2027-customers-100k.assessment.json)
records validate, resolve and check outputs. Its four `CL001` diagnostics are
`reference.reportingPeriod.end`, `reference.reportingPeriod.start`, `sources`,
and `timing`. The checker executes **zero** named/generated cases. Those schema
diagnostics describe the deliberately incomplete draft. The invalid-spec digest
fingerprints validation diagnostics, not a complete contract specification.

## Classification and conclusion

| Class                                           | Assessment                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A — actual contractual ambiguity/incompleteness | **Not established.** Do not infer missing terms from failed retrieval or unsupported model behavior.                                             |
| B — normalization uncertainty                   | Applicable complete rulebook/version, exact bound date/source association, and equivalence to the assets-host endpoint remain unverified.        |
| C — modelling limitation                        | Multiple specific documented family clauses do not fit ClaimSpecV1. A source-linked ledger and correction-policy witness preserve them honestly. |
| D — engine bug / false positive                 | No new core bug is asserted. Calling these draft diagnostics Kalshi vulnerabilities would be a false attribution.                                |

The historical 2025 certification and current retrieved family rules differ;
neither an older template nor a historical rulebook is silently promoted to
current governing terms. Full field mapping and binding require clarification
of the exact market metadata and incorporated version. Even after that,
unsupported clauses must remain visible. This case is appropriate as an honest
**unsupported-contract research example**, not as ClaimLint's first successful
complete real-world verification.
