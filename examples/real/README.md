# Real-contract research and support gate

Here, a verified supported fixture means its settlement-material terms have a
source-backed mapping into the executable model. It is an intake classification,
not formal verification or a claim of legal correctness. Neither current case
study passes that gate.

## Adding a faithfully supported claim

No fully executable real contract fixture is shipped in v1. The official Kalshi templates examined
on **2026-11-12** contain unbound parameters, discretionary exceptions, or
non-numerical criteria beyond the supported model. Silently binding those
parameters or replacing exchange discretion with invented policies would create
a synthetic claim mislabeled as real. See [the research notes](../../docs/prior-art.md).

The synthetic demo files are deliberately identified as synthetic. Their findings
say nothing about a real issuer's disclosures or a venue's contract quality.

To contribute a real fixture:

1. Obtain the complete official specification for one identified contract,
   including bound parameters, amendments, incorporated rulebook/version, source
   definitions, settlement timing, and exception/review provisions. Preserve a
   retrievable copy and its SHA-256 digest when redistribution is permitted.
2. Record publisher, document title, exact reference, contract identifier,
   publication/effective date, retrieval date, and archived reference/digest.
3. Provide a field-by-field mapping from source clauses to ClaimSpec. Record
   every manual interpretation, unit conversion, explicit time-zone conversion,
   and policy choice. Clearly mark unsupported clauses rather than omitting
   them or supplying convenient defaults.
4. Have another reviewer check the normalization against the original. If v1
   cannot represent the complete resolution logic, keep the material as a
   documented research case instead of an executable real fixture.
5. Store any example evidence separately with publisher, source release/version,
   publication time, availability/retrieval time, source reference, and digest.
   Distinguish real evidence from generated adversarial states.
6. Pin engine version, claim digest, seed, run count, and replay path with reports.
   A finding applies to that normalized specification under the tested model.
   A passing result is valid research output; do not edit the source rules to
   create a failure.

Suggested sidecar (documentation metadata, not an executable ClaimSpec):

```json
{
  "kind": "verified-real-contract-provenance",
  "publisher": "REQUIRED",
  "documentTitle": "REQUIRED",
  "contractId": "REQUIRED",
  "sourceReference": "REQUIRED",
  "effectiveDate": "REQUIRED",
  "retrievedAt": "REQUIRED ISO-8601 instant",
  "sourceSha256": "REQUIRED",
  "incorporatedDocuments": [],
  "normalizedFields": [],
  "interpretationDecisions": [],
  "unsupportedClauses": [],
  "reviewer": "REQUIRED"
}
```

Do not execute a fixture with unresolved `REQUIRED` fields. This placeholder is
an intake checklist, not a claim that any source has been verified or imported.

## Current real-world research case

[Zoom FY2027 customers over USD 100,000 TTM revenue, Above 4800](zoom-fy2027-customers-100k.provenance.md)
has a documented discovery record, an intentionally incomplete `.draft.json`,
and eight explicitly synthetic evidence sets. Original ANNUALKPI family rules,
the historical CFTC certification and Zoom filings are archived with hashes.
Those clauses expose genuine first-report, dynamic-expiry, conditional authority
and fair-price-payout limits in ClaimSpecV1. Exact market binding and the complete
governing rulebook version remain unverified. Required fields remain unbound
instead of inventing a valid full specification. Its `INVALID_SPEC` result must
not be described as a contractual ambiguity or a settlement-safety finding.

## ProphetX / Gemini volume support assessment

[CFTC product filing 65632](prophetx-gemini-nov2026-100m/provenance.md), the November
2026 USD 100m Gemini Titan volume contract, was assessed together with the October
23 series certification and Rulebook v4.0. The exact and series public attachments,
dated Rulebook, version corroboration and Gemini explanatory sources are archived
with retrieval metadata and digests. Confidential compliance appendices were not
public; their contents are not inferred.

This case also remains **unsupported**. Its [gate](prophetx-gemini-nov2026-100m/support-matrix.md)
records per-trade-date source composition, conditional collateral return and Rule
5.2 settlement action/finality requirements that a scalar binary claim with a
fixed cutoff does not fully express. A small VOID extension alone would not
establish support. No core changes were made. The incomplete draft's CLI results
and clearly synthetic clause/model-boundary witnesses are preserved separately;
passing a witness does not verify the whole real contract.

## Source distribution

Public research records include provenance, hashes, source URLs and synthetic
witnesses. Complete publisher bodies remain in ignored local archives and are
excluded from npm; they are not relicensed by this project. Tests explicitly
skip archive completeness when optional local copies are absent. See the
[source archive policy](../../docs/source-archives.md).
