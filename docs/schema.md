# ClaimSpecV1 and evidence reference

The authoritative runtime definitions are in [`src/model.ts`](../src/model.ts).
Version `1.0` uses strict objects. Unknown keys, unsupported comparators, invalid
decimal strings, or invalid instants fail validation. Optional policies can be
absent intentionally; the resolver reports a gap when the associated mature
state actually occurs.

## Contract fields

| Field                                                  | Meaning                                                                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`, `id`, `title`, optional `description` | Versioned identity and human-readable context.                                                                                    |
| `reference`                                            | Stable entity, metric, and definition IDs; explanatory names/definition; unit; exact reporting-period identity and bounds.        |
| `condition`                                            | One of `>`, `>=`, `<`, `<=`, `==`, `!=`, with an exact canonical decimal strike.                                                  |
| `sources`                                              | Stable IDs, names, unique integer priorities, optional reference, optional replacement parent. Lower priority number is stronger. |
| `timing`                                               | Observation interval, publication deadline, determination instant, and settlement eligibility instant.                            |
| `policies`                                             | Explicit behavior for exception states; absent behavior is not guessed.                                                           |
| `payout`                                               | USD payouts for yes/no, each in `[0,1]` and distinct. No arbitrary payoff function.                                               |
| optional `provenance`                                  | Synthetic or normalized-public origin, publisher/document, retrieval/reference, normalized fields, and interpretation notes.      |

Canonical decimal examples: `"0"`, `"31"`, `"-0.01"`, `"30.95"`. Reject
`31` (JSON number), `"31.0"`, `"1e3"`, `"+1"`, `"01"`, and `"-0"`.
Values are limited to 128 characters. Supported units are `USD`, `USD_million`,
`USD_billion`, `count`, and `percent`. A percent is a percentage-point number;
the model does not infer fractions or basis points.

Every instant requires an explicit offset; equivalent offset timestamps
normalize to the same UTC instant. Reporting periods contain `id`, `start`,
`end`, and `calendar`. All four matter. Calendar is an identity label rather than
an inferred schedule. Changing a period ID, its bounds, or its calendar does not
silently retarget a claim.

Leap seconds (`:60`, including basic ISO time encodings) are unsupported and
rejected rather than silently mapped to `:59`.

## Policies

| Policy                                                                          | Supported values and effect                                                                                                                                                               |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missingData`                                                                   | `yes`, `no`, or `review` when no eligible observation exists at maturity.                                                                                                                 |
| `latePublication`                                                               | `acceptUntilDetermination`, `reject`, or `review`. Publication deadline is distinct from evidence availability.                                                                           |
| `sourceConflict`                                                                | `precedence` selects the valid higher-priority source; `review` routes disagreement to review.                                                                                            |
| `corrections`                                                                   | `freezeAtDetermination`, `latestUntilSettlement`, or `review`. Fixed cutoffs prevent later evidence reopening a result. `review` considers corrections known by settlement, then freezes. |
| `sourceReplacement`                                                             | `fallback` enables the declared replacement graph on relevant world events; `review` requests review.                                                                                     |
| `metricDiscontinuation`, `definitionDrift`, `calendarChange`, `corporateAction` | Each supports `yes`, `no`, or `review`; no automatic economic transformation is inferred.                                                                                                 |
| `provisional`                                                                   | `finalOnly`, `accept`, or `review`. Ignoring provisional data can lead to the missing-data route.                                                                                         |
| `units`                                                                         | `exact` requires the reference unit; `convertUSD` permits only exact conversion between USD scales.                                                                                       |
| rounding                                                                        | Object with decimalPlaces 0..36 and mode halfEven, halfUp, or truncate; rounds the normalized observation. Absence means exact comparison.                                                |
| `dispute`                                                                       | A stable `processId` and description, optionally a reference. Every `review` policy requires this object.                                                                                 |

The policies are a finite executable language, not a representation of every
possible contract clause. In particular, a `yes` or `no` exception route means
the drafter explicitly chose that payout. It is not a recommendation about the
economics of missing data. A review route gives a process identifier and stops;
the engine cannot determine how humans will adjudicate it.

