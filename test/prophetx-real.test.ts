import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { Temporal } from '@js-temporal/polyfill';
import fc from 'fast-check';
import { checkClaim } from '../src/check.js';
import {
  ClaimSpecV1Schema,
  EvidenceSetSchema,
  type EvidenceObservation,
  type EvidenceSet,
} from '../src/model.js';
import { resolve } from '../src/resolver.js';
import { validateClaim } from '../src/validation.js';

const directory = new URL(
  '../examples/real/prophetx-gemini-nov2026-100m/',
  import.meta.url,
);
const witnesses = new URL('witnesses/', directory);
function readJson(file: string, base = witnesses): unknown {
  return JSON.parse(readFileSync(new URL(file, base), 'utf8'));
}
const claim = ClaimSpecV1Schema.parse(readJson('scalar-claim.json'));
const above = EvidenceSetSchema.parse(readJson('above.json'));
const context = { asOf: claim.timing.settlementAt };
const thresholdCents = 10_000_000_000n;
const seed = 18472941;

function observation(
  patch: Partial<EvidenceObservation> = {},
): EvidenceObservation {
  return { ...structuredClone(above.observations[0]!), ...patch };
}
function world(observations: EvidenceObservation[]): EvidenceSet {
  return { observations, events: [] };
}

// Independent cent model: no resolver/decimal conversion helper is used.
// The filing expressly computes the metric to cents. These values are synthetic.
function usdFromCents(cents: bigint): string {
  assert.ok(cents >= 0n);
  const fraction = (cents % 100n)
    .toString()
    .padStart(2, '0')
    .replace(/0+$/, '');
  return `${cents / 100n}${fraction ? `.${fraction}` : ''}`;
}
function centsFromUsd(value: string): bigint {
  assert.match(value, /^\d+(?:\.\d{1,2})?$/);
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
}
function expectedStatus(cents: bigint): 'YES' | 'NO' {
  return cents > thresholdCents ? 'YES' : 'NO';
}

test('ProphetX incomplete normalization is refused before scenarios or generated execution', () => {
  const draft = readJson('claim.draft.json', directory);
  const validation = validateClaim(draft);
  assert.equal(validation.valid, false);
  assert.deepEqual(
    validation.issues.map((issue) => issue.path),
    [
      'reference.reportingPeriod.end',
      'reference.reportingPeriod.start',
      'timing',
    ],
  );
  const result = resolve(draft, above, context);
  assert.equal(result.status, 'INVALID_SPEC');
  assert.equal(result.terminal, false);
  assert.equal(result.payout, undefined);
  const report = checkClaim(draft, { runs: 3, seed });
  assert.equal(report.verdict, 'INVALID_SPEC');
  assert.equal(report.generated.executedRuns, 0);
  assert.deepEqual(report.generated.checks, []);
  assert.deepEqual(report.namedScenarios, []);
  assert.equal(report.findings.length, 3);
  const assessment = readJson('support-matrix.json', directory) as {
    researchOutcome: string;
    fixtureStatus: string;
    verifiedSupportedRealFixture: boolean;
    gate: { passed: boolean; extensionImplemented: boolean };
  };
  assert.equal(assessment.researchOutcome, 'C');
  assert.equal(assessment.fixtureStatus, 'UNSUPPORTED_CASE_STUDY');
  assert.equal(assessment.verifiedSupportedRealFixture, false);
  assert.equal(assessment.gate.passed, false);
  assert.equal(assessment.gate.extensionImplemented, false);
});

