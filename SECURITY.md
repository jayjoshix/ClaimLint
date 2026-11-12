# Security

ClaimLint is a research/security tool for adversarial claim-resolution testing.
A passing report is not a formal proof, legal opinion, or regulatory approval.
Do not rely on this library as the sole authority for moving funds.

Security-relevant issues include incorrect exact arithmetic, use of unavailable
evidence, nondeterministic authority, invalid fallback traversal, false terminal
outcomes, and counterexample/replay failures. See the
[threat model](docs/threat-model.md) for the trust boundary.

For a non-sensitive reproducible issue, open a repository issue with the engine
version, lockfile/runtime version, synthetic ClaimSpec, evidence, explicit
evaluation context, expected and actual results, and seed/path where applicable.
Remove credentials, private contracts, and personal data first.

For a vulnerability involving deployed systems or confidential financial data,
use the repository host's private vulnerability-reporting facility when it is
enabled. If no private channel is published, request one without disclosing
exploit details. This repository does not invent an unmonitored security email
address or promise a response SLA.

The currently maintained development line is `0.1.x`. Dependencies and CI
revisions are pinned by the lockfile and workflow; ordinary tests do not fetch
market data or contact third parties.
