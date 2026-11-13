# Prior art and source notes

Research date: **2026-11-12**. These are conceptual references, not imported
rules, affiliations, endorsements, or compliance claims. ClaimLint implements
neither CDM nor ACTUS and does not reproduce an exchange's adjudication process.
The ordinary test suite uses synthetic evidence and needs no network access.

## CFTC event-contract material

The Division of Market Oversight's March 12, 2026 advisory discusses the nature
and sources of settlement data, computational procedures, accuracy, reliability,
impartiality, and risks of manipulation. It expects product submissions to
identify specific settlement sources and address differing contract
permutations. The July 24 advisory further addresses broad template
certifications that obscure different sources and methodologies. These are
staff advisories concerning regulated venues, not a certification scheme for
software libraries. See [Staff Letter 26-08, pp. 4–5](https://www.cftc.gov/csl/26-08/download)
and [Staff Letter 26-22, pp. 1–4](https://www.cftc.gov/csl/26-22/download).

The 2024 event-contract proposed rule and September 2025 sports advisory were
withdrawn on February 4, 2026. They must not be presented as current requirements.
See the Commission's [withdrawal announcement](https://www.cftc.gov/PressRoom/PressReleases/9179-26).

ClaimLint's design inference is to make sources, calculations, timing, and
exceptions inspectable. A deterministic resolution trace does not establish
source authenticity, resistance to manipulation, legal enforceability, or
compliance. The cited advisories also do not establish that passing this tool's
tests fulfills any regulatory obligation. Review routing is a modelling choice;
ClaimLint does not implement legal dispute resolution.

## Kalshi

Kalshi's help documentation says each contract specifies the outcome rules,
information, and information source. Determination follows expiration and can
depend on when source-agency information arrives. This supports distinguishing
observation, publication, determination, and settlement clocks. A general help
page is not a substitute for the full terms of a specific market. Source:
[Market Outcomes](https://help.kalshi.com/en/articles/13823826-market-outcomes),
dated March 17, 2026.

The published COMMODITIES template illustrates why normalization needs care:
it distinguishes comparison operators, reported precision, corrections,
missing data, and source replacement. Replacement can involve exchange
discretion and the template still contains unbound parameters. The ALIENS
template also provides a discretionary review route and exceptional payout
authority. Neither document is a complete, parameter-bound numerical claim
that can be faithfully copied into ClaimLint v1 without interpretation.
Sources: [COMMODITIES, pp. 1–3](https://kalshi-public-docs.s3.amazonaws.com/contract_terms/COMMODITIES.pdf)
and [ALIENS, pp. 1–2](https://kalshi-public-docs.s3.amazonaws.com/contract_terms/ALIENS.pdf).
Their published templates were inspected on the research date; no assertion
about the rules governing a particular historical position is made.

The design inference is that explicit review is defined behavior, while an
omitted rule is a semantic gap in the normalized model. ClaimLint must not call
a venue's contract defective merely because its discretion, incorporated
rulebook, or exception cannot be expressed in v1.

## ISDA Common Domain Model / FINOS CDM

CDM describes products, trades, and lifecycle processes at a substantially
broader scope. The official product-model documentation describes economic
terms, composable payout types, observables, settlement terms, and qualification
functions. ClaimLint takes inspiration from explicit typed terms; it is neither
a substitute for those lifecycle models nor a CDM adapter. Its single binary
comparison does not implement CDM's product coverage.

Source: FINOS, [Product Model](https://cdm.finos.org/docs/next/product-model/),
particularly "Payout", "SettlementTerms", and "Product Qualification".
This is the publisher's **next-version** documentation, not a claim of
compatibility with a specific CDM release. ISDA's
[CDM overview](https://www.isda.org/isda-solutions-infohub/cdm/) appeared in
search but returned HTTP 403 on direct retrieval; detailed claims here rely on
the accessible FINOS documentation instead.

## ACTUS

ACTUS maps contractual terms to contractual events. Its technical specification
separates contract attributes from the Risk Factor Observer interface. The
observer supplies changing external factors and supports user-defined future
assumptions. This directly motivates separating ClaimSpec, EvidenceSet, and
EvaluationContext from a deterministic resolver. That separation alone does not
make ClaimLint an ACTUS implementation, contract type, or compatible simulator.

Sources: ACTUS [Technical Specification overview](https://www.actusfrf.org/techspecs)
and the official [technical specification source](https://github.com/actusfrf/actus-techspecs/blob/master/actus-techspecs.tex),
sections "Contract Attributes" and "Risk Factor Observer". The `master` source
is a mutable research reference; ClaimLint imports no code or standard content
from it. A reproducible fixture should pin its own source version and digest.

## What these references do not establish

No reference proves ClaimLint's model complete, the normalized fixture legally
faithful, or a passing claim correct in all possible worlds. Named scenarios and
seeded generated checks search a bounded model for counterexamples. Review
routes can eliminate undefined paths while leaving substantial operational and
governance risk. A report must make that distinction visible.
