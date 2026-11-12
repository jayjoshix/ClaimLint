import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import fc from 'fast-check';
import { compareDecimal, roundDecimal, shiftDecimal } from '../src/decimal.js';
import {
  ClaimSpecV1Schema,
  DecimalSchema,
  type ClaimSpecV1,
  type EvidenceObservation,
} from '../src/model.js';
import { resolve } from '../src/resolver.js';

// The oracle starts from rational n/10^scale, not the production parser.
function encode(n: bigint, scale: number): string {
  if (n === 0n) return '0';
  const sign = n < 0n ? '-' : '';
  const digits = (n < 0n ? -n : n).toString().padStart(scale + 1, '0');
  const raw = scale
    ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}`
    : digits;
  return (
    sign + (raw.includes('.') ? raw.replace(/0+$/, '').replace(/\.$/, '') : raw)
  );
}

function floor(n: bigint, d: bigint): bigint {
  return n >= 0n ? n / d : -((-n + d - 1n) / d);
}

function oracleRound(
  n: bigint,
  scale: number,
  places: number,
  mode: 'halfEven' | 'halfUp' | 'truncate',
): string {
  const numerator = n * 10n ** BigInt(places);
  const denominator = 10n ** BigInt(scale);
  // Bracket the exact value on the requested decimal grid, then compare distances.
  const lower = floor(numerator, denominator);
  const upper = lower + 1n;
  const toLower = numerator - lower * denominator;
  const toUpper = upper * denominator - numerator;
  let chosen: bigint;
  if (toLower === 0n) chosen = lower;
  else if (mode === 'truncate') chosen = n < 0n ? upper : lower;
  else if (toLower < toUpper) chosen = lower;
  else if (toLower > toUpper) chosen = upper;
  else if (mode === 'halfEven') chosen = lower % 2n === 0n ? lower : upper;
  else chosen = n < 0n ? lower : upper;
  return encode(chosen, places);
}

const rational = fc.record({
  n: fc.bigInt({ min: -(10n ** 100n), max: 10n ** 100n }),
  scale: fc.integer({ min: 0, max: 110 }),
});

test('audit: signed fractional comparison, scaling and rounding match an independent rational oracle', () => {
  fc.assert(
    fc.property(
      rational,
      rational,
      fc.integer({ min: -9, max: 9 }),
      fc.integer({ min: 0, max: 36 }),
      fc.constantFrom(
        'halfEven' as const,
        'halfUp' as const,
        'truncate' as const,
      ),
      (a, b, power, places, mode) => {
        const left = encode(a.n, a.scale);
        const right = encode(b.n, b.scale);
        const difference =
          a.n * 10n ** BigInt(b.scale) - b.n * 10n ** BigInt(a.scale);
        assert.equal(
          compareDecimal(left, right),
          difference < 0n ? -1 : difference > 0n ? 1 : 0,
        );
        const shifted =
          power <= a.scale
            ? encode(a.n, a.scale - power)
            : encode(a.n * 10n ** BigInt(power - a.scale), 0);
        assert.equal(shiftDecimal(left, power), shifted);
        assert.equal(
          roundDecimal(left, places, mode),
          oracleRound(a.n, a.scale, places, mode),
        );
      },
    ),
    { seed: 772019, numRuns: 500 },
  );
});

test('audit: noncanonical numeric encodings are rejected rather than interpreted', () => {
  for (const value of [
    '31.0',
    '31.00',
    '-0',
    '-0.0',
    '00',
    '.1',
    '1.',
    '+1',
    '1e0',
    ' 31',
    '31 ',
    '31\n',
    '31.1\n',
    '1_000',
    'NaN',
    'Infinity',
    '٣١',
    '',
    31,
    NaN,
    null,
  ]) {
    assert.equal(
      DecimalSchema.safeParse(value).success,
      false,
      JSON.stringify(value),
    );
  }
  assert.equal(DecimalSchema.safeParse('9'.repeat(128)).success, true);
  assert.equal(DecimalSchema.safeParse('-' + '9'.repeat(127)).success, true);
  assert.equal(
    DecimalSchema.safeParse('0.' + '0'.repeat(125) + '1').success,
    true,
  );
  assert.equal(DecimalSchema.safeParse('9'.repeat(129)).success, false);
});

test('audit: signed ties use half-even parity, half-up away from zero and truncation toward zero', () => {
  const values = ['-2.5', '-1.5', '-0.5', '0.5', '1.5', '2.5'];
  for (const [mode, expected] of [
    ['halfEven', ['-2', '-2', '0', '0', '2', '2']],
    ['halfUp', ['-3', '-2', '-1', '1', '2', '3']],
    ['truncate', ['-2', '-1', '0', '0', '1', '2']],
  ] as const) {
    assert.deepEqual(
      values.map((value) => roundDecimal(value, 0, mode)),
      expected,
    );
  }
});

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
  value: string,
  unit: EvidenceObservation['unit'],
): EvidenceObservation {
  return {
    id: 'numeric-audit',
    sourceId: 'issuer',
    entityId: claim.reference.entityId,
    metricId: claim.reference.metricId,
    definitionId: claim.reference.definitionId,
    reportingPeriod: claim.reference.reportingPeriod,
    value,
    unit,
    status: 'final',
    publishedAt: claim.timing.publicationDeadline,
    availableAt: claim.timing.publicationDeadline,
  };
}

test('audit: all six boundary operators preserve equality across signed USD scales', () => {
  for (const [strike, million, dollars] of [
    ['31', '31000', '31000000000'],
    ['-31', '-31000', '-31000000000'],
    ['0', '0', '0'],
  ]) {
    for (const [operator, truth] of [
      ['>', false],
      ['>=', true],
      ['<', false],
      ['<=', true],
      ['==', true],
      ['!=', false],
    ] as const) {
      for (const [unit, value] of [
        ['USD_billion', strike!],
        ['USD_million', million!],
        ['USD', dollars!],
      ] as const) {
        const claim = spec();
        claim.condition = { comparator: operator, strike: strike! };
        delete claim.policies.rounding;
        const result = resolve(
          claim,
          { observations: [observation(claim, value, unit)], events: [] },
          { asOf: claim.timing.settlementAt },
        );
        assert.equal(
          result.status,
          truth ? 'YES' : 'NO',
          `${strike} ${operator} ${value} ${unit}`,
        );
      }
    }
  }
});

test('audit: valid maximum-length operands remain exact when conversion expands the internal value', () => {
  const claim = spec();
  claim.reference.unit = 'USD';
  claim.condition.strike = '9'.repeat(128);
  delete claim.policies.rounding;
  const result = resolve(
    claim,
    {
      observations: [observation(claim, '9'.repeat(128), 'USD_million')],
      events: [],
    },
    { asOf: claim.timing.settlementAt },
  );
  assert.equal(result.status, 'YES');
  assert.equal(
    result.trace.find((step) => step.code === 'UNIT_CONVERTED')?.data.value,
    '9'.repeat(128) + '000000',
  );
});
