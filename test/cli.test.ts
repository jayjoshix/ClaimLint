import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import type { CheckReport } from '../src/check.js';
import type { ResolutionResult } from '../src/model.js';

let directory: string;
const claim = 'examples/hardened-demo.json';
const broken = 'examples/broken-demo.json';
const asOf = '2027-02-05T12:00:00Z';

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'claimlint-cli-'));
  await Promise.all([
    writeFile(join(directory, 'malformed.json'), '{'),
    writeFile(join(directory, 'invalid.json'), '{}'),
    writeFile(join(directory, 'empty.json'), '{"observations":[],"events":[]}'),
    writeFile(join(directory, 'bad-evidence.json'), '{"observations":[{}]}'),
  ]);
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

function cli(...args: string[]) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'src/cli.ts', ...args],
    { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 },
  );
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null);
  return result;
}

function output<T>(result: ReturnType<typeof cli>): T {
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout) as T;
}

test('validate accepts both synthetic specs without asserting settlement completeness', () => {
  for (const file of [claim, broken]) {
    const result = cli('validate', file, '--format', 'json');
    assert.equal(result.status, 0);
    assert.deepEqual(
      output<{ valid: boolean; issues: unknown[] }>(result).issues,
      [],
    );
  }
});

test('JSON check reports genuine broken-policy counterexamples with exit 1', () => {
  const result = cli(
    'check',
    broken,
    '--runs',
    '3',
    '--seed',
    '18472941',
    '--format',
    'json',
  );
  assert.equal(result.status, 1);
  const report = output<CheckReport>(result);
  assert.equal(report.verdict, 'COUNTEREXAMPLE_FOUND');
  assert.equal(report.validation.valid, true);
  assert.ok(report.findings.some((finding) => finding.code === 'CL004'));
  assert.ok(
    report.namedScenarios.some(
      (scenario) => scenario.resolution?.status === 'UNDEFINED',
    ),
  );
});

test('hardened check exposes review routes and returns no counterexample with exit 0', () => {
  const result = cli(
    'check',
    claim,
    '--runs',
    '3',
    '--seed',
    '18472941',
    '--format',
    'json',
  );
  assert.equal(result.status, 0, result.stdout);
  const report = output<CheckReport>(result);
  assert.equal(report.verdict, 'NO_COUNTEREXAMPLE_FOUND');
  assert.ok(
    report.namedScenarios.some(
      (scenario) => scenario.status === 'DEFINED_REVIEW',
    ),
  );
  assert.equal(report.generated.seed, 18472941);
  assert.ok(report.generated.executedRuns > 0);
});

test('seeded CLI JSON is byte-for-byte reproducible', () => {
  const args = [
    'check',
    broken,
    '--runs',
    '3',
    '--seed',
    '73',
    '--format',
    'json',
  ];
  const first = cli(...args);
  const second = cli(...args);
  assert.equal(first.status, 1);
  assert.equal(second.status, 1);
  assert.equal(first.stdout, second.stdout);
});

test('single resolution converts exact USD units and respects strict boundary', () => {
  const result = cli(
    'resolve',
    claim,
    '--evidence',
    'examples/evidence/exact-strike.json',
    '--as-of',
    asOf,
    '--format',
    'json',
  );
  assert.equal(result.status, 0);
  const resolved = output<ResolutionResult>(result);
  assert.equal(resolved.status, 'NO');
  assert.equal(resolved.terminal, true);
  assert.deepEqual(resolved.payout, { currency: 'USD', amount: '0' });
  assert.ok(resolved.trace.some((step) => step.code === 'UNIT_CONVERTED'));
});

test('historical settlement attempt controls eligibility independently of as-of', () => {
  const result = cli(
    'resolve',
    claim,
    '--evidence',
    'examples/evidence/exact-strike.json',
    '--as-of',
    asOf,
    '--settlement-at',
    '2027-02-01T00:00:00Z',
    '--format',
    'json',
  );
  assert.equal(result.status, 0);
  assert.equal(output<ResolutionResult>(result).status, 'PENDING');
});

