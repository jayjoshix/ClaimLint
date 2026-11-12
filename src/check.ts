import fc from 'fast-check';
import { canonicalJson, digest } from './canonical.js';
import { compareDecimal } from './decimal.js';
import {
  ENGINE_VERSION,
  type ClaimSpecV1,
  type EvidenceObservation,
  type Finding,
  type PropertyId,
  type ResolutionResult,
  type ValidationIssue,
  type WorldEvent,
} from './model.js';
import { resolve } from './resolver.js';
import {
  SCENARIOS,
  admissibleBoundaryValue,
  decision,
  expectedBoundary,
  observation,
  primarySources,
  state,
  worldEvent,
  type ScenarioState,
} from './scenarios.js';
import { addSeconds, compareTime } from './time.js';
import { validateClaim } from './validation.js';

export const PROPERTY_IDS: readonly PropertyId[] = [
  'DETERMINISM',
  'ORDER_INVARIANCE',
  'TERMINAL_UNIQUENESS',
  'TOTALITY',
  'FINALITY',
  'TEMPORAL_INTEGRITY',
  'SOURCE_PRECEDENCE',
  'EXACT_BOUNDARY',
  'PAYOUT_BOUNDS',
  'UNIT_SAFETY',
  'IDEMPOTENCE',
  'FALLBACK_TERMINATION',
];
export const DEFAULT_SEED = 18472941;
export const DEFAULT_RUNS = 1000;

export interface CheckOptions {
  runs?: number;
  seed?: number;
  property?: PropertyId;
  path?: string;
}
export interface ScenarioResult {
  id: string;
  intent: string;
  status: 'PASS' | 'FAIL' | 'DEFINED_REVIEW' | 'SKIPPED';
  resolution?: ResolutionResult;
  comparisonResolution?: ResolutionResult;
  propertyFailures: PropertyId[];
}
export interface PropertyCheckResult {
  propertyId: PropertyId;
  runs: number;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'SKIPPED';
  seed: number;
  path?: string;
  counterexample?: unknown;
  error?: string;
}
export interface CheckReport {
  engineVersion: string;
  specDigest: string;
  claimId?: string;
  title?: string;
  verdict:
    | 'COUNTEREXAMPLE_FOUND'
    | 'NO_COUNTEREXAMPLE_FOUND'
    | 'INCONCLUSIVE'
    | 'INVALID_SPEC';
  validation: { valid: boolean; issues: ValidationIssue[] };
  namedScenarios: ScenarioResult[];
  generated: {
    requestedRuns: number;
    executedRuns: number;
    seed: number;
    checks: PropertyCheckResult[];
  };
  findings: Finding[];
  disclaimer: string;
}

interface WorldChoice {
  offset: -1 | 0 | 1;
  primary: boolean;
  secondary: boolean;
  disagreement: boolean;
  provisional: boolean;
  revision: boolean;
  late: boolean;
  wrongPeriod: boolean;
  event: WorldEvent['type'] | 'none';
  reverse: boolean;
  duplicate: boolean;
}

/** Valid identity/revision graphs with varied authority, lifecycle, and information availability. */
const worlds: fc.Arbitrary<WorldChoice> = fc.record({
  offset: fc.constantFrom(-1 as const, 0 as const, 1 as const),
  primary: fc.boolean(),
  secondary: fc.boolean(),
  disagreement: fc.boolean(),
  provisional: fc.boolean(),
  revision: fc.boolean(),
  late: fc.boolean(),
  wrongPeriod: fc.boolean(),
  event: fc.constantFrom(
    'none' as const,
    'sourceOutage' as const,
    'sourceReplacement' as const,
    'metricDiscontinuation' as const,
    'definitionDrift' as const,
    'calendarChange' as const,
    'corporateAction' as const,
  ),
  reverse: fc.boolean(),
  duplicate: fc.boolean(),
});

