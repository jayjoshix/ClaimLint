#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { checkClaim, PROPERTY_IDS, type CheckReport } from './check.js';
import {
  ENGINE_VERSION,
  EvidenceSetSchema,
  EvaluationContextSchema,
  type PropertyId,
  type ResolutionResult,
} from './model.js';
import { resolve } from './resolver.js';
import { compareTime } from './time.js';
import { validateClaim } from './validation.js';

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const HELP = `ClaimLint ${ENGINE_VERSION}

Usage:
  claimlint validate <claim-file> [--format text|json]
  claimlint resolve <claim-file> --evidence <file> --as-of <timestamp>
    [--settlement-at <timestamp>] [--format text|json]
  claimlint check <claim-file> [--runs <n>] [--seed <n>]
    [--property <ID> --path <shrink-path>] [--format text|json]

Defaults: 1,000 runs per generated property; seed 18472941; text output.
Timestamps require an explicit UTC offset. Inputs are limited to 8 MiB each.
Exit codes: 0 defined execution/no counterexample; 1 semantic findings;
            2 invalid input, configuration, or tool failure/inconclusive run.
Passing checks are not a formal proof of settlement correctness.
`;

class InputError extends Error {}

/** Render supplied labels as data, including terminal and bidirectional controls. */
function display(value: string): string {
  return value.replace(
    /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu,
    (character) =>
      `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`,
  );
}

async function readJson(path: string): Promise<unknown> {
  const handle = await open(path, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile())
      throw new InputError(`Expected a regular file: ${path}`);
    if (stat.size > MAX_INPUT_BYTES)
      throw new InputError(`Input exceeds the 8 MiB limit: ${path}`);
    const buffer = Buffer.alloc(MAX_INPUT_BYTES + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        size,
        buffer.length - size,
        null,
      );
      if (bytesRead === 0) break;
      size += bytesRead;
    }
    if (size > MAX_INPUT_BYTES)
      throw new InputError(`Input exceeds the 8 MiB limit: ${path}`);
    try {
      return JSON.parse(buffer.subarray(0, size).toString('utf8')) as unknown;
    } catch {
      throw new InputError(`Invalid JSON: ${path}`);
    }
  } finally {
    await handle.close();
  }
}

