import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ClaimSpecV1Schema,
  InstantSchema,
  type ClaimSpecV1,
  type EvidenceObservation,
} from '../src/model.js';
import { resolve } from '../src/resolver.js';

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
  claim: ClaimSpecV1,
  publishedAt: string,
  availableAt = publishedAt,
): EvidenceObservation {
  return {
    id: 'temporal-audit',
    sourceId: 'issuer',
    entityId: claim.reference.entityId,
    metricId: claim.reference.metricId,
    definitionId: claim.reference.definitionId,
    reportingPeriod: claim.reference.reportingPeriod,
    value: '32',
    unit: claim.reference.unit,
    status: 'final',
    publishedAt,
    availableAt,
  };
}

test('audit: unsupported leap-second evidence must not collapse into an earlier eligible instant', () => {
  const claim = spec();
  Object.assign(claim.timing, {
    observationStart: '2016-10-01T00:00:00Z',
    observationEnd: '2016-12-31T00:00:00Z',
    publicationDeadline: '2016-12-31T23:59:59Z',
    determinationAt: '2016-12-31T23:59:59Z',
    settlementAt: '2017-01-01T00:00:00Z',
  });
  Object.assign(claim.reference.reportingPeriod, {
    start: claim.timing.observationStart,
    end: claim.timing.observationEnd,
  });
  claim.policies.latePublication = 'reject';
  const result = resolve(
    claim,
    { observations: [observation(claim, '2016-12-31T23:59:60Z')], events: [] },
    { asOf: claim.timing.settlementAt },
  );
  assert.equal(result.status, 'UNDEFINED');
  assert.deepEqual(result.reasonCodes, ['INVALID_EVIDENCE']);
});

test('audit: unsupported leap-second syntax is rejected in every permitted timestamp form', () => {
  for (const value of [
    '2016-12-31T23:59:60Z',
    '2016-12-31T23:59:60.1Z',
    '2016-12-31T23:59:60,1Z',
    '2016-12-31t23:59:60Z',
    '2016-12-31 23:59:60Z',
    '2017-01-01T05:29:60+05:30',
    '2027-02-01T12:34:60Z',
    '20161231T235960Z',
  ]) {
    assert.equal(InstantSchema.safeParse(value).success, false, value);
  }
});

test('audit: publication at a deadline is inclusive while a nanosecond later follows the late rule', () => {
  const claim = spec();
  claim.policies.latePublication = 'reject';
  for (const [timestamp, expected] of [
    ['2027-01-31T23:59:59.999999999Z', 'YES'],
    ['2027-02-01T00:00:00Z', 'YES'],
    ['2027-02-01T00:00:00.000000001Z', 'REVIEW_REQUIRED'],
  ]) {
    const result = resolve(
      claim,
      { observations: [observation(claim, timestamp!)], events: [] },
      { asOf: claim.timing.settlementAt },
    );
    assert.equal(result.status, expected, timestamp);
  }
});

test('audit: offset-equivalent nanosecond timestamps produce identical complete resolutions', () => {
  const claim = spec();
  const utc = observation(claim, '2027-01-31T23:59:59.999999999Z');
  const offset = observation(claim, '2027-02-01T05:29:59.999999999+05:30');
  assert.deepEqual(
    resolve(
      claim,
      { observations: [utc], events: [] },
      { asOf: claim.timing.settlementAt },
    ),
    resolve(
      claim,
      { observations: [offset], events: [] },
      { asOf: claim.timing.settlementAt },
    ),
  );
});

test('audit: fixed knowledge cutoff excludes retrieval a nanosecond after determination', () => {
  const claim = spec();
  for (const [availableAt, expected] of [
    [claim.timing.determinationAt, 'YES'],
    ['2027-02-03T00:00:00.000000001Z', 'REVIEW_REQUIRED'],
  ]) {
    const record = observation(
      claim,
      claim.timing.publicationDeadline,
      availableAt!,
    );
    assert.equal(
      resolve(
        claim,
        { observations: [record], events: [] },
        { asOf: claim.timing.settlementAt },
      ).status,
      expected,
    );
  }
});

test('audit: a future publication with misleading earlier retrieval cannot affect a past decision', () => {
  const claim = spec();
  delete claim.policies.corrections;
  const current = observation(claim, claim.timing.publicationDeadline);
  const future = {
    ...observation(
      claim,
      '2027-02-04T00:00:00.000000001Z',
      claim.timing.publicationDeadline,
    ),
    id: 'future-misleading',
    value: '1',
  };
  const context = { asOf: claim.timing.settlementAt };
  assert.deepEqual(
    resolve(claim, { observations: [current, future], events: [] }, context),
    resolve(claim, { observations: [current], events: [] }, context),
  );
});

test('audit: explicit offsets and expanded ISO years normalize without a machine-local calendar', () => {
  for (const [input, expected] of [
    ['-000001-01-01T00:00:00Z', '-000001-01-01T00:00:00Z'],
    ['+010000-01-01T05:30:00+05:30', '+010000-01-01T00:00:00Z'],
  ]) {
    assert.equal(InstantSchema.parse(input), expected);
  }
  for (const input of [
    '2027-02-29T00:00:00Z',
    '2027-02-01T24:00:00Z',
    '2027-02-01T00:00:00',
    '2027-02-01T00:00:00Z\n',
  ]) {
    assert.equal(InstantSchema.safeParse(input).success, false, input);
  }
});