function materialize(spec: ClaimSpecV1, choice: WorldChoice): ScenarioState {
  const observations: EvidenceObservation[] = [];
  const publishedAt = choice.late
    ? addSeconds(spec.timing.publicationDeadline, 1)
    : spec.timing.observationEnd;
  const initial = observation(spec, {
    value: admissibleBoundaryValue(spec.condition.strike, choice.offset),
    publishedAt,
    availableAt: publishedAt,
    status: choice.provisional ? 'provisional' : 'final',
    reportingPeriod: {
      ...spec.reference.reportingPeriod,
      ...(choice.wrongPeriod ? { id: 'wrong-period' } : {}),
    },
  });
  if (choice.primary) {
    observations.push(initial);
    if (choice.revision)
      observations.push({
        ...initial,
        id: 'generated-revision',
        revises: initial.id,
        value: admissibleBoundaryValue(
          spec.condition.strike,
          choice.offset === 1 ? -1 : 1,
        ),
        status: 'final',
      });
  }
  const secondary = primarySources(spec)[1];
  if (choice.secondary && secondary)
    observations.push({
      ...initial,
      id: 'generated-secondary',
      sourceId: secondary.id,
      value: choice.disagreement
        ? admissibleBoundaryValue(
            spec.condition.strike,
            choice.offset === 1 ? -1 : 1,
          )
        : initial.value,
    });
  const events =
    choice.event === 'none' ? [] : [worldEvent(spec, choice.event)];
  if (choice.event === 'sourceReplacement') {
    const replacement = spec.sources.find(
      (source) => source.replaces === primarySources(spec)[0]!.id,
    );
    if (replacement)
      observations.push({
        ...initial,
        id: 'generated-replacement',
        sourceId: replacement.id,
      });
  }
  if (choice.duplicate && observations[0])
    observations.push(structuredClone(observations[0]));
  if (choice.reverse) observations.reverse();
  const input = state(spec, observations, events);
  if (compareTime(publishedAt, spec.timing.settlementAt) > 0)
    input.context = { asOf: publishedAt };
  return input;
}

function run(spec: ClaimSpecV1, input: ScenarioState): ResolutionResult {
  return resolve(spec, input.evidence, input.context);
}

interface PropertyProbe {
  inputs: ScenarioState[];
  results: ResolutionResult[];
  passed: boolean;
  variantSpec?: ClaimSpecV1;
}

