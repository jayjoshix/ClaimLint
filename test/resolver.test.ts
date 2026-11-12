import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import fc from 'fast-check';
import { resolve, compareCondition } from '../src/resolver.js';
import { validateClaim } from '../src/validation.js';
import { compareDecimal, roundDecimal, shiftDecimal } from '../src/decimal.js';
import {
  ClaimSpecV1Schema,
  type ClaimSpecV1,
  type EvidenceObservation,
  type EvidenceSet,
  type WorldEvent,
} from '../src/model.js';
import { addSeconds } from '../src/time.js';

function spec(): ClaimSpecV1 {
  return ClaimSpecV1Schema.parse(
    JSON.parse(
      readFileSync(
        new URL('../examples/hardened-demo.json', import.meta.url),
        'utf8',
      ),
    ),
  );
}
function observation(
  overrides: Partial<EvidenceObservation> = {},
): EvidenceObservation {
  const s = spec();
  return {
    id: 'a',
    sourceId: 'issuer',
    entityId: s.reference.entityId,
    metricId: s.reference.metricId,
    definitionId: s.reference.definitionId,
    value: '32',
    unit: s.reference.unit,
    reportingPeriod: s.reference.reportingPeriod,
    publishedAt: '2027-01-20T00:00:00Z',
    availableAt: '2027-01-20T00:01:00Z',
    status: 'final',
    ...overrides,
  };
}
function evidence(
  observations: EvidenceObservation[] = [],
  events: WorldEvent[] = [],
): EvidenceSet {
  return { observations, events };
}
const context = { asOf: '2027-02-04T00:00:00Z' };
function event(type: WorldEvent['type'], sourceId = 'issuer'): WorldEvent {
  return {
    id: `event-${type}`,
    sourceId,
    entityId: 'northstar',
    metricId: 'cloud-net-sales',
    type,
    occurredAt: '2026-12-20T00:00:00Z',
    availableAt: '2026-12-21T00:00:00Z',
  };
}

test('both demo specs are valid; omissions are not schema errors', () => {
  for (const filename of ['hardened-demo.json', 'broken-demo.json']) {
    assert.equal(
      validateClaim(
        JSON.parse(
          readFileSync(
            new URL(`../examples/${filename}`, import.meta.url),
            'utf8',
          ),
        ),
      ).valid,
      true,
    );
  }
});

test('all six comparators have exact equality semantics', () => {
  for (const [operator, expected] of [
    ['>', false],
    ['>=', true],
    ['<', false],
    ['<=', true],
    ['==', true],
    ['!=', false],
  ] as const) {
    const s = spec();
    s.condition.comparator = operator;
    assert.equal(
      resolve(s, evidence([observation({ value: '31' })]), context).status,
      expected ? 'YES' : 'NO',
    );
  }
});

test('decimal precision extends beyond Number and default library precision', () => {
  const a = '900719925474099312345678901234567890.00000000000000000001';
  const b = '900719925474099312345678901234567890.00000000000000000002';
  assert.equal(compareDecimal(a, b), -1);
  assert.equal(compareCondition(a, '<', b), true);
  assert.equal(
    shiftDecimal('123456789012345678901234567890', 9),
    '123456789012345678901234567890000000000',
  );
  const s = spec();
  delete s.policies.rounding;
  s.condition.strike = b;
  assert.equal(
    resolve(s, evidence([observation({ value: a })]), context).status,
    'NO',
  );
});

test('half-even, half-up and truncation are exact for signed ties', () => {
  assert.equal(roundDecimal('30.95', 1, 'halfEven'), '31');
  assert.equal(roundDecimal('31.05', 1, 'halfEven'), '31');
  assert.equal(roundDecimal('31.05', 1, 'halfUp'), '31.1');
  assert.equal(roundDecimal('-31.05', 1, 'halfUp'), '-31.1');
  assert.equal(roundDecimal('-31.05', 1, 'truncate'), '-31');
});

test('canonical decimal inputs reject exponents, trailing zeroes, negative zero and numbers', () => {
  for (const value of ['31.0', '1e2', '-0', '+31', '01', 31, 'NaN']) {
    const s: unknown = {
      ...spec(),
      condition: { comparator: '>', strike: value },
    };
    assert.equal(validateClaim(s).valid, false);
  }
});

test('rounding changes observed value only, with no implicit precision loss', () => {
  const s = spec();
  s.condition.comparator = '>=';
  assert.equal(
    resolve(
      s,
      evidence([observation({ value: '30950', unit: 'USD_million' })]),
      context,
    ).status,
    'YES',
  );
  delete s.policies.rounding;
  assert.equal(
    resolve(
      s,
      evidence([observation({ value: '30950', unit: 'USD_million' })]),
      context,
    ).status,
    'NO',
  );
});

