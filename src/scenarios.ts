import type {
  ClaimSpecV1,
  EvidenceObservation,
  EvidenceSet,
  EvaluationContext,
  PropertyId,
  ResolutionResult,
  Unit,
  WorldEvent,
} from './model.js';
import { boundaryValue, isDecimal, shiftDecimal } from './decimal.js';
import {
  referenceCompare,
  referenceRound,
  referenceShift,
} from './reference.js';
import { canonicalJson } from './canonical.js';
import { addSeconds, compareTime } from './time.js';

export interface ScenarioState {
  evidence: EvidenceSet;
  context: EvaluationContext;
  /** A relation probe is resolved independently under the same contract. */
  comparison?: { evidence: EvidenceSet; context: EvaluationContext };
}

export interface AdversarialScenario {
  id: string;
  intent: string;
  property: PropertyId;
  /** Undefined means a structural or canonical-decimal-domain prerequisite is absent. */
  build(spec: ClaimSpecV1): ScenarioState | undefined;
  assess?(
    spec: ClaimSpecV1,
    state: ScenarioState,
    result: ResolutionResult,
    comparison?: ResolutionResult,
  ): boolean;
}

export function primarySources(spec: ClaimSpecV1): ClaimSpecV1['sources'] {
  return spec.sources
    .filter((source) => !source.replaces)
    .sort((a, b) => a.priority - b.priority);
}

export function observation(
  spec: ClaimSpecV1,
  changes: Partial<EvidenceObservation> = {},
): EvidenceObservation {
  return {
    id: 'observation-1',
    sourceId: primarySources(spec)[0]!.id,
    entityId: spec.reference.entityId,
    metricId: spec.reference.metricId,
    definitionId: spec.reference.definitionId,
    value: spec.condition.strike,
    unit: spec.reference.unit,
    reportingPeriod: { ...spec.reference.reportingPeriod },
    publishedAt: spec.timing.publicationDeadline,
    availableAt: spec.timing.publicationDeadline,
    status: 'final',
    ...changes,
  };
}

export function worldEvent(
  spec: ClaimSpecV1,
  type: WorldEvent['type'],
  changes: Partial<WorldEvent> = {},
): WorldEvent {
  return {
    id: `event-${type}`,
    sourceId: primarySources(spec)[0]!.id,
    entityId: spec.reference.entityId,
    metricId: spec.reference.metricId,
    occurredAt:
      type === 'sourceOutage' || type === 'sourceReplacement'
        ? spec.timing.publicationDeadline
        : spec.timing.observationEnd,
    availableAt: spec.timing.publicationDeadline,
    type,
    ...changes,
  };
}

export function state(
  spec: ClaimSpecV1,
  observations: EvidenceObservation[] = [],
  events: WorldEvent[] = [],
): ScenarioState {
  return {
    evidence: { observations, events },
    context: { asOf: spec.timing.settlementAt },
  };
}

export function decision(result: ResolutionResult): string {
  return canonicalJson({
    status: result.status,
    terminal: result.terminal,
    payout: result.payout,
    reviewProcessId: result.reviewProcessId,
  });
}

export function expectedBoundary(
  spec: ClaimSpecV1,
  value: string,
): 'YES' | 'NO' {
  const rounding = spec.policies.rounding;
  const normalized = rounding
    ? referenceRound(value, rounding.decimalPlaces, rounding.mode)
    : value;
  const relation = referenceCompare(normalized, spec.condition.strike);
  const truth = {
    '>': relation > 0,
    '>=': relation >= 0,
    '<': relation < 0,
    '<=': relation <= 0,
    '==': relation === 0,
    '!=': relation !== 0,
  }[spec.condition.comparator];
  return truth ? 'YES' : 'NO';
}

/** Generators stay inside the same canonical-decimal input domain as users. */
export function admissibleBoundaryValue(
  strike: string,
  offset: -1 | 0 | 1,
): string {
  const value = boundaryValue(strike, offset);
  return isDecimal(value) ? value : strike;
}

