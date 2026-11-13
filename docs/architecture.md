# Architecture

ClaimLint separates contract terms, evidence/world state, and evaluation time.
Its pure resolver is the single implementation of settlement decisions; the CLI
and adversarial runner invoke that same core.

See the [architecture diagram](assets/architecture.svg) for the execution loop
and the boundary around external governance.

## Inputs and trust

[`ClaimSpecV1`](../src/model.ts) records what the normalized contract says:
one metric, reporting period, comparator, strike, source hierarchy, clocks,
policies and binary payout. `EvidenceSet` separately records observations and
world events. `EvaluationContext` supplies the time of the decision; it is not
read from the machine's clock.

Runtime validation establishes shape and supported relationships, not truth.
A source ID and provenance URL are assertions about evidence, not signatures or
authenticated publications. The resolver trusts the supplied entity, metric,
definition, period, publication, availability and revision history. It does not
retrieve reports, identify a discontinuation or discover that an exchange has
initiated review. The [threat model](threat-model.md) defines these assumptions.

Two kinds of normalization must be distinguished. Contract normalization is the
human task of mapping a real contract and its incorporated rules into the finite
language. Evidence preparation similarly establishes which published scalar the
observation represents. Neither is implemented by v1. Runtime normalization is
the narrower mechanical work of parsing explicit instants, coalescing equivalent
records, resolving aliases and applying authorized unit conversions/rounding.
A valid runtime object does not establish that the external interpretation was
faithful.

## Modules and boundaries

`model.ts` defines runtime Zod schemas and inferred TypeScript types. Strict
objects reject unknown fields so misspelled policy names do not silently remove
behavior. `validation.ts` checks the relationships a structural schema cannot:
source identity/precedence, fallback cycles, time ordering, period bounds,
binary payout limits, and review-process requirements.

`decimal.ts` implements bounded finite base-10 arithmetic with integer
coefficients and decimal scales. This narrow arithmetic surface avoids a
configurable global precision context. It supports exact comparison, powers of
ten, and explicit rounding; it is not a general financial mathematics library.
The 128-character input budget is a resource constraint, not floating-point
precision. Counts, percentages, and three USD scales are the only units.

`time.ts` uses Temporal instants with explicit offsets. Period calendar labels
are contractual identities; the engine does not infer issuer fiscal calendars or
convert a label such as “Q4” into dates. Observation bounds are explicit instants
and must equal the referenced reporting-period bounds.

`resolver.ts` validates and normalizes inputs, applies temporal and authority
rules, selects eligible evidence, and makes an exact comparison or explicit
exception decision. It performs no I/O and never consults the current clock.
`scenarios.ts` builds deterministic adversarial states, while `check.ts` searches
generated states and checks relational properties using fast-check.

[`evidence.ts`](../src/evidence.ts) handles duplicate equivalence and revision
aliases. [`reference.ts`](../src/reference.ts) supplies a separate digit-string
comparison/rounding oracle for generated boundary checks; it is not used to
settle the claim. [`canonical.ts`](../src/canonical.ts) sorts object keys for
canonical JSON and computes report digests. Evidence and source order are
normalized by their domain rules, not by indiscriminately sorting every array.

`cli.ts` handles bounded file reads, arguments, output, and exit codes. Importers
can use the library without the CLI. A future natural-language importer could
produce a draft `ClaimSpecV1` for human review; it must not enter the resolver's
decision path.

## Resolver evaluation order

Each call to [`resolve`](../src/resolver.ts) follows the same ordered rules:

1. Validate the specification, evidence and context. An invalid specification
   returns `INVALID_SPEC`. Invalid library evidence/context returns `UNDEFINED`
   with a corresponding reason code; the CLI rejects these inputs before
   resolution and uses exit 2.
2. Check settlement eligibility, then establish the evidence cutoff. Before
   eligibility the result is `PENDING`; this is not a completeness judgment on
   the eventual mature state.
3. Filter observations/events by publication or occurrence and availability.
   Check visible identity integrity and coalesce equivalent observations.