test('review is defined and nonterminal, pending has no payout', () => {
  const review = resolve(spec(), evidence(), context);
  assert.equal(review.status, 'REVIEW_REQUIRED');
  assert.equal(review.terminal, false);
  assert.equal(review.payout, undefined);
  assert.equal(review.reviewProcessId, 'synthetic-review-v1');
  const pending = resolve(spec(), evidence(), { asOf: '2027-01-01T00:00:00Z' });
  assert.equal(pending.status, 'PENDING');
  assert.equal(pending.terminal, false);
});

test('missing mature policy is UNDEFINED, while invalid specification is INVALID_SPEC', () => {
  const s = spec();
  delete s.policies.missingData;
  assert.equal(resolve(s, evidence(), context).status, 'UNDEFINED');
  s.sources[1]!.priority = 1;
  assert.equal(resolve(s, evidence(), context).status, 'INVALID_SPEC');
});

test('timing order, offset, duplicate IDs, cyclic replacement and unbound review reject statically', () => {
  const variants: ClaimSpecV1[] = [];
  let s = spec();
  s.timing.determinationAt = '2026-01-01T00:00:00Z';
  variants.push(s);
  s = spec();
  s.timing.settlementAt = '2027-02-04T00:00:00';
  variants.push(s);
  s = spec();
  s.sources[1]!.id = 'issuer';
  variants.push(s);
  s = spec();
  s.sources[0]!.replaces = 'archive';
  variants.push(s);
  s = spec();
  delete s.policies.dispute;
  variants.push(s);
  s = spec();
  s.payout.yes = '1.01';
  variants.push(s);
  s = spec();
  s.reference.reportingPeriod.end = '2026-12-31T00:00:00Z';
  variants.push(s);
  for (const variant of variants)
    assert.equal(validateClaim(variant).valid, false);
});

test('offset-equivalent timestamps normalize to the same decision and trace', () => {
  const a = observation();
  const b = { ...a, publishedAt: '2027-01-20T05:30:00+05:30' };
  assert.deepEqual(
    resolve(spec(), evidence([a]), context),
    resolve(spec(), evidence([b]), context),
  );
});

test('unavailable future evidence cannot affect decision or logical trace', () => {
  const base = observation();
  const future = observation({
    id: 'future',
    value: '1',
    availableAt: '2027-03-01T00:00:00Z',
  });
  assert.deepEqual(
    resolve(spec(), evidence([base]), context),
    resolve(spec(), evidence([future, base]), context),
  );
});

test('both publication and availability cutoffs are inclusive', () => {
  const s = spec();
  const at = s.timing.determinationAt;
  assert.equal(
    resolve(
      s,
      evidence([observation({ publishedAt: at, availableAt: at })]),
      context,
    ).status,
    'YES',
  );
  assert.equal(
    resolve(
      s,
      evidence([
        observation({ publishedAt: at, availableAt: addSeconds(at, 1) }),
      ]),
      context,
    ).status,
    'REVIEW_REQUIRED',
  );
});

test('finality freezes late retrieval of old publications as well as new restatements', () => {
  const s = spec();
  const base = observation();
  const revision = observation({
    id: 'b',
    revises: 'a',
    value: '1',
    publishedAt: '2027-02-05T00:00:00Z',
    availableAt: '2027-02-05T00:01:00Z',
  });
  const later = { asOf: '2027-03-01T00:00:00Z' };
  assert.deepEqual(
    resolve(s, evidence([base]), context),
    resolve(s, evidence([revision, base]), later),
  );
  const retroactive = observation({
    id: 'b',
    value: '1',
    availableAt: '2027-02-05T00:00:00Z',
  });
  assert.deepEqual(
    resolve(s, evidence([base]), context),
    resolve(s, evidence([base, retroactive]), later),
  );
});

test('latestUntilSettlement sees revisions after determination but before settlement', () => {
  const s = spec();
  s.policies.corrections = 'latestUntilSettlement';
  s.policies.latePublication = 'reject';
  const base = observation();
  const revision = observation({
    id: 'b',
    revises: 'a',
    value: '30',
    publishedAt: '2027-01-21T00:00:00Z',
    availableAt: '2027-02-03T12:00:00Z',
  });
  assert.equal(resolve(s, evidence([base, revision]), context).status, 'NO');
  s.policies.corrections = 'freezeAtDetermination';
  assert.equal(resolve(s, evidence([base, revision]), context).status, 'YES');
});