## EvidenceSet

An evidence file is an object with `observations` and optional `events` arrays.
The runtime limit is 10,000 observations and 1,000 world events; the CLI also
limits each input file to 8 MiB.

An observation carries a stable `id`, `sourceId`, `entityId`, `metricId`,
`definitionId`, canonical `value`, `unit`, complete `reportingPeriod`,
`publishedAt`, `availableAt`, and `status` (`provisional` or `final`). Optional
`revisionId` labels the revision, while `revises` explicitly links the predecessor
observation ID. Optional `provenance` is a string metadata map. No array index is
a source rank, revision ordering, or tie-break rule.

`availableAt` records when the evidence became available to the evaluation
process. For eligible observations, it cannot precede publication. An observation
must satisfy both temporal conditions. An old publication with a newly observed
availability timestamp cannot be inserted retroactively into a frozen snapshot.

Duplicate payloads under different ingestion IDs are aliases, including exactly
equivalent USD scales only when conversion is permitted. Revision identity,
provenance, publication, and availability must agree; distinct revision identities
are not merged. Parent aliases are resolved before selecting current revisions.
The trace records any alias mapping.

A world event has a stable `id`, authoritative `sourceId`, `entityId`, `type`,
`occurredAt`, and `availableAt`, optionally `metricId` and `detail`. Supported types
are `sourceOutage`, `sourceReplacement`, `metricDiscontinuation`,
`definitionDrift`, `calendarChange`, and `corporateAction`. These are supplied
evidence assertions; ClaimLint does not detect them from the outside world.

## EvaluationContext and results

`asOf` is required. Optional `settlementAttemptAt` is the historical evaluation
instant and must not exceed `asOf`. The core has no default wall clock.

Results include `engineVersion`, `status`, `terminal`, `reasonCodes`, sorted
`evidenceUsed`, and `trace`. Only terminal `YES`/`NO` results include an exact
USD `payout`; defined review results include `reviewProcessId`. Trace steps use a
stable `code` and typed `data` fields. See the README's status table and the
architecture document for finality assumptions.

## Findings and check reports

A finding contains `code`, `severity`, `property`, `summary`, `explanation`, and
optional `scenarioId`, `remediation`, and `counterexample`. Findings describe
observed failures under the current model; omitted policies are not all flagged
without execution. The code registry is:

| Code    | Class                                                              |
| ------- | ------------------------------------------------------------------ |
| `CL001` | Schema or supported binary-payout violation.                       |
| `CL002` | Source identity, priority, or replacement configuration violation. |
| `CL003` | Timing, fallback-cycle, or policy relationship violation.          |
| `CL004` | Mature missing-data/totality counterexample.                       |
| `CL005` | Source conflict or replacement ambiguity.                          |
| `CL006` | Correction/revision ambiguity.                                     |
| `CL007` | Undefined late-publication behavior.                               |
| `CL008` | Undefined structural-event behavior.                               |
| `CL009` | Undefined unit behavior.                                           |
| `CL010` | Undefined provisional-data behavior.                               |
| `CL011` | Finality relation violation.                                       |
| `CL012` | Another tested invariant violation.                                |
| `CL013` | Inconclusive property execution.                                   |

Reports distinguish `INVALID_SPEC`, `COUNTEREXAMPLE_FOUND`,
`NO_COUNTEREXAMPLE_FOUND`, and `INCONCLUSIVE`. Named cases include `PASS`, `FAIL`,
`DEFINED_REVIEW`, or `SKIPPED`; generated properties can also be inconclusive.
Skipped cases do not count as tested states. Review routes remain visible even
in a report with no counterexample.

The generated `executedRuns` count sums fast-check runs across properties, not
unique worlds or resolver calls. Relational properties can execute several
resolutions per generated state. Shrinking performs additional evaluations that
are recorded through the counterexample's shrink count and path rather than
added to this run count.
