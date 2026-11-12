import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canonicalJson } from '../src/canonical.js';
import { checkClaim, PROPERTY_IDS } from '../src/check.js';
import { SCENARIOS } from '../src/scenarios.js';
import { validateClaim } from '../src/validation.js';
import { EvidenceSetSchema, type ClaimSpecV1 } from '../src/model.js';

function fixture(name = 'hardened'): ClaimSpecV1 {
  const input: unknown = JSON.parse(
    readFileSync(
      new URL(`../examples/${name}-demo.json`, import.meta.url),
      'utf8',
    ),
  );
  const validation = validateClaim(input);
  assert.equal(validation.valid, true);
  if (!validation.valid) throw new Error('Invalid test fixture');
  return validation.spec;
}

test('the catalogue has stable unique IDs for every required adversarial family', () => {
  const ids = SCENARIOS.map((scenario) => scenario.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const required of [
    'boundary-exact-strike',
    'missing-publication',
    'late-publication',
    'source-conflict',
    'source-precedence',
    'restatement-before-determination',
    'restatement-after-settlement',
    'metric-discontinuation',
    'definition-drift',
    'reporting-period-mismatch',
    'calendar-change',
    'unit-scale-mismatch',
    'rounding-boundary',
    'source-outage',
    'source-replacement',
    'corporate-action',
    'provisional-only',
    'out-of-order-arrival',
    'duplicate-evidence',
    'future-evidence',
  ])
    assert.ok(ids.includes(required), required);
});

test('broken claim is valid JSON/domain data but has executed semantic counterexamples', () => {
  const report = checkClaim(fixture('broken'), { runs: 20 });
  assert.equal(report.validation.valid, true);
  assert.equal(report.verdict, 'COUNTEREXAMPLE_FOUND');
  for (const code of [
    'CL004',
    'CL005',
    'CL006',
    'CL007',
    'CL008',
    'CL009',
    'CL010',
    'CL011',
  ])
    assert.ok(
      report.findings.some((finding) => finding.code === code),
      code,
    );
  const missing = report.namedScenarios.find(
    (scenario) => scenario.id === 'missing-publication',
  );
  assert.equal(missing?.status, 'FAIL');
  assert.equal(missing.resolution?.status, 'UNDEFINED');
  assert.equal(
    report.namedScenarios.find(
      (scenario) => scenario.id === 'publication-pending',
    )?.status,
    'PASS',
  );
});

test('hardened claim has no counterexample in every applicable named and generated check', () => {
  const report = checkClaim(fixture(), { runs: 35 });
  assert.equal(report.verdict, 'NO_COUNTEREXAMPLE_FOUND');
  assert.deepEqual(report.findings, []);
  assert.equal(report.namedScenarios.length, SCENARIOS.length);
  assert.ok(
    report.namedScenarios.every(
      (scenario) =>
        scenario.status === 'PASS' || scenario.status === 'DEFINED_REVIEW',
    ),
  );
  assert.deepEqual(
    report.generated.checks.map((check) => check.propertyId),
    PROPERTY_IDS,
  );
  assert.equal(report.generated.executedRuns, 35 * PROPERTY_IDS.length);
  assert.ok(report.generated.checks.every((check) => check.status === 'PASS'));
  assert.match(report.disclaimer, /not a formal proof/);
});

test('review is visibly defined but nonterminal and carries no payout', () => {
  const report = checkClaim(fixture(), { runs: 2 });
  const missing = report.namedScenarios.find(
    (scenario) => scenario.id === 'missing-publication',
  );
  assert.equal(missing?.status, 'DEFINED_REVIEW');
  assert.equal(missing.resolution?.terminal, false);
  assert.equal(missing.resolution?.payout, undefined);
  assert.equal(missing.resolution?.reviewProcessId, 'synthetic-review-v1');
});

test('fixed seed reproduces the complete report and fast-check shrink path replays the minimal evidence state', () => {
  const spec = fixture('broken');
  const report = checkClaim(spec, {
    runs: 20,
    seed: 90210,
    property: 'TOTALITY',
  });
  assert.equal(
    canonicalJson(report),
    canonicalJson(
      checkClaim(spec, { runs: 20, seed: 90210, property: 'TOTALITY' }),
    ),
  );
  const failure = report.generated.checks[0]!;
  assert.equal(failure.status, 'FAIL');
  assert.ok(failure.path);
  const replay = checkClaim(spec, {
    runs: 20,
    seed: failure.seed,
    property: 'TOTALITY',
    path: failure.path,
  });
  assert.equal(replay.generated.checks[0]?.status, 'FAIL');
  const captured = failure.counterexample as {
    inputs: unknown;
    choice: unknown;
    engineVersion: string;
    specDigest: string;
    shrinks: number;
  };
  const reproduced = replay.generated.checks[0]?.counterexample as {
    inputs: unknown;
    choice: unknown;
  };
  assert.deepEqual(captured.inputs, reproduced.inputs);
  assert.deepEqual(captured.choice, reproduced.choice);
  assert.equal(captured.engineVersion, report.engineVersion);
  assert.equal(captured.specDigest, report.specDigest);
  assert.ok(captured.shrinks >= 0);
});