4. Activate eligible sources and replacements, filter contractual identity and
   period, and apply source precedence and relevant contingency policies.
   Under precedence, irrelevant lower-authority ambiguity cannot select the
   financial outcome.
5. Apply publication/unit admissibility, validate relevant revision chains,
   process explicit correction/provisional policies and remove superseded
   evidence. Normalize permitted units and apply any rounding rule.
6. If no eligible observation remains, follow the missing-data policy. Otherwise
   handle unresolved source conflicts, select the authoritative scalar and make
   the exact comparison. Return a typed result with stable reason codes and a
   logical trace.

Only `YES` and `NO` are terminal financial determinations and include a payout.
`REVIEW_REQUIRED` is a defined, non-terminal route with a process ID; it does not
stand in for the review's eventual allocation. `UNDEFINED` distinguishes an
uncovered mature state or unusable evidence from ordinary pre-eligibility waiting.

## Clocks and finality

The contract orders these instants:

```text
observationStart < observationEnd <= publicationDeadline
                 <= determinationAt <= settlementAt
```

All decisions use `settlementAttemptAt` when supplied, otherwise `asOf`.
An attempt cannot be later than `asOf`. Before settlement eligibility the
resolver returns `PENDING`; the runner does not treat that as a vulnerability.

An observation must have both been published and become available to the
evaluation process by the admissible cutoff. `availableAt` means first known to
this evidence history, not an automatically trusted publication timestamp.
Future evidence cannot influence an earlier decision. A wrong entity, metric,
period, or unknown source cannot become authoritative merely by appearing in the
array.

`freezeAtDetermination` fixes the evidence cutoff at `determinationAt`;
`latestUntilSettlement` and `review` fix it at `settlementAt`. The same cutoff
applies to world events. Appending information first available after that cutoff does not
reopen a terminal decision. A backdated publication retrieved later is still
excluded. These policies require an honest, retained, append-only history.
Deletion, substitution, or falsification of old evidence is outside this
tested finality relation. There is no durable settlement ledger.

The correction cutoff and publication policy apply together.
`latestUntilSettlement` can admit an older publication first retrieved between
determination and settlement; it does not override `acceptUntilDetermination`
to admit a new publication after determination. Unsupported leap seconds are
rejected before Temporal can coerce them to the preceding second.

Absent correction behavior can be resolved for an uncomplicated initial release
yet become `UNDEFINED` when a linked restatement appears. An explicit correction
review policy routes a correction visible by settlement to review and ignores
information first available afterward. The catalogue tests both
before- and after-settlement corrections rather than assuming that a terminal
enum alone creates economic finality.

## Authority and normalization

Sources have unique IDs and unique positive priorities. Lower numbers denote
higher authority. Disagreement requires an explicit source-conflict policy;
the mere existence of priority numbers does not authorize an omitted exception
rule. Priority-based resolution cannot settle contradictory observations within
the same source. Revisions need an explicit predecessor relationship and a
coherent history.

Replacement sources name the source they replace. Validation rejects cycles,
unknown parents, and multiple replacements for one parent. Replacement behavior
requires a policy and a corresponding world event; listing a backup never
silently grants it concurrent authority. A replacement is active only when all
predecessors in its chain are unavailable. An outage does not erase an eligible
observation that was already available before the outage.

Replacement routing applies when replacement is actually needed. Eligible
cached evidence and independently authoritative sources remain usable without
inventing a replacement rule. Inactive backup outages and lower-priority outages
cannot override an eligible higher-priority source under precedence.

Identical observations with the same ID are idempotent. Conflicting contents
under one ID are an evidence-integrity failure. Deterministic sorting produces
stable evidence IDs and logical traces across input permutations. Traces record
major rule applications using codes and typed data, not wall-clock timing or
implementation-dependent object inspection.

Equivalent records with different ingestion IDs are coalesced before revision
selection. Equivalence retains all supplied payload fields (including revision
identity, provenance, and availability); parent aliases are resolved first.
USD scales are equivalent only when exact conversion is explicitly permitted.
Distinct revision identities are preserved even when their values happen to
agree. Alias mappings are visible in the trace. All relevant revision chains
are integrity-checked before a correction-review route can short-circuit them.

