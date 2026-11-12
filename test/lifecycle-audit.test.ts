import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ClaimSpecV1,
  EvidenceObservation,
  ResolutionResult,
  WorldEvent,
} from '../src/model.js';
import { resolve } from '../src/resolver.js';

// Raw audit inputs deliberately do not use the production scenario builders.
function contract(): ClaimSpecV1 {
  return {
    schemaVersion: '1.0',
    id: 'audit-claim',
    title: 'Audit number exceeds 31 USD',
    reference: {
      entityId: 'entity',
      entityName: 'Synthetic audit entity',
      metricId: 'metric',
      metricName: 'Synthetic audit number',
      metricDefinition: 'The external number under definition v1',
      definitionId: 'definition-v1',
      unit: 'USD',
      reportingPeriod: {
        id: '2026-Q4',
        start: '2026-10-01T00:00:00Z',
        end: '2027-01-01T00:00:00Z',
        calendar: 'gregorian-quarter',
      },
    },
    condition: { comparator: '>', strike: '31' },
    sources: [
      { id: 'primary', name: 'Primary', priority: 1 },
      { id: 'secondary', name: 'Secondary', priority: 2 },
      { id: 'backup', name: 'Backup', priority: 3, replaces: 'primary' },
      {
        id: 'cold-backup',
        name: 'Cold backup',
        priority: 4,
        replaces: 'backup',
      },
    ],
    timing: {
      observationStart: '2026-10-01T00:00:00Z',
      observationEnd: '2027-01-01T00:00:00Z',
      publicationDeadline: '2027-02-01T00:00:00Z',
      determinationAt: '2027-02-03T00:00:00Z',
      settlementAt: '2027-02-04T00:00:00Z',
    },
    policies: {
      missingData: 'review',
      latePublication: 'reject',
      sourceConflict: 'precedence',
      corrections: 'freezeAtDetermination',
      sourceReplacement: 'fallback',
      provisional: 'finalOnly',
      units: 'exact',
      dispute: {
        processId: 'audit-review',
        description: 'External audit review',
      },
    },
    payout: { currency: 'USD', yes: '1', no: '0' },
  };
}

function release(
  changes: Partial<EvidenceObservation> = {},
): EvidenceObservation {
  return {
    id: 'a',
    sourceId: 'primary',
    entityId: 'entity',
    metricId: 'metric',
    definitionId: 'definition-v1',
    value: '32',
    unit: 'USD',
    reportingPeriod: {
      id: '2026-Q4',
      start: '2026-10-01T00:00:00Z',
      end: '2027-01-01T00:00:00Z',
      calendar: 'gregorian-quarter',
    },
    publishedAt: '2027-01-20T00:00:00Z',
    availableAt: '2027-01-20T00:00:00Z',
    status: 'final',
    revisionId: 'v1',
    ...changes,
  };
}

function correction(
  changes: Partial<EvidenceObservation> = {},
): EvidenceObservation {
  return release({
    id: 'b',
    revises: 'a',
    revisionId: 'v2',
    value: '30',
    publishedAt: '2027-01-21T00:00:00Z',
    availableAt: '2027-01-21T00:00:00Z',
    ...changes,
  });
}

function outage(changes: Partial<WorldEvent> = {}): WorldEvent {
  return {
    id: 'outage',
    sourceId: 'primary',
    entityId: 'entity',
    type: 'sourceOutage',
    occurredAt: '2027-01-21T00:00:00Z',
    availableAt: '2027-01-21T00:00:00Z',
    ...changes,
  };
}

function evaluate(
  spec: ClaimSpecV1,
  observations: EvidenceObservation[],
  events: WorldEvent[] = [],
) {
  return resolve(
    spec,
    { observations, events },
    { asOf: '2027-02-04T00:00:00Z' },
  );
}

function financialDecision(result: ResolutionResult) {
  return {
    status: result.status,
    terminal: result.terminal,
    payout: result.payout,
    reviewProcessId: result.reviewProcessId,
  };
}

test('audit: duplicate base aliases cannot resurrect a superseded value', () => {
  const spec = contract();
  const a = release();
  const alias = release({ id: '0-copy' });
  const b = correction();
  const expected = evaluate(spec, [a, b]);
  assert.equal(expected.status, 'NO');
  for (const observations of [
    [a, alias, b],
    [b, alias, a],
    [alias, b, a],
  ]) {
    assert.deepEqual(
      financialDecision(evaluate(spec, observations)),
      financialDecision(expected),
    );
  }
});

test('audit: revisions may reference either alias of an equivalent parent', () => {
  const spec = contract();
  const a = release();
  const alias = release({ id: '0-copy' });
  const b = correction({ revises: alias.id });
  assert.equal(evaluate(spec, [a, alias, b]).status, 'NO');
});

test('audit: explicitly convertible USD copies cannot resurrect a superseded value', () => {
  const spec = contract();
  spec.condition.strike = '31000000';
  spec.policies.units = 'convertUSD';
  const a = release({ value: '32000000' });
  const alias = release({ id: '0-copy', value: '32', unit: 'USD_million' });
  const b = correction({ value: '30000000' });
  const expected = evaluate(spec, [a, b]);
  assert.equal(expected.status, 'NO');
  assert.deepEqual(
    financialDecision(evaluate(spec, [a, alias, b])),
    financialDecision(expected),
  );
});

