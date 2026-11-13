import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { checkClaim } from '../src/check.js';
import { EvidenceSetSchema, type ClaimSpecV1 } from '../src/model.js';
import { compareCondition, resolve } from '../src/resolver.js';
import { validateClaim } from '../src/validation.js';

const directory = new URL('../examples/real/', import.meta.url);
const draft = JSON.parse(
  readFileSync(
    new URL('zoom-fy2027-customers-100k.draft.json', directory),
    'utf8',
  ),
) as Record<string, unknown>;
const evidenceDirectory = new URL(
  'zoom-fy2027-customers-100k.evidence/',
  directory,
);
const manifest = JSON.parse(
  readFileSync(new URL('manifest.json', evidenceDirectory), 'utf8'),
) as {
  isActualReportedEvidence: boolean;
  cases: { file: string; asOf: string }[];
  omittedCases: { kind: string; reason: string }[];
};

test('Zoom research draft preserves the discovered strict numeric question without binding unknown terms', () => {
  assert.equal(draft.id, 'KXZMA-27FEBCUST100K-4800');
  assert.deepEqual(draft.condition, { comparator: '>', strike: '4800' });
  const reference = draft.reference as Record<string, unknown>;
  assert.equal(reference.unit, 'count');
  assert.deepEqual(draft.policies, {});
  assert.equal(Object.hasOwn(draft, 'timing'), false);
  assert.equal(Object.hasOwn(draft, 'sources'), false);
  assert.deepEqual(draft.payout, { currency: 'USD', yes: '1', no: '0' });
  const period = reference.reportingPeriod as Record<string, unknown>;
  assert.equal(Object.hasOwn(period, 'start'), false);
  assert.equal(Object.hasOwn(period, 'end'), false);
});

test('Zoom draft validation exposes unbound fields rather than fabricating a real settlement specification', () => {
  const validation = validateClaim(draft);
  assert.equal(validation.valid, false);
  const paths = validation.issues.map((issue) => issue.path);
  assert.deepEqual(paths, [
    'reference.reportingPeriod.end',
    'reference.reportingPeriod.start',
    'sources',
    'timing',
  ]);
  assert.ok(validation.issues.every((issue) => issue.code === 'CL001'));
});

test('the discovered Above 4800 numeric clause distinguishes below, equality, and above', () => {
  // This asserts the numeric clause only. It does not resolve the real contract:
  // eligibility, authority, timing and exceptional terms remain unverified.
  for (const [value, expected] of [
    ['4799', false],
    ['4800', false],
    ['4801', true],
  ] as const) {
    assert.equal(compareCondition(value, '>', '4800'), expected);
  }
});

test('Zoom candidate evidence is typed and explicitly synthetic, never reported FY2027 results', () => {
  assert.equal(manifest.isActualReportedEvidence, false);
  assert.equal(manifest.cases.length, 8);
  for (const entry of manifest.cases) {
    const input: unknown = JSON.parse(
      readFileSync(new URL(entry.file, evidenceDirectory), 'utf8'),
    );
    const evidence = EvidenceSetSchema.parse(input);
    for (const observation of evidence.observations) {
      assert.equal(observation.provenance?.kind, 'synthetic-evidence');
      assert.equal(observation.unit, 'count');
    }
    const result = resolve(draft, evidence, { asOf: entry.asOf });
    assert.equal(result.status, 'INVALID_SPEC', entry.file);
    assert.equal(result.terminal, false, entry.file);
    assert.equal(result.payout, undefined, entry.file);
  }
});

test('retrieved family rules justify correction and disclosure-conflict scenarios without inventing policies', () => {
  assert.deepEqual(manifest.omittedCases, []);
  for (const file of ['correction.json', 'source-conflict.json']) {
    assert.ok(manifest.cases.some((entry) => entry.file === file));
  }
  assert.deepEqual(draft.policies, {});
});

test('Zoom incomplete normalization gets no executed checks or misleading settlement-safety verdict', () => {
  const report = checkClaim(draft, { runs: 3, seed: 18472941 });
  assert.equal(report.verdict, 'INVALID_SPEC');
  assert.equal(report.generated.executedRuns, 0);
  assert.deepEqual(report.namedScenarios, []);
  assert.deepEqual(report.generated.checks, []);
  assert.equal(report.findings.length, 4);
  assert.ok(
    report.findings.every((finding) => finding.property === 'SPEC_VALIDITY'),
  );
});

