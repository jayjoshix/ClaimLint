# ClaimLint

ClaimLint searches for counterexamples in the settlement semantics of **binary,
externally resolved claims**. It combines a pure deterministic resolver, named
adversarial evidence states, and seeded property-based testing.

A claim such as “Northstar Q4 cloud net sales > USD 31 billion” can look precise
while leaving missing publications, restatements, conflicting sources, or
definition changes unresolved. ClaimLint executes those states and reports the
rule that applies—or the rule that is missing.

It does not predict outcomes, authenticate publications, price contracts, trade,
adjudicate disputes, or certify regulatory compliance. There is no LLM in the
decision path.

## Two-minute example

Use Node.js 24 and pnpm 10.30.3. Dependencies are locked; the ordinary test suite
does not access the network.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build

pnpm claimlint check examples/broken-demo.json
pnpm claimlint check examples/hardened-demo.json
```

Both fixtures describe the same fictional economic claim. The broken fixture is
schema-valid but omits exception policies. Its check returns
`COUNTEREXAMPLE_FOUND`, with concrete `UNDEFINED` resolutions for mature evidence
states. The hardened fixture defines those policies and should return
`NO_COUNTEREXAMPLE_FOUND` under the current model. Its review routes remain
visible: a defined review process is not a completed financial determination.

Each report gives the number of named scenarios, generated property cases
actually executed, seed, engine version, and specification digest. Defaults are 1,000 runs
**per generated property** and seed `18472941`; properties can stop early on a
failure. These tests do not formally prove settlement correctness.

The fixtures are synthetic. No real market rule has been silently rewritten to
produce a finding. See [real-fixture provenance requirements](examples/real/README.md).

## Commands

```sh
pnpm claimlint validate examples/broken-demo.json

pnpm claimlint resolve examples/hardened-demo.json \
  --evidence examples/evidence/exact-strike.json \
  --as-of 2027-02-05T12:00:00Z --format json

pnpm claimlint check examples/hardened-demo.json \
  --runs 10000 --seed 18472941 --format json
```

`validate` checks schema and domain constraints. It deliberately accepts absent
exception policies: omitted contractual behavior is a subject for adversarial
execution, rather than a JSON syntax error.

`resolve` evaluates one evidence set at an explicit time. Optional
`--settlement-at` pins the decision time of a historical settlement attempt and
must be no later than `--as-of`. No command reads the system clock to decide a
claim. After building, `node dist/cli.js` provides the same CLI; the package's bin
name is `claimlint`.

`check` runs static validation, the named catalogue, and generated properties.
Use `--property <ID>` to select one generated property. A failed generated check
includes its seed, shrink path, minimal counterexample, evidence/context, engine
version, and specification digest. Replay it with the same engine, lockfile,
specification, seed, run count, property, and path:

```sh
pnpm claimlint check examples/broken-demo.json \
  --runs 1000 --seed 18472941 --property TOTALITY --path '<reported-path>' \
  --format json
```

JSON mode emits one structured object on stdout, including input errors; text
mode gives the scenarios, findings, and resolution trace. Core commands never
prompt. Input files must be regular JSON files of at most 8 MiB each.

| Exit | Meaning                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------- |
| `0`  | Valid execution with no error-level counterexample; a resolution can still be pending or require review. |
| `1`  | Semantic counterexample or an `UNDEFINED` single resolution.                                             |
| `2`  | Invalid specification/input/options, tool failure, or inconclusive check.                                |

## Resolution semantics

```ts
resolve(claimSpec, evidenceSet, evaluationContext): ResolutionResult
```

The resolver has no I/O, network, randomness, database, implicit clock, or global
mutable state. Contract terms, external observations/world events, and evaluation
context are separate runtime-validated inputs.

| Status            | Meaning                                                                            | Terminal financial determination |
| ----------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| `YES` / `NO`      | The defined comparison or explicit exception rule selects an exact bounded payout. | Yes                              |
| `PENDING`         | Settlement is not yet eligible under the contractual clock.                        | No                               |
| `REVIEW_REQUIRED` | An explicit policy routes to the contract's named review process.                  | No                               |
| `UNDEFINED`       | A mature state has no applicable rule, or evidence cannot be coherently used.      | No                               |
| `INVALID_SPEC`    | Schema/domain constraints prevent coherent interpretation.                         | No                               |

Only terminal determinations include a payout. Review is defined behavior for
totality checking, but ClaimLint neither runs that process nor guarantees its
outcome or completion.

Every result includes stable reason codes, evidence IDs, and a typed logical
trace. Authority comes from unique source IDs and priorities; array order never
chooses the winning observation. Linked revisions, reporting-period identity,
definition identity, publication time, and availability time affect eligibility.

Values are canonical finite decimal strings. An integer coefficient and decimal
scale use `bigint` for exact comparison, USD scale conversion, and specified
rounding. Monetary values are never converted to JavaScript `number`; inputs are
bounded to 128 characters to constrain resource use. Other currencies, FX,
incompatible dimensions, and arbitrary payoff functions are unsupported.

All timestamps require explicit ISO-8601 offsets and are normalized through
Temporal. A correction policy freezes the admissible evidence at determination
or settlement time. Later retrieval cannot retroactively enter that snapshot,
even if its publication timestamp is older. Finality assumes an append-only,
honest evidence history; it is not a persisted or cryptographically verified
settlement ledger.

## Engineering and scope

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI runs these checks with pinned action revisions. CLI integration tests execute
the actual command and check its JSON and exit codes. Generated tests use
fast-check with shrinking and deterministic seed/path replay.

- [Architecture and evaluation order](docs/architecture.md)
- [Schema and policy reference](docs/schema.md)
- [Threat model and trust assumptions](docs/threat-model.md)
- [Primary-source prior art](docs/prior-art.md)
- [Security reporting](SECURITY.md)

Formation's memo, CFTC material, Kalshi rules, CDM, and ACTUS inform the design;
ClaimLint implements none of those systems and claims no affiliation,
endorsement, or compliance. The [source notes](docs/prior-art.md) distinguish
retrieved documentation, proposals, withdrawals, and engineering inferences.

The v1 model is deliberately finite. It does not express arbitrary contracts,
general corporate-action transformations, discretionary amended terms,
multi-currency payouts, payment execution, review adjudication, or natural
language interpretation. A passing report is evidence about the exercised model
and generators. It cannot establish that a real contract was normalized
faithfully or that the evidence was true.

Licensed under [Apache 2.0](LICENSE).