function probe(
  spec: ClaimSpecV1,
  property: PropertyId,
  choice: WorldChoice,
): PropertyProbe {
  const input = materialize(spec, choice);
  const first = run(spec, input);
  const base = { inputs: [input], results: [first] };
  const relation = (
    other: ScenarioState,
    predicate: (a: ResolutionResult, b: ResolutionResult) => boolean,
  ): PropertyProbe => {
    const second = run(spec, other);
    return {
      inputs: [input, other],
      results: [first, second],
      passed: predicate(first, second),
    };
  };
  switch (property) {
    case 'DETERMINISM':
    case 'IDEMPOTENCE':
      return relation(
        structuredClone(input),
        (a, b) => canonicalJson(a) === canonicalJson(b),
      );
    case 'ORDER_INVARIANCE':
      return relation(
        {
          ...input,
          evidence: {
            observations: [...input.evidence.observations].reverse(),
            events: [...input.evidence.events].reverse(),
          },
        },
        (a, b) => canonicalJson(a) === canonicalJson(b),
      );
    case 'TERMINAL_UNIQUENESS':
      return {
        ...base,
        passed:
          first.terminal ===
            (first.status === 'YES' || first.status === 'NO') &&
          (first.terminal
            ? first.payout !== undefined
            : first.payout === undefined),
      };
    case 'TOTALITY':
      return {
        ...base,
        passed:
          first.status !== 'UNDEFINED' &&
          first.status !== 'INVALID_SPEC' &&
          first.status !== 'PENDING',
      };
    case 'FINALITY': {
      const initial = state(spec, [
        observation(spec, {
          value: admissibleBoundaryValue(spec.condition.strike, choice.offset),
        }),
      ]);
      const later = addSeconds(spec.timing.settlementAt, 1);
      const supplement = observation(spec, {
        id: 'generated-after-settlement',
        revises: 'observation-1',
        publishedAt: later,
        availableAt: later,
        value: admissibleBoundaryValue(
          spec.condition.strike,
          choice.offset === 1 ? -1 : 1,
        ),
      });
      const subsequent: ScenarioState = {
        evidence: {
          observations: [...initial.evidence.observations, supplement],
          events: [],
        },
        context: { asOf: later },
      };
      const a = run(spec, initial);
      const b = run(spec, subsequent);
      return {
        inputs: [initial, subsequent],
        results: [a, b],
        passed: a.terminal && decision(a) === decision(b),
      };
    }
    case 'TEMPORAL_INTEGRITY': {
      const later = addSeconds(input.context.asOf, 1);
      return relation(
        {
          ...input,
          evidence: {
            observations: [
              ...input.evidence.observations,
              observation(spec, {
                id: 'generated-future',
                publishedAt: later,
                availableAt: later,
                value: admissibleBoundaryValue(
                  spec.condition.strike,
                  choice.offset === 1 ? -1 : 1,
                ),
              }),
            ],
            events: [
              ...input.evidence.events,
              worldEvent(spec, 'corporateAction', {
                id: 'generated-future-event',
                occurredAt: later,
                availableAt: later,
              }),
            ],
          },
        },
        (a, b) => decision(a) === decision(b),
      );
    }
    case 'SOURCE_PRECEDENCE': {
      const primary = observation(spec, {
        value: admissibleBoundaryValue(spec.condition.strike, choice.offset),
      });
      const secondary = primarySources(spec)[1]!;
      const left = state(spec, [primary]);
      const right = state(spec, [
        primary,
        {
          ...primary,
          id: 'generated-dissenter',
          sourceId: secondary.id,
          value: admissibleBoundaryValue(
            spec.condition.strike,
            choice.offset === 1 ? -1 : 1,
          ),
        },
      ]);
      const a = run(spec, left);
      const b = run(spec, right);
      return {
        inputs: [left, right],
        results: [a, b],
        passed: decision(a) === decision(b),
      };
    }
    case 'EXACT_BOUNDARY': {
      const value = admissibleBoundaryValue(
        spec.condition.strike,
        choice.offset,
      );
      const clean = state(spec, [observation(spec, { value })]);
      const result = run(spec, clean);
      return {
        inputs: [clean],
        results: [result],
        passed: result.status === expectedBoundary(spec, value),
      };
    }
    case 'PAYOUT_BOUNDS':
      return {
        ...base,
        passed:
          first.payout === undefined ||
          (first.terminal &&
            first.payout.currency === 'USD' &&
            compareDecimal(first.payout.amount, '0') >= 0 &&
            compareDecimal(first.payout.amount, '1') <= 0 &&
            first.payout.amount ===
              spec.payout[first.status === 'YES' ? 'yes' : 'no']),
      };
    case 'UNIT_SAFETY': {
      const bad = observation(spec, {
        unit: spec.reference.unit === 'percent' ? 'count' : 'percent',
      });
      const clean = state(spec, [bad]);
      const result = run(spec, clean);
      return {
        inputs: [clean],
        results: [result],
        passed: !result.evidenceUsed.includes(bad.id),
      };
    }
    case 'FALLBACK_TERMINATION': {
      // A cyclic variant must be rejected before evidence traversal, including a self-cycle.
      const variantSpec = structuredClone(spec);
      const firstSource = variantSpec.sources[0]!;
      firstSource.replaces = firstSource.id;
      const result = run(variantSpec, input);
      return {
        inputs: [input],
        results: [result],
        variantSpec,
        passed: result.status === 'INVALID_SPEC',
      };
    }
  }
}

function findingCode(property: PropertyId, result?: ResolutionResult): string {
  if (property === 'FINALITY') return 'CL011';
  if (property !== 'TOTALITY') return 'CL012';
  const reasons = result?.reasonCodes.join(' ') ?? '';
  if (/SOURCE|CONFLICT/.test(reasons)) return 'CL005';
  if (/CORRECTION|REVISION|RESTATEMENT/.test(reasons)) return 'CL006';
  if (/LATE/.test(reasons)) return 'CL007';
  if (/DISCONTINU|DEFINITION|CALENDAR|CORPORATE/.test(reasons)) return 'CL008';
  if (/UNIT/.test(reasons)) return 'CL009';
  if (/PROVISIONAL/.test(reasons)) return 'CL010';
  return 'CL004';
}