test('source provenance metadata and available local originals retain their recorded integrity', async (t) => {
  const sources = new URL('sources/zoom-fy2027-customers-100k/', directory);
  type Source = {
    file?: string;
    url: string;
    status?: number;
    bytes?: number;
    sha256?: string;
    retrievedAt?: string;
  };
  const zoom = JSON.parse(
    readFileSync(new URL('zoom-original-manifest.json', sources), 'utf8'),
  ) as Source[];
  const annual = JSON.parse(
    readFileSync(new URL('kalshi-annualkpi-s3-manifest.json', sources), 'utf8'),
  ) as Source[];
  const certification = JSON.parse(
    readFileSync(
      new URL('kalshi-annualkpi-cftc-manifest.json', sources),
      'utf8',
    ),
  ) as Source;
  const rules = JSON.parse(
    readFileSync(new URL('rulebook-original-manifest.json', sources), 'utf8'),
  ) as { records: Source[] };
  const originals = [
    ...zoom,
    ...annual,
    certification,
    ...rules.records,
  ].filter((entry) => entry.status === 200);
  assert.equal(originals.length, 9);
  const unavailable: string[] = [];
  for (const source of originals) {
    assert.ok(source.file);
    assert.doesNotMatch(source.file, /[\\/]|\.\./);
    assert.ok(source.url.startsWith('https://'));
    assert.match(source.sha256 ?? '', /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(source.bytes) && source.bytes! > 0);
    assert.ok(source.retrievedAt);
    assert.match(source.retrievedAt, /(?:Z|[+-]\d{2}:\d{2})$/);
    assert.ok(Number.isFinite(Date.parse(source.retrievedAt)));
    if (!existsSync(new URL(source.file, sources))) {
      unavailable.push(source.file);
      continue;
    }
    const bytes = readFileSync(new URL(source.file!, sources));
    assert.equal(bytes.length, source.bytes, source.file);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      source.sha256,
      source.file,
    );
    assert.ok(
      bytes
        .subarray(0, 100)
        .includes(
          Buffer.from(
            source.file!.endsWith('.pdf') ? '%PDF-' : '<SEC-DOCUMENT>',
          ),
        ),
      source.file,
    );
  }
  await t.test('complete local source-body hash verification', (archive) => {
    if (unavailable.length) {
      archive.skip(
        `${unavailable.length} local publisher bodies unavailable; originals are not redistributed. Metadata and every present body were checked.`,
      );
      return;
    }
    assert.equal(unavailable.length, 0);
  });
});

test('first-report finality is an explicit model limitation rather than an omitted contractual rule', () => {
  // A synthetic completion is used only to exhibit the model boundary. These
  // clocks and source IDs are NOT installed as the real market specification.
  const input = EvidenceSetSchema.parse(
    JSON.parse(
      readFileSync(new URL('correction.json', evidenceDirectory), 'utf8'),
    ),
  );
  const period = input.observations[0]!.reportingPeriod;
  const spec = {
    ...draft,
    title: 'SYNTHETIC MODEL-BOUNDARY WITNESS; not the actual Kalshi contract',
    reference: {
      ...(draft.reference as Record<string, unknown>),
      reportingPeriod: period,
    },
    sources: [
      {
        id: 'zoom-earnings-release',
        name: 'Hypothetical press release',
        priority: 1,
      },
    ],
    timing: {
      observationStart: period.start,
      observationEnd: period.end,
      publicationDeadline: '2027-03-04T00:00:00Z',
      determinationAt: '2027-03-05T00:00:00Z',
      settlementAt: '2027-03-06T00:00:00Z',
    },
    policies: {},
  } as ClaimSpecV1;
  const context = { asOf: spec.timing.settlementAt };
  assert.equal(
    resolve(
      spec,
      { observations: [input.observations[0]], events: [] },
      context,
    ).status,
    'YES',
  );
  assert.equal(resolve(spec, input, context).status, 'UNDEFINED');
  for (const [policy, expected] of [
    ['freezeAtDetermination', 'NO'],
    ['latestUntilSettlement', 'NO'],
    ['review', 'REVIEW_REQUIRED'],
  ] as const) {
    spec.policies = {
      corrections: policy,
      dispute: {
        processId: 'test-only-review',
        description: 'Test-only routing metadata',
      },
    };
    assert.equal(resolve(spec, input, context).status, expected);
  }
  // ANNUALKPI p.2 would retain the first report (4801 => YES), provided it
  // satisfies the actual eligibility terms. No existing fixed correction policy
  // expresses that rule for a later correction still inside its cutoff.
});