test('all six contractual comparators have their specified equality behavior', () => {
  const expected: Record<ClaimSpecV1['condition']['comparator'], string> = {
    '>': 'NO',
    '>=': 'YES',
    '<': 'NO',
    '<=': 'YES',
    '==': 'YES',
    '!=': 'NO',
  };
  for (const [comparator, status] of Object.entries(expected)) {
    const spec = fixture();
    spec.condition.comparator =
      comparator as ClaimSpecV1['condition']['comparator'];
    const report = checkClaim(spec, { runs: 3, property: 'EXACT_BOUNDARY' });
    assert.equal(report.verdict, 'NO_COUNTEREXAMPLE_FOUND', comparator);
    assert.equal(
      report.namedScenarios.find(
        (scenario) => scenario.id === 'boundary-exact-strike',
      )?.resolution?.status,
      status,
      comparator,
    );
  }
});

test('source order changes neither the normalized spec digest nor logical check output', () => {
  const spec = fixture();
  const reversed = structuredClone(spec);
  reversed.sources.reverse();
  const first = checkClaim(spec, { runs: 5 });
  const second = checkClaim(reversed, { runs: 5 });
  assert.equal(canonicalJson(first), canonicalJson(second));
});

test('structurally inapplicable source probes are skipped with coverage reported', () => {
  const spec = fixture();
  spec.sources = spec.sources.filter((source) => source.id === 'issuer');
  const report = checkClaim(spec, { runs: 5 });
  assert.equal(report.verdict, 'NO_COUNTEREXAMPLE_FOUND');
  for (const id of [
    'source-conflict',
    'source-precedence',
    'source-replacement',
  ])
    assert.equal(
      report.namedScenarios.find((scenario) => scenario.id === id)?.status,
      'SKIPPED',
    );
  assert.equal(
    report.generated.checks.find(
      (check) => check.propertyId === 'SOURCE_PRECEDENCE',
    )?.status,
    'SKIPPED',
  );
});

test('check input is immutable and invalid specification produces no misleading executed tests', () => {
  const spec = fixture();
  const before = canonicalJson(spec);
  checkClaim(spec, { runs: 2 });
  assert.equal(canonicalJson(spec), before);
  const invalid = checkClaim(
    { ...spec, condition: { comparator: 'approximately', strike: '31' } },
    { runs: 2 },
  );
  assert.equal(invalid.verdict, 'INVALID_SPEC');
  assert.equal(invalid.generated.executedRuns, 0);
  assert.deepEqual(invalid.namedScenarios, []);
});

test('invalid fuzz configuration is rejected before execution', () => {
  const spec = fixture();
  assert.throws(() => checkClaim(spec, { runs: 0 }), /runs/);
  assert.throws(() => checkClaim(spec, { runs: 1.5 }), /runs/);
  assert.throws(() => checkClaim(spec, { seed: 2147483648 }), /seed/);
  assert.throws(() => checkClaim(spec, { path: '0:1' }), /path/);
  assert.throws(
    () => checkClaim(spec, { property: 'TOTALITY', path: 'bad' }),
    /path/,
  );
});

test('decimal-domain boundaries never manufacture invalid evidence or false comparator findings', () => {
  const strikes = [
    '9'.repeat(128),
    `-${'9'.repeat(127)}`,
    `0.${'0'.repeat(125)}1`,
  ];
  for (const strike of strikes) {
    const spec = fixture();
    spec.condition.strike = strike;
    assert.equal(validateClaim(spec).valid, true);
    for (const scenario of SCENARIOS) {
      const input = scenario.build(spec);
      if (!input) continue;
      assert.equal(
        EvidenceSetSchema.safeParse(input.evidence).success,
        true,
        `${scenario.id}: ${strike}`,
      );
      if (input.comparison)
        assert.equal(
          EvidenceSetSchema.safeParse(input.comparison.evidence).success,
          true,
          `${scenario.id} comparison: ${strike}`,
        );
    }
    const report = checkClaim(spec, { runs: 12, property: 'EXACT_BOUNDARY' });
    assert.equal(report.verdict, 'NO_COUNTEREXAMPLE_FOUND', strike);
    assert.equal(report.generated.checks[0]?.status, 'PASS');
    assert.equal(report.namedScenarios.length, 27);
    if (strike === strikes[0]) {
      for (const id of [
        'boundary-above-strike',
        'rounding-boundary',
        'unit-scale-mismatch',
      ])
        assert.equal(
          report.namedScenarios.find((scenario) => scenario.id === id)?.status,
          'SKIPPED',
          id,
        );
    }
    if (strike === strikes[1])
      assert.equal(
        report.namedScenarios.find(
          (scenario) => scenario.id === 'boundary-below-strike',
        )?.status,
        'SKIPPED',
      );
  }
});