test('mature absent data is undefined only for the broken policy set', () => {
  const result = cli(
    'resolve',
    broken,
    '--evidence',
    join(directory, 'empty.json'),
    '--as-of',
    asOf,
    '--format',
    'json',
  );
  assert.equal(result.status, 1);
  assert.equal(output<ResolutionResult>(result).status, 'UNDEFINED');
});

test('invalid specs retain structured command output and exit 2', () => {
  for (const command of ['validate', 'check']) {
    const result = cli(
      command,
      join(directory, 'invalid.json'),
      '--format',
      'json',
    );
    assert.equal(result.status, 2);
    const json = output<{ status?: string; verdict?: string }>(result);
    assert.equal(json.status ?? json.verdict, 'INVALID_SPEC');
  }
});

test('malformed JSON and missing files produce machine-readable input errors', () => {
  for (const file of [
    join(directory, 'malformed.json'),
    join(directory, 'missing.json'),
  ]) {
    const result = cli('validate', file, '--format', 'json');
    assert.equal(result.status, 2);
    assert.equal(
      output<{ status: string }>(result).status,
      'INPUT_OR_TOOL_ERROR',
    );
  }
});

test('invalid evidence and ambiguous timestamps are configuration errors', () => {
  const combinations = [
    ['--evidence', join(directory, 'bad-evidence.json'), '--as-of', asOf],
    [
      '--evidence',
      join(directory, 'empty.json'),
      '--as-of',
      '2027-02-05T12:00:00',
    ],
    [
      '--evidence',
      join(directory, 'empty.json'),
      '--as-of',
      asOf,
      '--settlement-at',
      '2028-01-01T00:00:00Z',
    ],
  ];
  for (const args of combinations) {
    const result = cli('resolve', claim, ...args, '--format', 'json');
    assert.equal(result.status, 2);
    assert.equal(
      output<{ status: string }>(result).status,
      'INPUT_OR_TOOL_ERROR',
    );
  }
});

test('unknown or command-inapplicable options and bad run counts are rejected', () => {
  const combinations = [
    ['check', claim, '--runs', '0'],
    ['check', claim, '--seed', '2147483648'],
    ['check', claim, '--path', '0:0'],
    ['check', claim, '--property', 'UNKNOWN'],
    ['validate', claim, '--runs', '1'],
    ['validate', claim, '--unknown'],
  ];
  for (const args of combinations) {
    const result = cli(...args, '--format', 'json');
    assert.equal(result.status, 2);
    assert.equal(
      output<{ status: string }>(result).status,
      'INPUT_OR_TOOL_ERROR',
    );
  }
});

test('text check output is concise about review and proof limits', () => {
  const result = cli('check', claim, '--runs', '1');
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /DEFINED_REVIEW/);
  assert.match(result.stdout, /NO COUNTEREXAMPLE FOUND/);
  assert.match(result.stdout, /not a formal proof/);
});

test('help documents defaults and version has no side effects', () => {
  const result = cli('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /18472941/);
  const version = cli('--version', '--format', 'json');
  assert.equal(version.status, 0);
  assert.equal(output<{ output: string }>(version).output, '0.1.0');
});

test('CLI rejects oversized input before decoding JSON', async () => {
  const file = join(directory, 'oversized.json');
  await writeFile(file, Buffer.alloc(8 * 1024 * 1024 + 1, 32));
  const result = cli('validate', file, '--format', 'json');
  assert.equal(result.status, 2);
  assert.match(output<{ error: string }>(result).error, /8 MiB limit/);
});

test('text reports escape untrusted terminal and bidirectional controls', async () => {
  const input = JSON.parse(await readFile(claim, 'utf8')) as { title: string };
  input.title = 'untrusted\u001b[2J\u202etitle';
  const file = join(directory, 'terminal-controls.json');
  await writeFile(file, JSON.stringify(input));
  const result = cli('check', file, '--runs', '1');
  assert.equal(result.status, 0);
  assert.ok(!result.stdout.includes('\u001b'));
  assert.ok(!result.stdout.includes('\u202e'));
  assert.match(result.stdout, /untrusted\\u001b\[2J\\u202etitle/);
});