test('audit: equivalent revised parents normalize their equivalent predecessor references', () => {
  const spec = contract();
  const a = release();
  const aAlias = release({ id: '0-base-copy' });
  const b = correction();
  const bAlias = correction({ id: '0-revision-copy', revises: aAlias.id });
  const c = correction({
    id: 'c',
    revises: bAlias.id,
    revisionId: 'v3',
    value: '29',
    publishedAt: '2027-01-22T00:00:00Z',
    availableAt: '2027-01-22T00:00:00Z',
  });
  assert.equal(evaluate(spec, [c, bAlias, a, b, aAlias]).status, 'NO');
});

test('audit: distinct revision identities are not merged merely because old values agree', () => {
  const spec = contract();
  const independent = release({
    id: 'independent',
    revisionId: 'different-revision',
  });
  const result = evaluate(spec, [release(), independent, correction()]);
  assert.equal(result.status, 'UNDEFINED');
  assert.equal(result.reasonCodes[0], 'SAME_SOURCE_CONFLICT');
});

for (const bad of [
  correction({ id: 'z', revises: 'absent' }),
  correction({ id: 'z', revises: 'z' }),
  correction({
    id: 'z',
    publishedAt: '2027-01-19T00:00:00Z',
    availableAt: '2027-01-19T00:00:00Z',
  }),
]) {
  test(`audit: correction review does not hide invalid graph (${bad.revises}, ${bad.publishedAt})`, () => {
    const spec = contract();
    spec.policies.corrections = 'review';
    const good = correction();
    for (const [validId, invalidId] of [
      ['b', 'z'],
      ['z', 'b'],
    ] as const) {
      const invalid = {
        ...bad,
        id: invalidId,
        ...(bad.revises === 'z' ? { revises: invalidId } : {}),
      };
      const result = evaluate(spec, [
        release(),
        { ...good, id: validId },
        invalid,
      ]);
      assert.equal(result.status, 'UNDEFINED');
      assert.equal(result.reasonCodes[0], 'EVIDENCE_INTEGRITY');
    }
  });
}

test('audit: a coherent correction still takes its explicit review route', () => {
  const spec = contract();
  spec.policies.corrections = 'review';
  const result = evaluate(spec, [release(), correction()]);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.terminal, false);
  assert.equal(result.reviewProcessId, 'audit-review');
});

for (const sourceReplacement of [undefined, 'review'] as const) {
  test(`audit: cached primary data needs no replacement route (${sourceReplacement ?? 'absent'})`, () => {
    const spec = contract();
    if (sourceReplacement === undefined) delete spec.policies.sourceReplacement;
    else spec.policies.sourceReplacement = sourceReplacement;
    const expected = evaluate(spec, [release()]);
    const afterOutage = evaluate(spec, [release()], [outage()]);
    assert.equal(expected.status, 'YES');
    assert.deepEqual(
      financialDecision(afterOutage),
      financialDecision(expected),
    );
  });
}

test('audit: absent replacement rules remain undefined when replacement is actually needed', () => {
  const spec = contract();
  delete spec.policies.sourceReplacement;
  const result = evaluate(
    spec,
    [release({ sourceId: 'backup' })],
    [
      outage({
        occurredAt: '2027-01-19T00:00:00Z',
        availableAt: '2027-01-19T00:00:00Z',
      }),
    ],
  );
  assert.equal(result.status, 'UNDEFINED');
  assert.equal(result.reasonCodes[0], 'SOURCE_REPLACEMENT_POLICY_MISSING');
});

test('audit: explicit replacement review remains defined when primary data is unavailable', () => {
  const spec = contract();
  spec.policies.sourceReplacement = 'review';
  const result = evaluate(spec, [], [outage()]);
  assert.equal(result.status, 'REVIEW_REQUIRED');
});

for (const type of ['sourceOutage', 'sourceReplacement'] as const) {
  test(`audit: an inactive backup ${type} cannot override an eligible primary`, () => {
    const spec = contract();
    spec.policies.sourceReplacement = 'review';
    const expected = evaluate(spec, [release()]);
    const irrelevant = outage({ sourceId: 'backup', type });
    assert.deepEqual(
      financialDecision(evaluate(spec, [release()], [irrelevant])),
      financialDecision(expected),
    );
  });
}

test('audit: a lower-priority root outage cannot override an eligible primary', () => {
  const spec = contract();
  spec.sources.push({
    id: 'secondary-backup',
    name: 'Secondary backup',
    priority: 5,
    replaces: 'secondary',
  });
  spec.policies.sourceReplacement = 'review';
  const expected = evaluate(spec, [release()]);
  assert.deepEqual(
    financialDecision(
      evaluate(spec, [release()], [outage({ sourceId: 'secondary' })]),
    ),
    financialDecision(expected),
  );
});

test('audit: an independently authoritative source does not need to replace an unavailable primary', () => {
  const spec = contract();
  delete spec.policies.sourceReplacement;
  const independent = release({ sourceId: 'secondary' });
  const expected = evaluate(spec, [independent]);
  assert.equal(expected.status, 'YES');
  assert.deepEqual(
    financialDecision(evaluate(spec, [independent], [outage()])),
    financialDecision(expected),
  );
});

test('audit: genuinely competing revision heads remain unresolved under source precedence', () => {
  const spec = contract();
  const branch = correction({ id: 'c', revisionId: 'v3', value: '34' });
  const result = evaluate(spec, [release(), correction(), branch]);
  assert.equal(result.status, 'UNDEFINED');
  assert.equal(result.reasonCodes[0], 'SAME_SOURCE_CONFLICT');
});