const remediation: Record<string, string> = {
  CL004:
    'Define a missing-data resolution or a named review route after the contractual deadline.',
  CL005:
    'Define source-conflict and replacement authority explicitly; preserve deterministic precedence.',
  CL006:
    'Define which correction chain and information cutoff govern the determination.',
  CL007:
    'Define acceptance, rejection, or review of publication after the publication deadline.',
  CL008:
    'Define an explicit policy for the structural event, including a named review route if appropriate.',
  CL009:
    'Specify permitted unit conversions; reject incompatible dimensions before comparison.',
  CL010:
    'Define whether provisional evidence is admissible or must await final publication.',
  CL011:
    'Define a fixed final information cutoff and correction policy; do not reopen terminal determinations implicitly.',
  CL012:
    'Inspect the captured inputs and trace; repair the violated engine or contractual invariant.',
};

function makeFinding(
  property: PropertyId,
  summary: string,
  counterexample: unknown,
  result?: ResolutionResult,
  scenarioId?: string,
): Finding {
  const code = findingCode(property, result);
  return {
    code,
    severity: 'ERROR',
    property,
    ...(scenarioId ? { scenarioId } : {}),
    summary,
    explanation:
      result?.status === 'UNDEFINED'
        ? `A mature generated information state resolves UNDEFINED (${result.reasonCodes.join(', ')}).`
        : `The ${property} relation failed under the tested model.`,
    remediation: remediation[code]!,
    counterexample,
  };
}

