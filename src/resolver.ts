import {
  ENGINE_VERSION,
  EvidenceSetSchema,
  EvaluationContextSchema,
  type ClaimSpecV1,
  type EvidenceObservation,
  type ResolutionResult,
  type ResolutionStatus,
  type TraceStep,
} from './model.js';
import { validateClaim } from './validation.js';
import { canonicalJson, lexical } from './canonical.js';
import { compareDecimal, roundDecimal, shiftDecimal } from './decimal.js';
import { compareTime } from './time.js';
import { coalesceObservations, USD_POWERS as usdPowers } from './evidence.js';

export function compareCondition(
  value: string,
  comparator: ClaimSpecV1['condition']['comparator'],
  strike: string,
): boolean {
  const comparison = compareDecimal(value, strike);
  switch (comparator) {
    case '>':
      return comparison > 0;
    case '>=':
      return comparison >= 0;
    case '<':
      return comparison < 0;
    case '<=':
      return comparison <= 0;
    case '==':
      return comparison === 0;
    case '!=':
      return comparison !== 0;
  }
}

/** Pure, clock-free mapping. Validation and normalization are part of every invocation. */
export function resolve(
  specInput: unknown,
  evidenceInput: unknown,
  contextInput: unknown,
): ResolutionResult {
  const trace: TraceStep[] = [];
  let evidenceUsed: string[] = [];
  const supportingEvidence = new Set<string>();
  const step = (code: string, data: TraceStep['data'] = {}) =>
    trace.push({ code, data });
  const result = (
    status: ResolutionStatus,
    code: string,
    spec?: ClaimSpecV1,
  ): ResolutionResult => {
    step(code);
    const output: ResolutionResult = {
      engineVersion: ENGINE_VERSION,
      status,
      terminal: status === 'YES' || status === 'NO',
      reasonCodes: [code],
      evidenceUsed: [...new Set([...evidenceUsed, ...supportingEvidence])].sort(
        lexical,
      ),
      trace,
    };
    if ((status === 'YES' || status === 'NO') && spec)
      output.payout = {
        currency: 'USD',
        amount: status === 'YES' ? spec.payout.yes : spec.payout.no,
      };
    if (status === 'REVIEW_REQUIRED' && spec?.policies.dispute)
      output.reviewProcessId = spec.policies.dispute.processId;
    return output;
  };
  const validation = validateClaim(specInput);
  if (!validation.valid) {
    for (const issue of validation.issues) step('SPEC_ISSUE', { ...issue });
    return result('INVALID_SPEC', 'SPEC_INVALID');
  }
  const spec = validation.spec;
  const evidence = EvidenceSetSchema.safeParse(evidenceInput);
  if (!evidence.success) return result('UNDEFINED', 'INVALID_EVIDENCE');
  const context = EvaluationContextSchema.safeParse(contextInput);
  if (!context.success) return result('UNDEFINED', 'INVALID_CONTEXT');
  const decisionAt = context.data.settlementAttemptAt ?? context.data.asOf;
  if (compareTime(decisionAt, context.data.asOf) > 0)
    return result('UNDEFINED', 'INVALID_CONTEXT');
  if (compareTime(decisionAt, spec.timing.settlementAt) < 0)
    return result('PENDING', 'SETTLEMENT_NOT_ELIGIBLE');
  const policies = spec.policies;
  const cutoff =
    policies.corrections === 'freezeAtDetermination'
      ? spec.timing.determinationAt
      : policies.corrections === 'latestUntilSettlement' ||
          policies.corrections === 'review'
        ? spec.timing.settlementAt
        : decisionAt;
  step('EVIDENCE_CUTOFF', {
    cutoff,
    correctionPolicy: policies.corrections ?? 'unspecified',
  });

  const visibleObservations = evidence.data.observations.filter(
    (observation) =>
      compareTime(observation.publishedAt, cutoff) <= 0 &&
      compareTime(observation.availableAt, cutoff) <= 0,
  );
  const visibleEvents = evidence.data.events.filter(
    (event) =>
      compareTime(event.occurredAt, cutoff) <= 0 &&
      compareTime(event.availableAt, cutoff) <= 0,
  );
  const unique = new Map<string, string>();
  for (const item of [...visibleObservations, ...visibleEvents].sort((a, b) =>
    lexical(a.id, b.id),
  )) {
    const encoded = canonicalJson(item);
    if (
      (unique.has(item.id) && unique.get(item.id) !== encoded) ||
      ('publishedAt' in item &&
        compareTime(item.availableAt, item.publishedAt) < 0) ||
      ('occurredAt' in item &&
        compareTime(item.availableAt, item.occurredAt) < 0)
    ) {
      return result('UNDEFINED', 'EVIDENCE_INTEGRITY');
    }
    unique.set(item.id, encoded);
  }
  const coalesced = coalesceObservations(
    [...new Map(visibleObservations.map((o) => [o.id, o])).values()],
    spec,
  );
  const observations = coalesced.observations;
  for (const [evidenceId, canonicalEvidenceId] of coalesced.aliases)
    step('OBSERVATION_ALIAS', { evidenceId, canonicalEvidenceId });
  const events = [
    ...new Map(visibleEvents.map((e) => [e.id, e])).values(),
  ].sort((a, b) => lexical(a.id, b.id));
  const sources = [...spec.sources].sort((a, b) => a.priority - b.priority);
  const sourceIds = new Set(sources.map((s) => s.id));
  const applicableEvents = events.filter(
    (event) =>
      event.entityId === spec.reference.entityId &&
      sourceIds.has(event.sourceId) &&
      (event.metricId === undefined ||
        event.metricId === spec.reference.metricId) &&
      (event.type === 'sourceOutage' ||
        event.type === 'sourceReplacement' ||
        compareTime(event.occurredAt, spec.timing.observationEnd) <= 0),
  );
  const unavailable = new Set(
    applicableEvents
      .filter(
        (e) => e.type === 'sourceOutage' || e.type === 'sourceReplacement',
      )
      .map((e) => e.sourceId),
  );
  // Acyclicity was validated. Walk at most 32 configured sources; never recurse on evidence.
  const active = new Set<string>();
  for (const source of sources) {
    if (!source.replaces) {
      active.add(source.id);
      continue;
    }
    let ancestor = source.replaces;
    let activated = true;
    for (let depth = 0; depth < sources.length; depth++) {
      if (!unavailable.has(ancestor)) {
        activated = false;
        break;
      }
      const parent = sources.find((s) => s.id === ancestor);
      if (!parent?.replaces) break;
      ancestor = parent.replaces;
    }
    if (activated && policies.sourceReplacement === 'fallback')
      active.add(source.id);
  }

  type Route = {
    action: 'review' | 'yes' | 'no' | undefined;
    reason: string;
    id: string;
  };
  const routes: Route[] = [];
  const metricEvents = applicableEvents.filter(
    (event) =>
      event.type !== 'sourceOutage' &&
      event.type !== 'sourceReplacement' &&
      active.has(event.sourceId),
  );
  let candidates: EvidenceObservation[] = [];
  for (const observation of observations) {
    if (
      observation.entityId !== spec.reference.entityId ||
      observation.metricId !== spec.reference.metricId ||
      !active.has(observation.sourceId)
    )
      continue;
    if (
      applicableEvents.some(
        (event) =>
          (event.type === 'sourceOutage' ||
            event.type === 'sourceReplacement') &&
          event.sourceId === observation.sourceId &&
          compareTime(observation.availableAt, event.occurredAt) > 0,
      )
    ) {
      step('UNAVAILABLE_SOURCE_EVIDENCE_REJECTED', {
        evidenceId: observation.id,
      });
      continue;
    }
    if (
      canonicalJson(observation.reportingPeriod) !==
      canonicalJson(spec.reference.reportingPeriod)
    ) {
      step('PERIOD_REJECTED', { evidenceId: observation.id });
      continue;
    }
    candidates.push(observation);
  }
  let authorityId: string | undefined;
  const potentiallyUsable = candidates.filter((o) => {
    if (compareTime(o.publishedAt, spec.timing.observationEnd) < 0)
      return false;
    if (policies.provisional === 'finalOnly' && o.status === 'provisional')
      return false;
    if (
      compareTime(o.publishedAt, spec.timing.publicationDeadline) > 0 &&
      (policies.latePublication === 'reject' ||
        (policies.latePublication === 'acceptUntilDetermination' &&
          compareTime(o.publishedAt, spec.timing.determinationAt) > 0))
    )
      return false;
    if (
      o.unit !== spec.reference.unit &&
      (policies.units === 'exact' ||
        usdPowers[o.unit] === undefined ||
        usdPowers[spec.reference.unit] === undefined)
    )
      return false;
    return true;
  });
  if (policies.sourceConflict === 'precedence') {
    const authority = sources.find(
      (source) =>
        potentiallyUsable.some((o) => o.sourceId === source.id) ||
        metricEvents.some((e) => e.sourceId === source.id),
    );
    if (authority) {
      authorityId = authority.id;
      const ignored = candidates
        .filter((o) => o.sourceId !== authority.id)
        .map((o) => o.id);
      if (ignored.length)
        step('SOURCE_PRECEDENCE_APPLIED', {
          sourceId: authority.id,
          rejectedEvidenceIds: ignored.sort(lexical),
        });
      candidates = candidates.filter((o) => o.sourceId === authority.id);
    }
  }
  for (const event of applicableEvents) {
    if (event.type !== 'sourceOutage' && event.type !== 'sourceReplacement')
      continue;
    if (!active.has(event.sourceId)) continue;
    const eventPriority = sources.find(
      (s) => s.id === event.sourceId,
    )!.priority;
    if (
      authorityId !== undefined &&
      sources.find((s) => s.id === authorityId)!.priority < eventPriority
    )
      continue;
    supportingEvidence.add(event.id);
    const cached = potentiallyUsable.some(
      (o) =>
        o.sourceId === event.sourceId &&
        o.definitionId === spec.reference.definitionId &&
        compareTime(o.availableAt, event.occurredAt) <= 0,
    );
    if (cached) {
      step('CACHED_SOURCE_EVIDENCE_RETAINED', {
        sourceId: event.sourceId,
        eventId: event.id,
      });
      continue;
    }
    if (
      potentiallyUsable.some(
        (o) =>
          o.definitionId === spec.reference.definitionId &&
          !sources.find((source) => source.id === o.sourceId)!.replaces,
      )
    ) {
      step('INDEPENDENT_SOURCE_REMAINS_AVAILABLE', {
        sourceId: event.sourceId,
        eventId: event.id,
      });
      continue;
    }
    const hasReplacement = sources.some((s) => s.replaces === event.sourceId);
    if (hasReplacement || event.type === 'sourceReplacement') {
      if (policies.sourceReplacement !== 'fallback')
        routes.push({
          action: policies.sourceReplacement,
          reason: 'SOURCE_REPLACEMENT_POLICY_MISSING',
          id: event.id,
        });
      else
        step('SOURCE_REPLACEMENT_ACTIVATED', {
          sourceId: event.sourceId,
          eventId: event.id,
        });
    } else
      step('SOURCE_UNAVAILABLE', {
        sourceId: event.sourceId,
        eventId: event.id,
      });
  }
  for (const event of metricEvents) {
    if (authorityId !== undefined && event.sourceId !== authorityId) continue;
    const type = event.type as
      | 'metricDiscontinuation'
      | 'definitionDrift'
      | 'calendarChange'
      | 'corporateAction';
    routes.push({
      action: policies[type],
      reason: `${type.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}_POLICY_MISSING`,
      id: event.id,
    });
  }
  for (const observation of candidates.filter(
    (o) => o.definitionId !== spec.reference.definitionId,
  )) {
    routes.push({
      action: policies.definitionDrift,
      reason: 'DEFINITION_DRIFT_POLICY_MISSING',
      id: observation.id,
    });
  }
  candidates = candidates.filter(
    (o) => o.definitionId === spec.reference.definitionId,
  );
  if (routes.length) {
    evidenceUsed = routes.map((route) => route.id);
    for (const route of routes)
      step('CONTINGENCY_POLICY', {
        evidenceId: route.id,
        action: route.action ?? 'unspecified',
        trigger: route.reason,
      });
    const undefinedRoute = routes.find((route) => route.action === undefined);
    if (undefinedRoute) return result('UNDEFINED', undefinedRoute.reason);
    const terminalActions = new Set(
      routes.filter((r) => r.action !== 'review').map((r) => r.action),
    );
    if (terminalActions.size > 1)
      return result('UNDEFINED', 'CONTINGENCY_POLICY_CONFLICT');
    if (routes.some((route) => route.action === 'review'))
      return result('REVIEW_REQUIRED', 'CONTINGENCY_REVIEW', spec);
    return result(
      terminalActions.has('yes') ? 'YES' : 'NO',
      'CONTINGENCY_OUTCOME',
      spec,
    );
  }

  const allCandidates = new Map(candidates.map((o) => [o.id, o]));
  const accepted: EvidenceObservation[] = [];
  for (const observation of candidates) {
    if (compareTime(observation.publishedAt, spec.timing.observationEnd) < 0) {
      step('PREMATURE_PUBLICATION_REJECTED', { evidenceId: observation.id });
      continue;
    }
    if (
      compareTime(observation.publishedAt, spec.timing.publicationDeadline) > 0
    ) {
      if (policies.latePublication === undefined) {
        evidenceUsed = [observation.id];
        return result('UNDEFINED', 'LATE_PUBLICATION_POLICY_MISSING');
      }
      if (policies.latePublication === 'review') {
        evidenceUsed = [observation.id];
        return result('REVIEW_REQUIRED', 'LATE_PUBLICATION_REVIEW', spec);
      }
      if (
        policies.latePublication === 'reject' ||
        compareTime(observation.publishedAt, spec.timing.determinationAt) > 0
      ) {
        step('LATE_PUBLICATION_REJECTED', { evidenceId: observation.id });
        continue;
      }
      step('LATE_PUBLICATION_ACCEPTED', { evidenceId: observation.id });
    }
    accepted.push(observation);
  }
  candidates = accepted.filter((observation) => {
    if (observation.unit === spec.reference.unit) return true;
    const compatible =
      usdPowers[observation.unit] !== undefined &&
      usdPowers[spec.reference.unit] !== undefined;
    if (compatible && policies.units !== 'exact') return true;
    step('UNIT_REJECTED', {
      evidenceId: observation.id,
      unit: observation.unit,
    });
    return false;
  });

  // Revisions are explicit graph edges, never an inference from array order or timestamps.
  const correctionIds: string[] = [];
  for (const observation of candidates.filter((o) => o.revises !== undefined)) {
    correctionIds.push(observation.id);
    evidenceUsed = [observation.id];
    if (!policies.corrections)
      return result('UNDEFINED', 'CORRECTIONS_POLICY_MISSING');
    const visited = new Set<string>([observation.id]);
    let child = observation;
    while (child.revises) {
      const parent = allCandidates.get(child.revises);
      if (
        !parent ||
        visited.has(parent.id) ||
        parent.sourceId !== child.sourceId ||
        (parent.unit !== child.unit &&
          !(
            policies.units === 'convertUSD' &&
            usdPowers[parent.unit] !== undefined &&
            usdPowers[child.unit] !== undefined
          )) ||
        compareTime(parent.publishedAt, child.publishedAt) > 0 ||
        compareTime(parent.availableAt, child.availableAt) > 0
      )
        return result('UNDEFINED', 'EVIDENCE_INTEGRITY');
      visited.add(parent.id);
      supportingEvidence.add(parent.id);
      child = parent;
    }
    step('REVISION_CHAIN_VALIDATED', {
      evidenceId: observation.id,
      revises: observation.revises!,
    });
  }
  if (correctionIds.length && policies.corrections === 'review') {
    evidenceUsed = correctionIds;
    return result('REVIEW_REQUIRED', 'CORRECTION_REVIEW', spec);
  }
  if (policies.provisional === 'finalOnly') {
    for (const o of candidates.filter((o) => o.status === 'provisional'))
      step('PROVISIONAL_REJECTED', { evidenceId: o.id });
    candidates = candidates.filter((o) => o.status === 'final');
  }
  const superseded = new Set<string>();
  for (const observation of candidates) {
    let ancestor = observation.revises;
    while (ancestor) {
      superseded.add(ancestor);
      ancestor = allCandidates.get(ancestor)?.revises;
    }
  }
  candidates = candidates.filter((o) => !superseded.has(o.id));
  evidenceUsed = [];
  const normalized: { observation: EvidenceObservation; value: string }[] = [];
  for (const observation of candidates) {
    if (
      observation.status === 'provisional' &&
      policies.provisional !== 'accept'
    ) {
      evidenceUsed = [observation.id];
      return policies.provisional === 'review'
        ? result('REVIEW_REQUIRED', 'PROVISIONAL_REVIEW', spec)
        : result('UNDEFINED', 'PROVISIONAL_POLICY_MISSING');
    }
    let value = observation.value;
    if (observation.unit !== spec.reference.unit) {
      const from = usdPowers[observation.unit];
      const to = usdPowers[spec.reference.unit];
      if (
        policies.units === undefined &&
        from !== undefined &&
        to !== undefined
      ) {
        evidenceUsed = [observation.id];
        return result('UNDEFINED', 'UNIT_POLICY_MISSING');
      }
      if (
        policies.units !== 'convertUSD' ||
        from === undefined ||
        to === undefined
      ) {
        step('UNIT_REJECTED', {
          evidenceId: observation.id,
          unit: observation.unit,
        });
        continue;
      }
      value = shiftDecimal(value, from - to);
      step('UNIT_CONVERTED', {
        evidenceId: observation.id,
        from: observation.unit,
        to: spec.reference.unit,
        value,
      });
    }
    if (policies.rounding) {
      value = roundDecimal(
        value,
        policies.rounding.decimalPlaces,
        policies.rounding.mode,
      );
      step('VALUE_ROUNDED', {
        evidenceId: observation.id,
        value,
        decimalPlaces: policies.rounding.decimalPlaces,
        mode: policies.rounding.mode,
      });
    }
    normalized.push({ observation, value });
  }
  if (!normalized.length) {
    step('NO_ELIGIBLE_OBSERVATION');
    switch (policies.missingData) {
      case 'review':
        return result('REVIEW_REQUIRED', 'MISSING_DATA_REVIEW', spec);
      case 'yes':
        return result('YES', 'MISSING_DATA_OUTCOME', spec);
      case 'no':
        return result('NO', 'MISSING_DATA_OUTCOME', spec);
      default:
        return result('UNDEFINED', 'MISSING_DATA_POLICY_MISSING');
    }
  }
  const byPriority = normalized.sort(
    (a, b) =>
      sources.find((s) => s.id === a.observation.sourceId)!.priority -
        sources.find((s) => s.id === b.observation.sourceId)!.priority ||
      lexical(a.observation.id, b.observation.id),
  );
  const selected = byPriority[0]!;
  const differing = byPriority.filter(
    (entry) => compareDecimal(entry.value, selected.value) !== 0,
  );
  if (differing.length) {
    evidenceUsed = byPriority.map((entry) => entry.observation.id);
    if (policies.sourceConflict === 'review')
      return result('REVIEW_REQUIRED', 'SOURCE_CONFLICT_REVIEW', spec);
    if (policies.sourceConflict !== 'precedence')
      return result('UNDEFINED', 'SOURCE_CONFLICT_POLICY_MISSING');
    // A priority orders sources; it cannot order competing observations from the same source.
    for (const entry of byPriority) {
      if (
        byPriority.some(
          (other) =>
            other.observation.sourceId === entry.observation.sourceId &&
            compareDecimal(other.value, entry.value) !== 0,
        )
      )
        return result('UNDEFINED', 'SAME_SOURCE_CONFLICT');
    }
    step('SOURCE_PRECEDENCE_APPLIED', {
      sourceId: selected.observation.sourceId,
      rejectedEvidenceIds: differing
        .map((entry) => entry.observation.id)
        .sort(lexical),
    });
  }
  evidenceUsed = [selected.observation.id];
  step('SOURCE_SELECTED', {
    sourceId: selected.observation.sourceId,
    priority: sources.find((s) => s.id === selected.observation.sourceId)!
      .priority,
    evidenceId: selected.observation.id,
  });
  const truth = compareCondition(
    selected.value,
    spec.condition.comparator,
    spec.condition.strike,
  );
  step('EXACT_COMPARISON', {
    value: selected.value,
    unit: spec.reference.unit,
    comparator: spec.condition.comparator,
    strike: spec.condition.strike,
    truth,
  });
  return result(truth ? 'YES' : 'NO', 'CONDITION_EVALUATED', spec);
}