function integer(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (!/^-?\d+$/.test(value))
    throw new InputError(`${name} must be an integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed))
    throw new InputError(`${name} must be a safe integer`);
  return parsed;
}

function formatResolution(result: ResolutionResult): string {
  const lines = [
    `ClaimLint ${result.engineVersion}`,
    `Resolution: ${result.status}`,
    `Terminal financial determination: ${result.terminal ? 'yes' : 'no'}`,
    `Reasons: ${result.reasonCodes.join(', ')}`,
  ];
  if (result.payout)
    lines.push(`Payout: ${result.payout.amount} ${result.payout.currency}`);
  if (result.reviewProcessId)
    lines.push(`Review process: ${result.reviewProcessId}`);
  lines.push(
    `Evidence used: ${result.evidenceUsed.join(', ') || '(none)'}`,
    '',
    'Trace:',
    ...result.trace.map(
      (step) => `  ${step.code} ${JSON.stringify(step.data)}`,
    ),
  );
  return lines.join('\n');
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function summarizeCounterexample(value: unknown): string[] {
  const captured = object(value);
  if (!captured) return [];
  const inputs = Array.isArray(captured.inputs)
    ? captured.inputs.map(object).filter((input) => input !== undefined)
    : [captured];
  const outputs = Array.isArray(captured.results)
    ? captured.results.map(object).filter((result) => result !== undefined)
    : [object(captured.result), object(captured.comparisonResult)].filter(
        (result) => result !== undefined,
      );
  const lines: string[] = [];
  const times = inputs
    .map((input) => object(input.context)?.asOf)
    .filter((time): time is string => typeof time === 'string');
  if (times.length) lines.push(`Evaluation as-of: ${times.join(' -> ')}`);
  const evidence = object(inputs[0]?.evidence);
  if (evidence) {
    const observations = Array.isArray(evidence.observations)
      ? evidence.observations.length
      : 0;
    const events = Array.isArray(evidence.events) ? evidence.events.length : 0;
    lines.push(
      `Supplied evidence: ${observations} observations; ${events} world events`,
    );
  }
  const decisions = outputs.map((result) => {
    const status =
      typeof result.status === 'string' ? result.status : 'unknown';
    const reasons = Array.isArray(result.reasonCodes)
      ? result.reasonCodes.filter(
          (reason): reason is string => typeof reason === 'string',
        )
      : [];
    return `${status}${reasons.length ? ` (${reasons.join(', ')})` : ''}`;
  });
  if (decisions.length) lines.push(`Resolver: ${decisions.join(' -> ')}`);
  return lines;
}

function formatCheck(report: CheckReport): string {
  const lines = [
    `ClaimLint ${report.engineVersion}`,
    `Claim: ${display(report.title ?? report.claimId ?? '(invalid specification)')}`,
    `Specification: ${report.validation.valid ? 'VALID' : 'INVALID'}`,
  ];
  for (const issue of report.validation.issues)
    lines.push(
      `  ${issue.code} ${display(issue.path)}: ${display(issue.message)}`,
    );
  if (report.namedScenarios.length) {
    lines.push('', 'Named adversarial scenarios:');
    for (const scenario of report.namedScenarios) {
      const outcome = scenario.resolution
        ? scenario.comparisonResolution &&
          scenario.comparisonResolution.status !== scenario.resolution.status
          ? `${scenario.resolution.status} -> ${scenario.comparisonResolution.status}`
          : scenario.resolution.status
        : undefined;
      lines.push(
        `  ${scenario.status.padEnd(14)} ${scenario.id}${outcome ? ` => ${outcome}` : ''}`,
      );
    }
  }
  lines.push(
    '',
    `Generated property cases: ${report.generated.executedRuns} executed across ${report.generated.checks.length} properties`,
    `Runs requested per property: ${report.generated.requestedRuns}`,
    `Seed: ${report.generated.seed}`,
    `Specification SHA-256: ${report.specDigest}`,
  );
  for (const property of report.generated.checks) {
    lines.push(
      `  ${property.status} ${property.propertyId}: ${property.runs} runs`,
    );
    if (property.path !== undefined)
      lines.push(
        `    Replay: --seed ${property.seed} --property ${property.propertyId} --path ${property.path}`,
      );
    if (property.counterexample !== undefined)
      lines.push(
        ...summarizeCounterexample(property.counterexample).map(
          (line) => `    ${line}`,
        ),
      );
    if (property.error) lines.push(`    ${property.error}`);
  }
  if (report.findings.length) {
    const representative =
      report.findings.find(
        (finding) => finding.scenarioId === 'missing-publication',
      ) ??
      report.findings.find(
        (finding) => finding.scenarioId && finding.counterexample !== undefined,
      );
    if (representative) {
      lines.push(
        '',
        `Counterexample: ${representative.scenarioId}`,
        ...summarizeCounterexample(representative.counterexample).map(
          (line) => `  ${line}`,
        ),
      );
    }
    lines.push('', 'Findings:');
    for (const finding of report.findings) {
      lines.push(
        `  ${finding.severity} ${finding.code} ${finding.summary}${finding.scenarioId ? ` [${finding.scenarioId}]` : ''}`,
        `    ${finding.explanation}`,
      );
      if (finding.remediation) lines.push(`    Action: ${finding.remediation}`);
    }
    lines.push(
      'Use --format json for complete counterexample inputs and traces.',
    );
  }
  lines.push(
    '',
    `VERDICT: ${report.verdict.replaceAll('_', ' ')}`,
    report.disclaimer,
  );
  return lines.join('\n');
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let json =
    argv.includes('--format=json') ||
    argv.some((arg, i) => arg === '--format' && argv[i + 1] === 'json');
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        format: { type: 'string', default: 'text' },
        evidence: { type: 'string' },
        'as-of': { type: 'string' },
        'settlement-at': { type: 'string' },
        runs: { type: 'string' },
        seed: { type: 'string' },
        property: { type: 'string' },
        path: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean' },
      },
    });
    if (values.format !== 'text' && values.format !== 'json')
      throw new InputError('--format must be text or json');
    json = values.format === 'json';
    if (values.help || values.version) {
      const output = values.version ? ENGINE_VERSION : HELP;
      process.stdout.write(
        json ? `${JSON.stringify({ output })}\n` : `${output}\n`,
      );
      return;
    }
    const [command, file] = positionals;
    if (
      !command ||
      !['validate', 'resolve', 'check'].includes(command) ||
      !file ||
      positionals.length !== 2
    )
      throw new InputError(
        'Expected validate, resolve, or check and one claim file; use --help',
      );
    const allowed =
      command === 'resolve'
        ? new Set(['format', 'evidence', 'as-of', 'settlement-at'])
        : command === 'check'
          ? new Set(['format', 'runs', 'seed', 'property', 'path'])
          : new Set(['format']);
    for (const key of Object.keys(values))
      if (!allowed.has(key))
        throw new InputError(`--${key} is not supported by ${command}`);
    const input = await readJson(file);
    if (command === 'validate') {
      const result = validateClaim(input);
      const output = {
        engineVersion: ENGINE_VERSION,
        status: result.valid ? 'VALID_SPEC' : 'INVALID_SPEC',
        valid: result.valid,
        issues: result.issues,
      };
      process.stdout.write(
        json
          ? `${JSON.stringify(output)}\n`
          : `ClaimLint ${ENGINE_VERSION}\nSpecification: ${output.status}\n${result.issues.map((issue) => `  ${issue.code} ${display(issue.path)}: ${display(issue.message)}\n`).join('')}`,
      );
      process.exitCode = result.valid ? 0 : 2;
      return;
    }
    if (command === 'resolve') {
      if (!values.evidence || !values['as-of'])
        throw new InputError('resolve requires --evidence and --as-of');
      const evidence = EvidenceSetSchema.safeParse(
        await readJson(values.evidence),
      );
      if (!evidence.success)
        throw new InputError(
          `Invalid evidence: ${evidence.error.issues
            .slice(0, 8)
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')}`,
        );
      const context = EvaluationContextSchema.safeParse({
        asOf: values['as-of'],
        ...(values['settlement-at']
          ? { settlementAttemptAt: values['settlement-at'] }
          : {}),
      });
      if (!context.success)
        throw new InputError(
          'Invalid evaluation context: timestamps require valid ISO-8601 instants with explicit offsets',
        );
      if (
        context.data.settlementAttemptAt &&
        compareTime(context.data.settlementAttemptAt, context.data.asOf) > 0
      )
        throw new InputError('--settlement-at must not be later than --as-of');
      const result = resolve(input, evidence.data, context.data);
      process.stdout.write(
        json ? `${JSON.stringify(result)}\n` : `${formatResolution(result)}\n`,
      );
      process.exitCode =
        result.status === 'INVALID_SPEC'
          ? 2
          : result.status === 'UNDEFINED'
            ? 1
            : 0;
      return;
    }
    const property = values.property;
    if (
      property !== undefined &&
      !(PROPERTY_IDS as readonly string[]).includes(property)
    )
      throw new InputError(
        `Unknown property; expected one of ${PROPERTY_IDS.join(', ')}`,
      );
    if (values.path !== undefined && property === undefined)
      throw new InputError('--path requires --property');
    const runs = integer(values.runs, '--runs');
    const seed = integer(values.seed, '--seed');
    const report = checkClaim(input, {
      ...(runs !== undefined ? { runs } : {}),
      ...(seed !== undefined ? { seed } : {}),
      ...(property !== undefined ? { property: property as PropertyId } : {}),
      ...(values.path !== undefined ? { path: values.path } : {}),
    });
    process.stdout.write(
      json ? `${JSON.stringify(report)}\n` : `${formatCheck(report)}\n`,
    );
    process.exitCode =
      report.verdict === 'INVALID_SPEC' || report.verdict === 'INCONCLUSIVE'
        ? 2
        : report.verdict === 'COUNTEREXAMPLE_FOUND'
          ? 1
          : 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected tool failure';
    const output = {
      engineVersion: ENGINE_VERSION,
      status: 'INPUT_OR_TOOL_ERROR',
      error: message,
    };
    if (json) process.stdout.write(`${JSON.stringify(output)}\n`);
    else process.stderr.write(`ClaimLint: ${display(message)}\n`);
    process.exitCode = 2;
  }
}

await main();