test('restatements follow explicit ancestry; final-provisional-final supersedes transitively', () => {
  const a = observation();
  const b = observation({
    id: 'b',
    revises: 'a',
    status: 'provisional',
    value: '30',
    publishedAt: '2027-01-21T00:00:00Z',
    availableAt: '2027-01-21T00:01:00Z',
  });
  const c = observation({
    id: 'c',
    revises: 'b',
    value: '29',
    publishedAt: '2027-01-22T00:00:00Z',
    availableAt: '2027-01-22T00:01:00Z',
  });
  const resolved = resolve(spec(), evidence([c, a, b]), context);
  assert.equal(resolved.status, 'NO');
  assert.deepEqual(resolved.evidenceUsed, ['a', 'b', 'c']);
});

test('a provisional revision cannot replace final evidence under finalOnly', () => {
  const a = observation();
  const b = observation({
    id: 'b',
    revises: 'a',
    status: 'provisional',
    value: '1',
    publishedAt: '2027-01-21T00:00:00Z',
    availableAt: '2027-01-21T00:01:00Z',
  });
  assert.equal(resolve(spec(), evidence([a, b]), context).status, 'YES');
});

test('an inadmissible unit revision cannot supersede an otherwise valid publication', () => {
  const a = observation();
  const b = observation({
    id: 'b',
    revises: 'a',
    value: '1',
    unit: 'percent',
    publishedAt: '2027-01-21T00:00:00Z',
    availableAt: '2027-01-21T00:01:00Z',
  });
  assert.equal(resolve(spec(), evidence([a, b]), context).status, 'YES');
});

test('a revision can change USD scale only with explicit conversion permission', () => {
  const a = observation();
  const b = observation({
    id: 'b',
    revises: 'a',
    value: '30000',
    unit: 'USD_million',
    publishedAt: '2027-01-21T00:00:00Z',
    availableAt: '2027-01-21T00:01:00Z',
  });
  assert.equal(resolve(spec(), evidence([a, b]), context).status, 'NO');
  const s = spec();
  s.policies.units = 'exact';
  assert.equal(resolve(s, evidence([a, b]), context).status, 'YES');
});

test('cyclic, missing-parent, cross-source and backward-time revisions are unusable', () => {
  const variants = [
    [observation({ revises: 'a' })],
    [observation({ revises: 'missing' })],
    [
      observation(),
      observation({ id: 'b', revises: 'a', sourceId: 'registry' }),
    ],
    [
      observation(),
      observation({
        id: 'b',
        revises: 'a',
        publishedAt: '2027-01-19T00:00:00Z',
        availableAt: '2027-01-19T00:01:00Z',
      }),
    ],
  ];
  for (const observations of variants) {
    const s = spec();
    s.policies.sourceConflict = 'review';
    assert.equal(
      resolve(s, evidence(observations), context).reasonCodes[0],
      'EVIDENCE_INTEGRITY',
    );
  }
});

test('duplicate observations are idempotent and conflicting IDs are rejected', () => {
  const o = observation();
  assert.deepEqual(
    resolve(spec(), evidence([o]), context),
    resolve(spec(), evidence([o, structuredClone(o)]), context),
  );
  assert.equal(
    resolve(spec(), evidence([o, { ...o, value: '1' }]), context)
      .reasonCodes[0],
    'EVIDENCE_INTEGRITY',
  );
});

test('source precedence contains lower-priority ambiguity, including definition and revision defects', () => {
  const s = spec();
  delete s.policies.provisional;
  delete s.policies.units;
  delete s.policies.latePublication;
  const primary = observation();
  for (const overrides of [
    { value: '1' },
    { status: 'provisional' as const },
    { definitionId: 'changed' },
    { unit: 'USD_million' as const },
    { revises: 'missing' },
    {
      publishedAt: '2027-02-02T00:00:00Z',
      availableAt: '2027-02-02T00:01:00Z',
    },
  ]) {
    assert.equal(
      resolve(
        s,
        evidence([
          primary,
          observation({ id: 'lower', sourceId: 'registry', ...overrides }),
        ]),
        context,
      ).status,
      'YES',
    );
  }
  assert.equal(
    resolve(
      s,
      evidence([
        primary,
        observation({ id: 'lower-a', sourceId: 'registry', value: '1' }),
        observation({ id: 'lower-b', sourceId: 'registry', value: '2' }),
      ]),
      context,
    ).status,
    'YES',
  );
});

test('inactive fallback and lower authority events cannot override a valid primary', () => {
  for (const sourceId of ['registry', 'archive']) {
    assert.equal(
      resolve(
        spec(),
        evidence([observation()], [event('corporateAction', sourceId)]),
        context,
      ).status,
      'YES',
    );
  }
  assert.equal(
    resolve(
      spec(),
      evidence([observation()], [event('corporateAction')]),
      context,
    ).status,
    'REVIEW_REQUIRED',
  );
});