export function checkClaim(
  input: unknown,
  options: CheckOptions = {},
): CheckReport {
  const runs = options.runs ?? DEFAULT_RUNS;
  const seed = options.seed ?? DEFAULT_SEED;
  if (!Number.isSafeInteger(runs) || runs < 1 || runs > 100000)
    throw new RangeError('runs must be an integer in [1, 100000]');
  if (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647)
    throw new RangeError('seed must be a signed 32-bit integer');
  if (
    options.property !== undefined &&
    !PROPERTY_IDS.includes(options.property)
  )
    throw new RangeError('Unknown property');
  if (
    options.path !== undefined &&
    (!options.property || !/^\d+(?::\d+)*$/.test(options.path))
  )
    throw new RangeError('A valid shrink path requires one selected property');
  const validation = validateClaim(input);
  const report: CheckReport = {
    engineVersion: ENGINE_VERSION,
    specDigest: digest(input),
    verdict: 'INVALID_SPEC',
    validation: { valid: validation.valid, issues: validation.issues },
    namedScenarios: [],
    generated: { requestedRuns: runs, executedRuns: 0, seed, checks: [] },
    findings: [],
    disclaimer:
      'No counterexample found is not a formal proof of settlement correctness. Results cover only the listed scenarios and generated property cases; REVIEW_REQUIRED routes still require an external process.',
  };
  if (!validation.valid) {
    report.findings = validation.issues.map((issue) => ({
      code: issue.code,
      severity: 'ERROR',
      property: 'SPEC_VALIDITY',
      summary: issue.message,
      explanation: `Invalid specification at ${issue.path || '<root>'}.`,
    }));
    return report;
  }
  const spec = validation.spec;
  report.specDigest = digest({
    ...spec,
    sources: [...spec.sources].sort((a, b) => a.priority - b.priority),
  });
  report.claimId = spec.id;
  report.title = spec.title;
  for (const scenario of SCENARIOS) {
    const scenarioState = scenario.build(spec);
    if (!scenarioState) {
      report.namedScenarios.push({
        id: scenario.id,
        intent: scenario.intent,
        status: 'SKIPPED',
        propertyFailures: [],
      });
      continue;
    }
    const result = run(spec, scenarioState);
    const comparison = scenarioState.comparison
      ? resolve(
          spec,
          scenarioState.comparison.evidence,
          scenarioState.comparison.context,
        )
      : undefined;
    const passed = scenario.assess
      ? scenario.assess(spec, scenarioState, result, comparison)
      : result.status !== 'UNDEFINED' &&
        result.status !== 'INVALID_SPEC' &&
        result.status !== 'PENDING';
    const propertyFailures = passed ? [] : [scenario.property];
    report.namedScenarios.push({
      id: scenario.id,
      intent: scenario.intent,
      status: !passed
        ? 'FAIL'
        : result.status === 'REVIEW_REQUIRED'
          ? 'DEFINED_REVIEW'
          : 'PASS',
      resolution: result,
      ...(comparison ? { comparisonResolution: comparison } : {}),
      propertyFailures,
    });
    if (!passed)
      report.findings.push(
        makeFinding(
          scenario.property,
          `${scenario.id}: ${result.status}${comparison ? ` -> ${comparison.status}` : ''}`,
          {
            engineVersion: ENGINE_VERSION,
            specDigest: report.specDigest,
            ...scenarioState,
            result,
            ...(comparison ? { comparisonResult: comparison } : {}),
          },
          comparison?.status === 'UNDEFINED' ? comparison : result,
          scenario.id,
        ),
      );
  }
  const properties = options.property ? [options.property] : PROPERTY_IDS;
  for (const propertyId of properties) {
    if (
      propertyId === 'SOURCE_PRECEDENCE' &&
      (primarySources(spec).length < 2 ||
        spec.policies.sourceConflict !== 'precedence')
    ) {
      report.generated.checks.push({
        propertyId,
        runs: 0,
        seed,
        status: 'SKIPPED',
      });
      continue;
    }
    try {
      const details = fc.check(
        fc.property(worlds, (choice) => probe(spec, propertyId, choice).passed),
        {
          numRuns: runs,
          seed,
          ...(options.path !== undefined ? { path: options.path } : {}),
          endOnFailure: false,
        },
      );
      const checked: PropertyCheckResult = {
        propertyId,
        runs: details.numRuns,
        seed: details.seed,
        status: details.failed ? 'FAIL' : 'PASS',
      };
      report.generated.executedRuns += details.numRuns;
      if (details.failed) {
        if (details.counterexamplePath === null)
          throw new Error('fast-check failed without a shrink path');
        checked.path = details.counterexamplePath;
        const choice = details.counterexample?.[0];
        if (!choice)
          throw new Error(
            'fast-check failed without a reproducible counterexample',
          );
        const captured = probe(spec, propertyId, choice);
        const counterexample = {
          propertyId,
          seed: details.seed,
          path: details.counterexamplePath,
          shrinks: details.numShrinks,
          engineVersion: ENGINE_VERSION,
          specDigest: report.specDigest,
          choice,
          ...captured,
        };
        checked.counterexample = counterexample;
        report.findings.push(
          makeFinding(
            propertyId,
            `Generated ${propertyId} counterexample`,
            counterexample,
            captured.results.find((result) => result.status === 'UNDEFINED') ??
              captured.results[0],
          ),
        );
      }
      report.generated.checks.push(checked);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.generated.checks.push({
        propertyId,
        runs: 0,
        seed,
        status: 'INCONCLUSIVE',
        error: message,
      });
      report.findings.push({
        code: 'CL013',
        severity: 'WARNING',
        property: propertyId,
        summary: 'Property execution did not complete',
        explanation: message,
      });
    }
  }
  const hasErrors = report.findings.some(
    (finding) => finding.severity === 'ERROR',
  );
  const incomplete =
    report.generated.checks.some((check) => check.status === 'INCONCLUSIVE') ||
    report.generated.executedRuns === 0;
  report.verdict = hasErrors
    ? 'COUNTEREXAMPLE_FOUND'
    : incomplete
      ? 'INCONCLUSIVE'
      : 'NO_COUNTEREXAMPLE_FOUND';
  return report;
}
