# Adding a verified real claim

No real contract fixture is shipped in v1. The official Kalshi templates examined
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
