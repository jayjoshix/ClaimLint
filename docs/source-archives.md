# Source provenance and local archives

ClaimLint publishes its own research notes, source URLs, retrieval dates,
SHA-256 digests, model-fit assessments and explicitly synthetic evidence. It does
not redistribute the complete third-party documents collected during research.
Publisher originals and page-reader extracts remain in ignored local archive
directories; they are also excluded from the npm package. The ignored `.cache/`
directory contains working research files, not public evidence artifacts.

The source manifests distinguish original response bodies, reader extracts,
access-challenge responses and failed retrievals. A failed request is not evidence
that a rule does not exist. A recorded SHA-256 identifies the particular bytes
reviewed; it does not authenticate the publisher, establish governing-version
applicability or grant redistribution rights.

## Public records and private archive copies

| Public research record                                                          | Optional local bodies                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `examples/real/sources/zoom-fy2027-customers-100k/*.json`                       | Publisher PDFs and complete SEC filing text in the same directory                           |
| `examples/real/prophetx-gemini-nov2026-100m/sources/*-manifest.json`            | Publisher PDFs, HTML, API specifications and labelled reader extracts in the same directory |
| Case-study provenance, support assessments, CLI reports and synthetic witnesses | Temporary fetch scripts and working notes under `.cache/`                                   |

These local copies were preserved when the public distribution policy was
changed; they were not deleted or rewritten. The project does not infer that
a privately authored filing is a US-government work merely because the CFTC or
SEC hosts it. Availability from a public URL is not itself a redistribution
license. ClaimLint's Apache 2.0 license covers its original contributions, not
the external publications identified by the manifests.

## Rechecking a source

Use the manifest's exact URL, document date, retrieval timestamp and digest.
Retrieve a copy through the publisher's permitted access method and compare its
SHA-256 with the recorded digest. A mutable URL can return a later edition;
different bytes must be assessed as a different source snapshot. A historical
source may also become unavailable. Do not replace it silently or claim that a
current edition governed an earlier contract.

If retaining a retrieved body locally, use the manifest's recorded filename in
the corresponding archive directory. Do not edit its contents or line endings.
Do not treat an access challenge as the source text or assume that a reader
extract is an original response body. Reacquisition is an optional research
activity; ordinary installation, examples and tests require no source downloads.

## Test coverage on a clean clone

The case-study tests always check the public provenance metadata and synthetic
model-boundary witnesses. Every local source body that is present is checked
against its recorded size and SHA-256. A separate archive-completeness subtest is
explicitly skipped when the complete local body set is unavailable, as expected
on a clean clone. A skipped archive check is not reported as verified source
bytes. The deterministic engine and synthetic tests remain fully offline.

Public case studies can therefore be inspected and their semantic witnesses
reproduced without redistributing full rulebooks, company filings or captured
web applications. A reviewer who needs to compare the original language should
follow the cited primary sources and account for the recorded version limits.
