# Threat model

ClaimLint searches for gaps and inconsistencies in a bounded executable model of
binary claim resolution. Its adversary controls plausible evidence states and
their arrival order. The objective is to find a mature unresolved state or a
violation of authority, boundary, temporal, payout, or finality properties.

## Assets and trust boundary

The assets are the correctness and reproducibility of the decision, the
separation of contractual terms from external evidence, and the audit trail.
The resolver trusts no array ordering, implicit clock, floating-point monetary
calculation, inferred source authority, or silent fallback policy.

It does trust that a human approved the normalized contractual terms and that
the supplied evidence history honestly records identity, publication,
availability, and revisions. A source ID is an asserted identity, not a verified
signature. A provenance URL is metadata, not an authenticated document fetch.
World events such as outages and corporate actions are external assertions; the
engine does not discover or substantiate them.

Finality under a fixed cutoff assumes append-only evidence. Later information
with an honest later availability timestamp cannot reopen the cutoff. An actor
able to delete evidence, rewrite timestamps, substitute document contents, or
alter the spec can change the input contract itself. There is no evidence
ledger, signature validation, durable settlement record, or authorization layer.

## Covered attacks and mistakes

Named scenarios and generated properties exercise exact equality, missing and
late publication, source disagreement/precedence, linked revisions, definition
and period mismatch, fiscal-calendar changes, unsafe unit comparisons,
rounding, source outages/replacement, corporate actions, provisional data,
duplicates, permutations, and future evidence. Static validation rejects
malformed precedence, replacement cycles, impossible time order, unsupported
payouts, and review routes without a named process.

Identical duplicates must be idempotent. Contradictory contents under one ID or
incoherent revision histories must not silently select a value. Lower-priority
evidence cannot win merely through arrival order. Future evidence must not
affect a past decision or a frozen final result. Tests compare full normalized
results, including logical traces where appropriate.

## Operational safeguards

Input schemas constrain sizes and decimal encodings. The CLI bounds file reads
to 8 MiB and accepts only regular files. Decimal coefficients use bounded-input
bigints; dates use explicitly offset Temporal instants. Fallback graphs are
validated before traversal. Generated-run counts and seeds are validated, and
the test suite is deterministic and offline.

These measures are practical budgets rather than a hardened hostile multi-tenant
service boundary. JSON decoding, schema validation, and repeated adversarial
execution consume CPU and memory. If exposed through a service later, isolate
processes and apply host-level resource limits. The v1 CLI itself is not a
hosted service.

## Limits of a passing report

`NO_COUNTEREXAMPLE_FOUND` means no tested state violated the tested properties.
Generators and curated cases can share modelling assumptions with the resolver
and can miss entire classes of real-world behavior. Seed/path reproducibility
is version-specific. A JSON counterexample is retained to support inspection
independent of fast-check shrink-path changes.

Routing every exception to review can make the executable model total while
leaving an economically weak or operationally unusable contract. Reports expose
these review routes; they do not assess reviewer independence, jurisdiction,
completion deadlines, evidentiary standards, or enforcement.

Out of scope: source manipulation/authenticity, scraping, publication discovery,
legal interpretation, oracle governance, payment execution, pricing, trading,
portfolio risk, arbitrary derivatives, discretionary amended terms, regulatory
approval, and formal proof. Real-fixture normalization must independently record
the source version, incorporated documents, and interpretation choices.

A further risk is mislabelling an incomplete projection as a supported real
contract. An offline aggregate can be numerically correct while omitting the
source-substitution and exceptional-outcome semantics the verifier is meant to
exercise. The [ProphetX support assessment](../examples/real/prophetx-gemini-nov2026-100m/support-matrix.md)
keeps these limits visible: its unsupported draft cannot produce a passing
real-contract report, and synthetic witness results are not settlement verdicts.