test('ProphetX source metadata, available local bytes and disclosed failures retain their integrity', async (t) => {
  type Source = {
    file: string;
    publisher: string;
    title: string;
    documentDate: string | null;
    retrievedAt: string;
    url: string;
    role: string;
    sha256?: string;
    bytes?: number;
    error?: string;
    archivalFormat?: string;
    representation?: string;
  };
  const sources = new URL('sources/', directory);
  const unavailable: string[] = [];
  for (const file of [
    'filing-manifest.json',
    'rulebook-manifest.json',
    'gemini-manifest.json',
    'regulatory-manifest.json',
  ]) {
    const records = readJson(file, sources) as Source[];
    assert.ok(records.length > 0, file);
    for (const source of records) {
      assert.doesNotMatch(source.file, /[\\/]|\.\./);
      assert.ok(source.publisher.trim(), source.file);
      assert.ok(source.title.trim(), source.file);
      assert.ok(source.role.trim(), source.file);
      assert.ok(Object.hasOwn(source, 'documentDate'), source.file);
      assert.ok(source.url.startsWith('https://'), source.file);
      assert.doesNotThrow(() => Temporal.Instant.from(source.retrievedAt));
      if (source.error && !source.sha256) {
        // Failed retrievals are disclosed, not replaced with invented bytes.
        assert.equal(source.sha256, undefined, source.file);
        assert.equal(source.bytes, undefined, source.file);
        continue;
      }
      assert.ok(source.sha256, source.file);
      assert.match(source.sha256, /^[a-f0-9]{64}$/, source.file);
      assert.ok(
        Number.isSafeInteger(source.bytes) && source.bytes! > 0,
        source.file,
      );
      if (source.file.endsWith('reader.txt'))
        assert.match(
          source.archivalFormat ?? source.representation ?? '',
          /not[- ]original/i,
          source.file,
        );
      if (source.error)
        assert.equal(source.role, 'failed-access-response-not-regulation-text');
      if (!existsSync(new URL(source.file, sources))) {
        unavailable.push(source.file);
        continue;
      }
      const bytes = readFileSync(new URL(source.file, sources));
      assert.equal(bytes.length, source.bytes, source.file);
      assert.equal(
        createHash('sha256').update(bytes).digest('hex'),
        source.sha256,
        source.file,
      );
      if (source.file.endsWith('.pdf'))
        assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', source.file);
    }
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

test('ProphetX scalar witnesses are explicitly synthetic and leave missing/review paths unbound', () => {
  const manifest = readJson('manifest.json') as {
    isActualReportedEvidence: boolean;
    isVerifiedRealClaimSpec: boolean;
    cases: { file: string; scalarProjectionStatus: string }[];
  };
  assert.equal(manifest.isActualReportedEvidence, false);
  assert.equal(manifest.isVerifiedRealClaimSpec, false);
  assert.equal(claim.provenance?.kind, 'synthetic');
  assert.match(claim.title, /SYNTHETIC.*NOT the ProphetX contract/);
  assert.equal(validateClaim(claim).valid, true);
  assert.equal(claim.policies.missingData, undefined);
  assert.equal(claim.policies.dispute, undefined);
  for (const entry of manifest.cases) {
    const input = EvidenceSetSchema.parse(readJson(entry.file));
    for (const item of input.observations) {
      assert.equal(item.provenance?.kind, 'synthetic-evidence');
      assert.equal(item.unit, 'USD');
    }
    assert.equal(
      resolve(claim, input, context).status,
      entry.scalarProjectionStatus,
    );
  }
});

test('the documented strict threshold distinguishes adjacent cents and equality in the scalar projection', () => {
  for (const [file, cents, expected] of [
    ['below.json', 9_999_999_999n, 'NO'],
    ['exact.json', 10_000_000_000n, 'NO'],
    ['above.json', 10_000_000_001n, 'YES'],
  ] as const) {
    const input = EvidenceSetSchema.parse(readJson(file));
    assert.equal(centsFromUsd(input.observations[0]!.value), cents);
    assert.equal(expectedStatus(cents), expected);
    const result = resolve(claim, input, context);
    assert.equal(result.status, expected);
    assert.equal(result.terminal, true);
    assert.deepEqual(result.payout, {
      currency: 'USD',
      amount: expected === 'YES' ? '1' : '0',
    });
  }
});

test('conditional expected ET envelope spans DST: first trade date 25 hours and month 721 hours', () => {
  const firstStart = Temporal.ZonedDateTime.from(
    '2026-10-31T17:00:00[America/New_York]',
  );
  const firstEnd = Temporal.ZonedDateTime.from(
    '2026-11-01T17:00:00[America/New_York]',
  );
  const lastLiteralSecond = Temporal.ZonedDateTime.from(
    '2026-11-30T16:59:59[America/New_York]',
  );
  const halfOpenEnd = lastLiteralSecond.add({ seconds: 1 });
  assert.equal(firstStart.offset, '-04:00');
  assert.equal(firstEnd.offset, '-05:00');
  assert.equal(firstStart.toInstant().toString(), '2026-10-31T21:00:00Z');
  assert.equal(
    lastLiteralSecond.toInstant().toString(),
    '2026-11-30T21:59:59Z',
  );
  assert.equal(halfOpenEnd.toInstant().toString(), '2026-11-30T22:00:00Z');
  assert.equal(
    firstStart.toInstant().until(firstEnd.toInstant()).total('hours'),
    25,
  );
  assert.equal(
    firstStart.toInstant().until(halfOpenEnd.toInstant()).total('hours'),
    721,
  );
  assert.equal(
    claim.timing.observationStart,
    firstStart.toInstant().toString(),
  );
  assert.equal(claim.timing.observationEnd, halfOpenEnd.toInstant().toString());
  // The filing's reported trade date governs; this clock envelope is conditional.
});

test('two following weekdays derive the candidate cutoff without claiming the governing holiday calendar', () => {
  let day = Temporal.PlainDate.from('2026-11-30');
  assert.equal(day.dayOfWeek, 1);
  let counted = 0;
  while (counted < 2) {
    day = day.add({ days: 1 });
    if (day.dayOfWeek <= 5) counted++;
  }
  const cutoff = day.toZonedDateTime({
    timeZone: 'America/New_York',
    plainTime: '17:00:00',
  });
  assert.equal(day.toString(), '2026-12-02');
  assert.equal(cutoff.toInstant().toString(), claim.timing.determinationAt);
  assert.equal(cutoff.offset, '-05:00');
});

test('synthetic scalar publication cutoff accepts the stated instant and excludes the following second', () => {
  for (const publishedAt of ['2026-12-02T21:59:59Z', '2026-12-02T22:00:00Z']) {
    assert.equal(
      resolve(
        claim,
        world([observation({ publishedAt, availableAt: publishedAt })]),
        context,
      ).status,
      'YES',
    );
  }
  const after = observation({
    publishedAt: '2026-12-02T22:00:01Z',
    availableAt: '2026-12-02T22:00:01Z',
  });
  const result = resolve(claim, world([after]), context);
  assert.equal(result.status, 'UNDEFINED');
  assert.deepEqual(result.reasonCodes, ['MISSING_DATA_POLICY_MISSING']);
  // This exposes the deliberately incomplete scalar projection. It is NOT the
  // real contract's defined absence-of-data/void/collateral-return disposition.
});

test('synthetic scalar correction before/at cutoff is reflected while the following second is irrelevant', () => {
  const initial = observation({ id: 'initial', value: '100000000' });
  for (const [publishedAt, expected] of [
    ['2026-12-02T21:59:59Z', 'YES'],
    ['2026-12-02T22:00:00Z', 'YES'],
    ['2026-12-02T22:00:01Z', 'NO'],
  ]) {
    const correction = observation({
      id: 'correction',
      revises: initial.id,
      publishedAt: publishedAt!,
      availableAt: publishedAt!,
    });
    assert.equal(
      resolve(claim, world([initial, correction]), context).status,
      expected,
    );
  }
});

test('publication cutoff and later retrieval cannot silently be treated as the same contractual timestamp', () => {
  const publishedBefore = observation({
    publishedAt: '2026-12-02T21:59:59Z',
    availableAt: '2026-12-02T21:59:59Z',
  });
  assert.equal(resolve(claim, world([publishedBefore]), context).status, 'YES');
  const retrievedAfter = {
    ...publishedBefore,
    availableAt: '2026-12-02T22:00:01Z',
  };
  assert.equal(
    EvidenceSetSchema.safeParse(world([retrievedAfter])).success,
    true,
  );
  const result = resolve(claim, world([retrievedAfter]), context);
  assert.equal(result.status, 'UNDEFINED');
  assert.deepEqual(result.reasonCodes, ['MISSING_DATA_POLICY_MISSING']);
  // This witnesses PX10's modelling boundary: the engine freezes availability
  // too. The real filing's cutoff is stated in terms of publication, while it
  // separately records retrieval times. We do not equate later retrieval with
  // late publication or call the real contractual outcome UNDEFINED.
});

test('later synthetic evidence and later evaluation cannot rewrite the scalar cutoff result', () => {
  const initial = observation({ id: 'initial', value: '100000000' });
  const original = resolve(claim, world([initial]), context);
  const postSettlement = observation({
    id: 'later-correction',
    revises: initial.id,
    publishedAt: '2026-12-04T22:00:00Z',
    availableAt: '2026-12-04T22:00:00Z',
  });
  for (const observations of [
    [initial, postSettlement],
    [postSettlement, initial],
  ]) {
    assert.deepEqual(resolve(claim, world(observations), context), original);
    assert.deepEqual(
      resolve(claim, world(observations), { asOf: '2026-12-10T22:00:00Z' }),
      original,
    );
  }
});

test('synthetic whole-period priority selects complete primary then secondary then tertiary scalars', () => {
  const primary = observation({ id: 'primary-total', value: '100000000' });
  const secondary = observation({
    id: 'secondary-total',
    sourceId: 'secondary',
  });
  const tertiary = observation({ id: 'tertiary-total', sourceId: 'tertiary' });
  for (const [items, status, selected] of [
    [[tertiary, secondary, primary], 'NO', primary.id],
    [[tertiary, secondary], 'YES', secondary.id],
    [[tertiary], 'YES', tertiary.id],
  ] as const) {
    const result = resolve(claim, world([...items]), context);
    assert.equal(result.status, status);
    assert.deepEqual(result.evidenceUsed, [selected]);
  }
});

test('daily fallback witness shows why collapsing incomplete sources to monthly scalars changes the answer', () => {
  type Row = {
    tradeDate: string;
    primaryNotionalUsd: string | null;
    secondaryNotionalUsd: string | null;
    tertiaryNotionalUsd: string | null;
  };
  const witness = readJson('per-date-fallback.json') as {
    kind: string;
    isActualReportedEvidence: boolean;
    rows: Row[];
  };
  assert.equal(witness.kind, 'SYNTHETIC_MODEL_BOUNDARY_WITNESS');
  assert.equal(witness.isActualReportedEvidence, false);
  assert.equal(witness.rows.length, 30);
  let date = Temporal.PlainDate.from('2026-11-01');
  let perDateCents = 0n;
  let primaryCents = 0n;
  let secondaryCents = 0n;
  for (const row of witness.rows) {
    assert.equal(row.tradeDate, date.toString());
    date = date.add({ days: 1 });
    // Independent contractual ordering, including zero as present data.
    const selected =
      row.primaryNotionalUsd ??
      row.secondaryNotionalUsd ??
      row.tertiaryNotionalUsd;
    assert.notEqual(selected, null);
    perDateCents += centsFromUsd(selected!);
    primaryCents += centsFromUsd(row.primaryNotionalUsd ?? '0');
    secondaryCents += centsFromUsd(row.secondaryNotionalUsd ?? '0');
  }
  assert.equal(date.toString(), '2026-12-01');
  assert.equal(perDateCents, 11_000_000_000n);
  assert.equal(primaryCents, 6_000_000_000n);
  assert.equal(secondaryCents, 5_000_000_000n);
  assert.equal(expectedStatus(perDateCents), 'YES');
  const collapsed = world([
    observation({
      id: 'incomplete-primary-relabelled-monthly',
      value: usdFromCents(primaryCents),
    }),
    observation({
      id: 'incomplete-secondary-relabelled-monthly',
      sourceId: 'secondary',
      value: usdFromCents(secondaryCents),
    }),
  ]);
  const wrongNormalization = resolve(claim, collapsed, context);
  assert.equal(wrongNormalization.status, 'NO');
  // This is a witness against the attempted normalization, not the resolver.
});

test('faithfully labelled daily periods cannot become eligible whole-period scalar evidence', () => {
  const daily = observation({
    reportingPeriod: {
      id: '2026-11-01',
      start: '2026-10-31T21:00:00Z',
      end: '2026-11-01T22:00:00Z',
      calendar: 'synthetic-conditional-America-New_York-envelope',
    },
  });
  const result = resolve(claim, world([daily]), context);
  assert.equal(result.status, 'UNDEFINED');
  assert.ok(result.trace.some((step) => step.code === 'PERIOD_REJECTED'));
  assert.deepEqual(result.evidenceUsed, []);
  assert.deepEqual(result.reasonCodes, ['MISSING_DATA_POLICY_MISSING']);
});

test('void/collateral return is not expressible as an existing missing-data binary action', () => {
  const candidate = structuredClone(claim);
  const validation = validateClaim({
    ...candidate,
    policies: { ...candidate.policies, missingData: 'void' },
  });
  assert.equal(validation.valid, false);
  assert.deepEqual(
    validation.issues.map((issue) => issue.path),
    ['policies.missingData'],
  );
  // Rejecting this unsupported term does not mean the real void rule is undefined.
});

test('seeded independent integer-cent oracle pressures scalar threshold comparisons', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant(thresholdCents),
        fc.bigInt({ min: 0n, max: 20_000_000_000n }),
        fc.bigInt({ min: thresholdCents - 100n, max: thresholdCents + 100n }),
      ),
      (cents) => {
        const result = resolve(
          claim,
          world([observation({ value: usdFromCents(cents) })]),
          context,
        );
        assert.equal(result.status, expectedStatus(cents));
      },
    ),
    { seed, numRuns: 200 },
  );
});

