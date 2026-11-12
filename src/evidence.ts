import { canonicalJson, lexical } from './canonical.js';
import { shiftDecimal } from './decimal.js';
import type { ClaimSpecV1, EvidenceObservation, Unit } from './model.js';

export const USD_POWERS: Readonly<Partial<Record<Unit, number>>> =
  Object.freeze({
    USD: 0,
    USD_million: 6,
    USD_billion: 9,
  });

/**
 * Equivalent observations may have different ingestion IDs. Resolve their
 * parent aliases before comparing payloads so a duplicated old publication
 * cannot survive as an independent head after its correction.
 * Cyclic components remain intact for the resolver's integrity rejection.
 */
export function coalesceObservations(
  input: EvidenceObservation[],
  spec: ClaimSpecV1,
): {
  observations: EvidenceObservation[];
  aliases: [string, string][];
} {
  const ordered = [...input].sort((a, b) => lexical(a.id, b.id));
  const byId = new Map(
    ordered.map((observation) => [observation.id, observation]),
  );
  const children = new Map<string, EvidenceObservation[]>();
  for (const observation of ordered) {
    if (!observation.revises) continue;
    const siblings = children.get(observation.revises) ?? [];
    siblings.push(observation);
    children.set(observation.revises, siblings);
  }
  const ready = ordered.filter((o) => !o.revises || !byId.has(o.revises));
  const representatives = new Map<string, string>();
  const aliases = new Map<string, string>();
  const observations: EvidenceObservation[] = [];
  for (let index = 0; index < ready.length; index++) {
    const observation = ready[index]!;
    const normalized = observation.revises
      ? {
          ...observation,
          revises: aliases.get(observation.revises) ?? observation.revises,
        }
      : observation;
    const from = USD_POWERS[normalized.unit];
    const to = USD_POWERS[spec.reference.unit];
    const equivalentUnit =
      spec.policies.units === 'convertUSD' &&
      from !== undefined &&
      to !== undefined;
    const key = canonicalJson({
      ...normalized,
      id: undefined,
      ...(equivalentUnit
        ? {
            value: shiftDecimal(normalized.value, from - to),
            unit: spec.reference.unit,
          }
        : {}),
    });
    const representative = representatives.get(key);
    aliases.set(observation.id, representative ?? observation.id);
    if (representative === undefined) {
      representatives.set(key, observation.id);
      observations.push(normalized);
    }
    ready.push(...(children.get(observation.id) ?? []));
  }
  observations.push(...ordered.filter((o) => !aliases.has(o.id)));
  return {
    observations: observations.sort((a, b) => lexical(a.id, b.id)),
    aliases: [...aliases]
      .filter(([id, representative]) => id !== representative)
      .sort(([a], [b]) => lexical(a, b)),
  };
}