test('fallback needs explicit policy and outage of all predecessor sources', () => {
  const s = spec();
  s.sources = [
    s.sources[0]!,
    { id: 'archive', name: 'archive', priority: 2, replaces: 'issuer' },
    { id: 'mirror', name: 'mirror', priority: 3, replaces: 'archive' },
  ];
  const replacement = observation({ sourceId: 'mirror' });
  const outage = event('sourceOutage');
  assert.equal(
    resolve(s, evidence([replacement], [outage]), context).status,
    'REVIEW_REQUIRED',
  );
  assert.equal(
    resolve(
      s,
      evidence(
        [replacement],
        [outage, { ...event('sourceOutage', 'archive'), id: 'outage-archive' }],
      ),
      context,
    ).status,
    'YES',
  );
  delete s.policies.sourceReplacement;
  assert.equal(
    resolve(s, evidence([replacement], [outage]), context).status,
    'UNDEFINED',
  );
});

test('source outage does not erase evidence already retrieved before the outage', () => {
  const outage = {
    ...event('sourceOutage'),
    occurredAt: '2027-01-21T00:00:00Z',
    availableAt: '2027-01-21T00:01:00Z',
  };
  assert.equal(
    resolve(spec(), evidence([observation()], [outage]), context).status,
    'YES',
  );
});

test('same-source conflicting heads are never resolved by source precedence', () => {
  assert.equal(
    resolve(
      spec(),
      evidence([observation(), observation({ id: 'b', value: '1' })]),
      context,
    ).reasonCodes[0],
    'SAME_SOURCE_CONFLICT',
  );
});

test('unit safety rejects incompatible dimensions and requires explicit scale conversion', () => {
  const s = spec();
  const invalid = resolve(
    s,
    evidence([observation({ unit: 'percent' })]),
    context,
  );
  assert.equal(invalid.status, 'REVIEW_REQUIRED');
  assert.ok(invalid.trace.some((step) => step.code === 'UNIT_REJECTED'));
  delete s.policies.units;
  assert.equal(
    resolve(s, evidence([observation({ unit: 'USD_million' })]), context)
      .status,
    'UNDEFINED',
  );
  s.policies.units = 'exact';
  assert.equal(
    resolve(s, evidence([observation({ unit: 'USD_million' })]), context)
      .status,
    'REVIEW_REQUIRED',
  );
});

test('period mismatch and pre-period publication are rejected', () => {
  const o = observation();
  o.reportingPeriod = { ...o.reportingPeriod, id: 'wrong-quarter' };
  assert.equal(
    resolve(spec(), evidence([o]), context).status,
    'REVIEW_REQUIRED',
  );
  assert.equal(
    resolve(
      spec(),
      evidence([
        observation({
          publishedAt: '2026-12-31T00:00:00Z',
          availableAt: '2026-12-31T00:01:00Z',
        }),
      ]),
      context,
    ).status,
    'REVIEW_REQUIRED',
  );
});

test('explicit evaluation rejects future settlement attempts and malformed evidence', () => {
  assert.equal(
    resolve(spec(), evidence(), {
      ...context,
      settlementAttemptAt: '2027-02-05T00:00:00Z',
    }).reasonCodes[0],
    'INVALID_CONTEXT',
  );
  assert.equal(
    resolve(spec(), { observations: [{}] }, context).reasonCodes[0],
    'INVALID_EVIDENCE',
  );
});

test('resolver does not mutate frozen input objects and order invariance includes logical trace', () => {
  const s = spec();
  const a = observation();
  const b = observation({ id: 'b', sourceId: 'registry', value: '1' });
  const deepFreeze = (value: unknown): void => {
    if (value && typeof value === 'object') {
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
  };
  deepFreeze(s);
  deepFreeze(a);
  deepFreeze(b);
  assert.deepEqual(
    resolve(s, evidence([a, b]), context),
    resolve(s, evidence([b, a]), context),
  );
});

test('generated exact integer comparisons agree with independent bigint oracle', () => {
  fc.assert(
    fc.property(
      fc.bigInt({ min: -(10n ** 100n), max: 10n ** 100n }),
      fc.bigInt({ min: -(10n ** 100n), max: 10n ** 100n }),
      (a, b) => {
        assert.equal(
          compareDecimal(a.toString(), b.toString()),
          a < b ? -1 : a > b ? 1 : 0,
        );
      },
    ),
    { seed: 18472941, numRuns: 1000 },
  );
});