test('seeded permutations and conflicting lower sources preserve the scalar primary correction', () => {
  fc.assert(
    fc.property(
      fc.bigInt({ min: thresholdCents - 100n, max: thresholdCents + 100n }),
      fc.shuffledSubarray([0, 1, 2, 3], { minLength: 4, maxLength: 4 }),
      (cents, permutation) => {
        const conflicting =
          cents > thresholdCents ? '99999999.99' : '100000000.01';
        const initial = observation({ id: 'initial', value: conflicting });
        const correction = observation({
          id: 'correction',
          revises: initial.id,
          value: usdFromCents(cents),
          publishedAt: claim.timing.determinationAt,
          availableAt: claim.timing.determinationAt,
        });
        const baseline = resolve(claim, world([initial, correction]), context);
        assert.equal(baseline.status, expectedStatus(cents));
        const items = [
          initial,
          correction,
          observation({
            id: 'secondary-conflict',
            sourceId: 'secondary',
            value: conflicting,
          }),
          observation({
            id: 'tertiary-conflict',
            sourceId: 'tertiary',
            value: conflicting,
          }),
        ];
        const canonical = resolve(claim, world(items), context);
        assert.equal(canonical.status, baseline.status);
        assert.deepEqual(canonical.evidenceUsed, baseline.evidenceUsed);
        assert.deepEqual(
          resolve(
            claim,
            world(permutation.map((index) => items[index]!)),
            context,
          ),
          canonical,
        );
      },
    ),
    { seed, numRuns: 150 },
  );
});

test('seeded whole-second correction cutoffs distinguish eligible revisions and irrelevant future evidence', () => {
  fc.assert(
    fc.property(
      fc.bigInt({ min: thresholdCents - 100n, max: thresholdCents + 100n }),
      fc.oneof(fc.constant(0), fc.integer({ min: -7200, max: 7200 })),
      (cents, seconds) => {
        const initialCents =
          cents > thresholdCents ? thresholdCents - 1n : thresholdCents + 1n;
        const initial = observation({
          id: 'initial',
          value: usdFromCents(initialCents),
        });
        const publishedAt = Temporal.Instant.from(claim.timing.determinationAt)
          .add({ seconds })
          .toString();
        const correction = observation({
          id: 'correction',
          revises: initial.id,
          value: usdFromCents(cents),
          publishedAt,
          availableAt: publishedAt,
        });
        const input = world([correction, initial]);
        const result = resolve(claim, input, context);
        assert.equal(
          result.status,
          expectedStatus(seconds <= 0 ? cents : initialCents),
        );
        assert.deepEqual(
          resolve(claim, input, { asOf: '2026-12-10T22:00:00Z' }),
          result,
        );
      },
    ),
    { seed, numRuns: 200 },
  );
});