export function contrastingValue(
  spec: ClaimSpecV1,
  value = spec.condition.strike,
): string {
  const rounding = spec.policies.rounding;
  const baseline = rounding
    ? referenceRound(value, rounding.decimalPlaces, rounding.mode)
    : value;
  const above = admissibleBoundaryValue(baseline, 1);
  return above !== baseline ? above : admissibleBoundaryValue(baseline, -1);
}

export function fineBoundaryValue(spec: ClaimSpecV1): string | undefined {
  const places = (spec.policies.rounding?.decimalPlaces ?? 1) + 1;
  const shifted = shiftDecimal(spec.condition.strike, places);
  if (!isDecimal(shifted)) return undefined;
  const above = boundaryValue(shifted, 1);
  if (!isDecimal(above)) return undefined;
  const value = shiftDecimal(above, -places);
  return isDecimal(value) ? value : undefined;
}

function successor(value: string): string | undefined {
  try {
    return addSeconds(value, 1);
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

const boundary = (offset: -1 | 0 | 1): AdversarialScenario => ({
  id:
    offset === 0
      ? 'boundary-exact-strike'
      : offset < 0
        ? 'boundary-below-strike'
        : 'boundary-above-strike',
  intent:
    offset === 0
      ? 'Apply the contractual comparator at exact equality.'
      : `Apply the comparator one decimal quantum ${offset < 0 ? 'below' : 'above'} the strike.`,
  property: 'EXACT_BOUNDARY',
  build: (spec) => {
    const value = boundaryValue(spec.condition.strike, offset);
    return isDecimal(value)
      ? state(spec, [observation(spec, { value })])
      : undefined;
  },
  assess: (spec, input, result) =>
    result.status ===
    expectedBoundary(spec, input.evidence.observations[0]!.value),
});

const eventScenario = (
  type: WorldEvent['type'],
  intent: string,
): AdversarialScenario => ({
  id: type.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
  intent,
  property: 'TOTALITY',
  build: (spec) => state(spec, [observation(spec)], [worldEvent(spec, type)]),
});

export const SCENARIOS: readonly AdversarialScenario[] = [
  boundary(0),
  boundary(-1),
  boundary(1),
  {
    id: 'missing-publication',
    intent:
      'No eligible observation exists after publication and settlement deadlines.',
    property: 'TOTALITY',
    build: (spec) => state(spec),
  },
  {
    id: 'publication-pending',
    intent: 'A legitimately immature claim must remain pending.',
    property: 'TEMPORAL_INTEGRITY',
    build: (spec) => ({
      evidence: { observations: [], events: [] },
      context: { asOf: spec.timing.observationStart },
    }),
    assess: (_spec, _state, result) => result.status === 'PENDING',
  },
  {
    id: 'late-publication',
    intent:
      'The first correct publication arrives after the publication deadline.',
    property: 'TOTALITY',
    build: (spec) => {
      const late = successor(spec.timing.publicationDeadline);
      if (late === undefined) return undefined;
      const result = state(spec, [
        observation(spec, { publishedAt: late, availableAt: late }),
      ]);
      result.context = {
        asOf:
          compareTime(late, spec.timing.settlementAt) > 0
            ? late
            : spec.timing.settlementAt,
      };
      return result;
    },
  },
  {
    id: 'source-conflict',
    intent: 'Independent authoritative sources publish different values.',
    property: 'TOTALITY',
    build: (spec) => {
      const second = primarySources(spec)[1];
      return second
        ? state(spec, [
            observation(spec),
            observation(spec, {
              id: 'observation-2',
              sourceId: second.id,
              value: contrastingValue(spec),
            }),
          ])
        : undefined;
    },
  },
  {
    id: 'source-precedence',
    intent:
      'A lower-priority dissenter cannot override a valid higher-priority source under the precedence policy.',
    property: 'SOURCE_PRECEDENCE',
    build: (spec) => {
      const second = primarySources(spec)[1];
      if (!second || spec.policies.sourceConflict !== 'precedence')
        return undefined;
      return {
        ...state(spec, [
          observation(spec),
          observation(spec, {
            id: 'observation-2',
            sourceId: second.id,
            value: contrastingValue(spec),
          }),
        ]),
        comparison: state(spec, [observation(spec)]),
      };
    },
    assess: (_spec, _state, result, other) =>
      !!other && decision(result) === decision(other),
  },
  {
    id: 'restatement-before-determination',
    intent:
      'An explicit correction changes the first reported value before determination.',
    property: 'TOTALITY',
    build: (spec) => {
      const first = observation(spec, {
        publishedAt: spec.timing.observationEnd,
        availableAt: spec.timing.observationEnd,
      });
      return state(spec, [
        first,
        observation(spec, {
          id: 'observation-revision',
          revises: first.id,
          revisionId: 'revision-2',
          value: contrastingValue(spec),
        }),
      ]);
    },
  },
  {
    id: 'restatement-after-settlement',
    intent:
      'Later evidence cannot change an already terminal determination under a final correction policy.',
    property: 'FINALITY',
    build: (spec) => {
      const initial = state(spec, [observation(spec)]);
      const later = successor(spec.timing.settlementAt);
      if (later === undefined) return undefined;
      return {
        ...initial,
        comparison: {
          evidence: {
            observations: [
              ...initial.evidence.observations,
              observation(spec, {
                id: 'observation-late-revision',
                revises: 'observation-1',
                revisionId: 'revision-2',
                value: contrastingValue(spec),
                publishedAt: later,
                availableAt: later,
              }),
            ],
            events: [],
          },
          context: { asOf: later },
        },
      };
    },
    assess: (_spec, _state, result, later) =>
      !result.terminal || (!!later && decision(result) === decision(later)),
  },
  eventScenario(
    'metricDiscontinuation',
    'The designated metric is explicitly discontinued.',
  ),
  eventScenario(
    'definitionDrift',
    'The metric name survives but its definition changes.',
  ),
  {
    id: 'definition-mismatch',
    intent:
      'An observation using another metric definition must not silently settle the designated definition.',
    property: 'TOTALITY',
    build: (spec) =>
      state(spec, [
        observation(spec, {
          definitionId:
            spec.reference.definitionId === 'changed-definition'
              ? 'another-definition'
              : 'changed-definition',
        }),
      ]),
  },
  {
    id: 'reporting-period-mismatch',
    intent: 'Published data describes another reporting period.',
    property: 'TOTALITY',
    build: (spec) =>
      state(spec, [
        observation(spec, {
          reportingPeriod: {
            ...spec.reference.reportingPeriod,
            id:
              spec.reference.reportingPeriod.id === 'different-period'
                ? 'another-period'
                : 'different-period',
          },
        }),
      ]),
  },
  eventScenario(
    'calendarChange',
    'The issuer changes the relevant reporting calendar.',
  ),
  {
    id: 'unit-scale-mismatch',
    intent: 'USD scales require an explicit exact conversion policy.',
    property: 'TOTALITY',
    build: (spec) => {
      const powers: Partial<Record<Unit, number>> = {
        USD: 0,
        USD_million: 6,
        USD_billion: 9,
      };
      const power = powers[spec.reference.unit];
      if (power === undefined) return undefined;
      const unit: Unit = spec.reference.unit === 'USD' ? 'USD_million' : 'USD';
      const value = referenceShift(
        spec.condition.strike,
        power - powers[unit]!,
      );
      if (!isDecimal(value)) return undefined;
      return state(spec, [
        observation(spec, {
          unit,
          value,
        }),
      ]);
    },
  },
  {
    id: 'unit-incompatible',
    intent:
      'A semantically incompatible unit must never be selected for comparison.',
    property: 'UNIT_SAFETY',
    build: (spec) =>
      state(spec, [
        observation(spec, {
          unit: spec.reference.unit === 'percent' ? 'count' : 'percent',
        }),
      ]),
    assess: (_spec, _state, result) =>
      !result.evidenceUsed.includes('observation-1'),
  },
  {
    id: 'rounding-boundary',
    intent:
      'A small excess above the strike can disappear under contractual rounding; absent rounding preserves it.',
    property: 'EXACT_BOUNDARY',
    build: (spec) => {
      const value = fineBoundaryValue(spec);
      return value === undefined
        ? undefined
        : state(spec, [observation(spec, { value })]);
    },
    assess: (spec, input, result) =>
      result.status ===
      expectedBoundary(spec, input.evidence.observations[0]!.value),
  },
  {
    id: 'source-outage',
    intent:
      'The primary source is unavailable and no valid observation exists.',
    property: 'TOTALITY',
    build: (spec) => state(spec, [], [worldEvent(spec, 'sourceOutage')]),
  },
  {
    id: 'source-replacement',
    intent:
      'Only a declared replacement can enter authority after its predecessor becomes unavailable.',
    property: 'TOTALITY',
    build: (spec) => {
      const replacement = spec.sources.find(
        (source) => source.replaces === primarySources(spec)[0]!.id,
      );
      return replacement
        ? state(
            spec,
            [observation(spec, { sourceId: replacement.id })],
            [worldEvent(spec, 'sourceReplacement')],
          )
        : undefined;
    },
  },
  eventScenario(
    'corporateAction',
    'An issuer identity-changing corporate action occurs before observation ends.',
  ),
  {
    id: 'provisional-only',
    intent: 'Only provisional evidence exists at maturity.',
    property: 'TOTALITY',
    build: (spec) =>
      state(spec, [observation(spec, { status: 'provisional' })]),
  },
  {
    id: 'provisional-then-final',
    intent: 'A later final revision supersedes a provisional release.',
    property: 'TOTALITY',
    build: (spec) =>
      state(spec, [
        observation(spec, {
          status: 'provisional',
          publishedAt: spec.timing.observationEnd,
          availableAt: spec.timing.observationEnd,
        }),
        observation(spec, {
          id: 'observation-final',
          revises: 'observation-1',
          status: 'final',
          value: contrastingValue(spec),
        }),
      ]),
  },
  {
    id: 'out-of-order-arrival',
    intent:
      'Evidence-array order cannot determine authority or revision order.',
    property: 'ORDER_INVARIANCE',
    build: (spec) => {
      const a = observation(spec);
      const b = observation(spec, {
        id: 'observation-revision',
        revises: a.id,
        value: contrastingValue(spec),
      });
      const input = state(spec, [a, b]);
      return { ...input, comparison: state(spec, [b, a]) };
    },
    assess: (_spec, _state, result, other) =>
      canonicalJson(result) === canonicalJson(other),
  },
  {
    id: 'duplicate-evidence',
    intent: 'Identical repeated observations must not introduce a conflict.',
    property: 'IDEMPOTENCE',
    build: (spec) => {
      const a = observation(spec);
      return {
        ...state(spec, [a]),
        comparison: state(spec, [a, structuredClone(a)]),
      };
    },
    assess: (_spec, _state, result, other) =>
      canonicalJson(result) === canonicalJson(other),
  },
  {
    id: 'future-evidence',
    intent:
      'A later publication and retrieval cannot affect an earlier decision.',
    property: 'TEMPORAL_INTEGRITY',
    build: (spec) => {
      const initial = state(spec, [observation(spec)]);
      const later = successor(spec.timing.settlementAt);
      if (later === undefined) return undefined;
      return {
        ...initial,
        comparison: {
          evidence: {
            observations: [
              ...initial.evidence.observations,
              observation(spec, {
                id: 'observation-future',
                value: contrastingValue(spec),
                publishedAt: later,
                availableAt: later,
              }),
            ],
            events: [],
          },
          context: initial.context,
        },
      };
    },
    assess: (_spec, _state, result, other) =>
      !!other && decision(result) === decision(other),
  },
  {
    id: 'late-retrieval',
    intent:
      'A historical publication retrieved only later cannot enter an earlier information set.',
    property: 'TEMPORAL_INTEGRITY',
    build: (spec) => {
      const initial = state(spec);
      const later = successor(spec.timing.settlementAt);
      if (later === undefined) return undefined;
      return {
        ...initial,
        comparison: {
          evidence: {
            observations: [
              observation(spec, {
                availableAt: later,
              }),
            ],
            events: [],
          },
          context: initial.context,
        },
      };
    },
    assess: (_spec, _state, result, other) =>
      !!other && decision(result) === decision(other),
  },
];
