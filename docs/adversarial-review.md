# Adversarial review of the initial implementation

Reviewed baseline: `084a003` (engine `0.1.0`). Corrections use engine `0.1.1`;
generator changes intentionally invalidate old seed/path replay assumptions.
This records an adversarial engineering pass on the implementation, not an
external third-party audit or certification. Coverage is bounded.

- [Reproduced defects](#reproduced-defects)
- [What each generated property checks](#what-each-generated-property-actually-checks)
- [Areas where no arithmetic defect was found](#areas-where-no-arithmetic-defect-was-found)
- [Scope and documentation conclusions](#scope-and-documentation-conclusions)

The model, runtime validation, resolver, arithmetic, time handling, evidence
selection, scenario catalogue, generators, property assertions, reporting,
fixtures, tests, and documentation were read before runtime changes. Suspected
defects were exercised with raw observations independent of scenario builders.
New regression assertions were observed failing before their corresponding
runtime fixes. Existing passing tests were not treated as an oracle.

## Reproduced defects

### High: rounding concealed undefined source-conflict behavior

Invariant: adversarial coverage must exercise meaningful source disagreements.

Minimal change to the hardened fixture: strike `31.01`, rounding to one decimal,
and no `sourceConflict` policy. The old checker reported
`NO_COUNTEREXAMPLE_FOUND` for every generated run because its only nearby values
(`31`, `31.01`, `31.02`) all round to `31`. Independent observations `30` and `32`
instead yield `UNDEFINED / SOURCE_CONFLICT_POLICY_MISSING`.

The catalogue and generator now construct values distinct **after rounding**.
Generated conflict/revision families retain their mature, relevant preconditions
instead of allowing unrelated review events to mask them. Regression:
`rounded strike quantum cannot conceal an omitted source-conflict rule` in
[`check.test.ts`](../test/check.test.ts); it checks both named and generated
counterexamples. The test failed before the named fix, and its generated-check
assertion failed again before the generator was corrected.

### High: leap-second coercion admitted a late publication

Invariant: temporal integrity at the admissible cutoff.

With deadline and determination `2016-12-31T23:59:59Z`, `latePublication=reject`,
and publication/availability `2016-12-31T23:59:60Z`, the old resolver returned
terminal `YES`. Temporal silently constrained seconds `60` to `59`.

The input layer now rejects unsupported leap-second encodings before Temporal
conversion, including basic ISO, offset, fractional, and space-separated forms.
Regressions: `unsupported leap-second evidence must not collapse into an earlier
eligible instant` and the syntax table in
[`time-audit.test.ts`](../test/time-audit.test.ts). Before the fix, the combined
numeric/time audit run had 10 passes and 2 failures; all 12 subsequently passed.

### Medium: duplicate aliases resurrected superseded evidence

Invariant: duplicate invariance and revision ancestry.

`A(value=32, revision=v1)` plus `B(value=30, revises=A, revision=v2)` resolves
`NO` for `>31`. Adding another ingestion ID for A's otherwise identical payload
changed the result to `UNDEFINED / SAME_SOURCE_CONFLICT`: B superseded only A's
ID, leaving the stale copy as a competing head. Equivalent explicitly permitted
USD-scale copies had the same failure.

Evidence normalization now coalesces equivalent payloads and their parent
aliases before revision selection. A topological pass leaves cyclic components
for explicit integrity rejection. Distinct revision IDs and provenance remain
distinct; equivalence never comes merely from equal rounded values. Regressions
in [`lifecycle-audit.test.ts`](../test/lifecycle-audit.test.ts) cover copies before
the original lexicographically, references through either alias, revised-parent
aliases, USD conversions, and the distinct-identity guard.

### Medium: correction review hid malformed revision chains

Invariant: evidence integrity and independence from opaque ingestion IDs.

Under `corrections=review`, add one valid correction B and one correction Z with
a missing parent. The old engine returned `REVIEW_REQUIRED` upon visiting B;
renaming B and Z reversed their lexical order and returned `UNDEFINED`. Self
cycles and backward-time edges behaved similarly.

The resolver now validates all relevant chains before returning correction
review. Coherent revisions still take that explicit route. The missing-parent,
self-cycle, backward-time, and coherent-review tests are in
[`lifecycle-audit.test.ts`](../test/lifecycle-audit.test.ts).

### Medium: replacement policies overrode usable authority

Invariant: source authority and scope of replacement contingencies.

An eligible cached primary value `32` resolved `YES`. Appending a later primary
outage changed it to `UNDEFINED` when replacement policy was absent, or to review
under a review policy, although the cached evidence remained valid. Inactive
backup outages and lower-priority outages could also override an eligible
primary. A valid independently authoritative secondary source was incorrectly
made dependent on a replacement rule for the primary.

Replacement routing is now scoped to cases actually requiring replacement.
Cached evidence and independent authority remain usable; inactive or irrelevant
lower-priority events do not gain authority. Tests also preserve undefined/review
routes when replacement really is required. The initial 16 lifecycle regressions
had 5 passes and 11 failures before these fixes. The independently authoritative
and USD-alias extensions were each separately observed failing before correction.

### Medium: a valid temporal boundary crashed adversarial execution

Invariant: a checker must report its model boundary rather than fabricate a world
or crash while building one.

Setting only `settlementAt` to the maximum supported instant
`+275760-09-13T00:00:00Z` passed validation but made the old checker throw a
`RangeError` when generating evidence one second later. Future probes now report
`SKIPPED` when no supported successor exists. Regression:
`unrepresentable future instants are skipped rather than fabricated or crashed`
in [`check.test.ts`](../test/check.test.ts).

### Low: malformed library inputs crashed during hashing

The public checker accepts `unknown`, but `checkClaim(undefined)` failed in
digest construction after validation had already rejected it. Functions and
bigints also failed JSON hashing. Invalid inputs now produce `INVALID_SPEC`
reports with a digest of their validation diagnostics; only validated inputs
receive a contract digest. The regression is in
[`check.test.ts`](../test/check.test.ts).

## What each generated property actually checks

The original generator had three strike-relative values, two publication times,
no independent retrieval time, at most one event, and one revision edge. Several
targeted probes ignored almost all generated choices. Increasing run counts
would not fix those omissions.

The revised mixed generator varies signed fractional values, publication and
availability separately, period mismatch, source presence/disagreement,
provisional/final state, a linked revision, up to two events, duplicates, and
seeded ordering keys. Dedicated conflict/revision families reduce masking and
preserve meaningful failure conditions during shrinking. It still does not
generate arbitrary revision graphs, arbitrary source graphs, or arbitrary
policies; dedicated raw-input regressions exercise those important edges.

| Property               | Actual statement and remaining limit                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DETERMINISM`          | Repeating a normalized input gives the same complete result. Useful against hidden state; it cannot detect a consistently wrong business rule.                                                                        |
| `ORDER_INVARIANCE`     | Seeded permutations of observations and multiple events preserve the complete logical result. The former check only reversed arrays.                                                                                  |
| `TERMINAL_UNIQUENESS`  | Structural status/terminal/payout consistency. A single enum already prevents simultaneous statuses; this is not an independent uniqueness theorem.                                                                   |
| `TOTALITY`             | Mature materialized worlds avoid undefined/invalid/pending results. Coverage remains bounded by the generator and supplied policies. Review is defined, not completed settlement.                                     |
| `FINALITY`             | A terminal initial decision survives a later revision. Nonterminal or unrepresentable probes are skipped, not counted as successful finality cases. Raw tests additionally cover late retrieval and reordered inputs. |
| `TEMPORAL_INTEGRITY`   | Separately future publication or availability, and a future event, preserve the complete earlier result. Supported, schema-valid inputs and honest availability histories remain assumptions.                         |
| `SOURCE_PRECEDENCE`    | An eligible higher-priority value retains its financial decision after adding a lower-priority dissenter. Raw tests exercise ineligible sources, events, and bad lower-source revisions.                              |
| `EXACT_BOUNDARY`       | Boundary and broader values agree with an independent digit-string comparison/rounding oracle. The former oracle called the same arithmetic as the resolver.                                                          |
| `PAYOUT_BOUNDS`        | Terminal payouts equal the specified branch and remain within USD `[0,1]`, using independent comparison. It does not establish the economic suitability of that payout.                                               |
| `UNIT_SAFETY`          | Incompatible evidence gives the same financial decision as absent evidence and never reaches comparison. Checking only whether its ID appeared was insufficient.                                                      |
| `IDEMPOTENCE`          | Adding exact duplicate observations/events preserves the complete result. It formerly duplicated determinism's clone-and-repeat check. Alias regressions cover different ingestion IDs.                               |
| `FALLBACK_TERMINATION` | A generated self-cycle is rejected statically. It does not explore all graphs; validation bounds acyclic traversal, and explicit tests cover chains and cycles.                                                       |

An isolated mutation experiment changed production comparison to equate unequal
values with strike `31`. The old shared-oracle checker still reported no
counterexample and passed above-strike checks. The independent digit-oracle
checker reported `COUNTEREXAMPLE_FOUND` and failed both named and generated
boundary checks. No mutation hook was added to the product. Shrink paths remain
version-specific; full captured world inputs are the durable evidence.

## Areas where no arithmetic defect was found

An independent rational model compared signed fractions by cross multiplication
and rounded by bracketing decimal-grid neighbors. An exploratory 5,000-case run
passed; a retained 500-case regression property covers varied scales, signs,
rounding modes, and exact power-of-ten shifts. Explicit tests cover all six
comparators across USD scales, zero, malformed/canonical encodings, maximum
input length, and conversion results longer than the input budget. `31.0` and
`31.00` are deliberately rejected under the canonical input format, not silently
interpreted. No decimal arithmetic rewrite was warranted.

Nanosecond deadline/knowledge boundaries and offset-equivalent instants also
passed. Wrong periods cannot match the contract, incompatible dimensions do not
reach comparison, and existing cycle/priority validation remained useful.

## Scope and documentation conclusions

The README at the reviewed baseline already denied formal proof, legal
correctness, compliance and affiliation. Its claim that both demos had the same economic behavior needed
qualification: hardened rounding changes `31.04 > 31` from YES to NO. That choice
is now explicit. Correction cutoffs do not override publication admissibility;
`latestUntilSettlement` chiefly admits older publications retrieved later under
the current publication-policy vocabulary.

Review process IDs are asserted routing metadata. The engine does not establish
reviewer availability, independence, governance, or completion. `PENDING` also
includes waiting for contractual settlement eligibility; it is not an early
completeness assessment. Finality requires retained, honest, schema-valid input
history; replacing pre-cutoff facts is a changed input, not a stateless ledger
guarantee. Runtime resource limits and real-contract normalization remain outside
what passing generated cases establish.