Unit conversion requires explicit permission. USD, USD millions, and USD
billions have exact power-of-ten relationships; percentages and counts are not
interchangeable. Explicitly rejected evidence can follow the missing-data rule.
Rounding applies to the normalized observed value using the named mode; the
strike remains exact. Without a rounding policy, the comparison is exact.

## Findings and reproducibility

Schema validity and semantic completeness are distinct. The runner does not
invent an omitted contract policy to reach a result. A mature `UNDEFINED` state
is a counterexample; an explicit review route is defined but non-terminal.
Reports distinguish invalid input, counterexamples, no counterexample found,
and inconclusive execution.

The named catalogue executes a concrete world built from the supplied spec for
each applicable scenario. Generated properties materialize additional worlds
from seeded fast-check choices and compare results or metamorphic relationships.
Both use the same resolver. Expected boundary behavior has a separate oracle;
other properties can still share assumptions with the scenario builders or
resolver. The [property assessment](adversarial-review.md#what-each-generated-property-actually-checks)
states each assertion and its blind spots.

Findings are typed records with stable codes, severity, property, explanation
and captured counterexamples; named findings also identify their scenario.
[`cli.ts`](../src/cli.ts) renders concise text or one JSON report on stdout. Text
output escapes terminal control characters in supplied labels. JSON retains the
full captured inputs/results needed to inspect a failure independently of the
summary. Skipped probes remain visible instead of being reported as passing.

Generated failures retain the property ID, seed, shrink path, shrunk world,
evidence/context, engine version, and normalized specification digest. Use the
same engine, lockfile, specification, property, run count, seed, and path for
replay. Changing generators or the fast-check version can change paths. The
JSON counterexample remains inspectable even when versions change.

The default is 1,000 runs per generated property, not 1,000 unique worlds.
`generated.executedRuns` sums fast-check runs across properties, which may stop
early or be inapplicable. Relational properties can call the resolver several
times; shrinking adds evaluations recorded separately in the failure details.
For valid specs, the digest covers the normalized spec with sources ordered by
priority. Invalid non-JSON library inputs instead receive a diagnostic digest;
it is not a contract hash. A digest identifies inputs, not their authenticity.

Named scenarios cover specific edge cases and give readable examples.
Generators search a finite family of world states. Metamorphic properties test
relationships such as permutation invariance and exclusion of future evidence;
they do not independently prove that the entire business interpretation is
correct. Review routes should be inspected by a human even when every check
passes.

The [adversarial review](adversarial-review.md) records the checks added
and remaining blind spots of every property. In particular, terminal uniqueness
is a status/payout consistency guard, and the generated fallback check exercises
a self-cycle; neither is a general proof of settlement semantics.

## Real-contract support gate

A faithful fixture needs a separate clause-by-clause model-fit assessment before
resolver results can be attributed to the real contract. Syntactically valid
scalar projections cannot establish faithful normalization. The
[ProphetX/Gemini case](../examples/real/prophetx-gemini-nov2026-100m/support-matrix.md)
demonstrates the boundary: date-level source composition, conditional collateral
return and Rule 5.2 settlement actions remain outside v1. The engine has no
venue-specific branch, void-to-NO mapping or hidden aggregation step. Its
synthetic scalar witnesses test isolated clauses; the real draft remains invalid.

The support classification is a research gate outside the resolver. A label such
as `VERIFIED_SUPPORTED_REAL_FIXTURE` would mean clause-by-clause model fit and
documented provenance, not formal verification or legal correctness. Neither
current real-contract case passes that gate. The
[24-contract survey](real-fixture-candidate-survey.md) records the wider attempted
falsification and its limitations.

A deterministic contingency can route a represented event to a named process.
An operator's independent invocation of review requires a separate input/state;
merely naming its process does not supply that invocation. v1 does not execute
governance actions, amended terms, discretionary allocations or resettlement.
