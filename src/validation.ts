import {
  ClaimSpecV1Schema,
  type ClaimSpecV1,
  type ValidationIssue,
} from './model.js';
import { compareDecimal } from './decimal.js';
import { compareTime } from './time.js';
import { lexical } from './canonical.js';

export type ValidationResult =
  | { valid: true; spec: ClaimSpecV1; issues: [] }
  | { valid: false; issues: ValidationIssue[] };

export function validateClaim(input: unknown): ValidationResult {
  const parsed = ClaimSpecV1Schema.safeParse(input);
  if (!parsed.success)
    return {
      valid: false,
      issues: parsed.error.issues
        .map((issue) => ({
          code: 'CL001',
          path: issue.path.join('.'),
          message: issue.message,
        }))
        .sort((a, b) => lexical(a.path, b.path)),
    };
  const spec = parsed.data;
  const issues: ValidationIssue[] = [];
  const add = (code: string, path: string, message: string) =>
    issues.push({ code, path, message });
  const ids = new Set<string>();
  const priorities = new Set<number>();
  const replacements = new Set<string>();
  for (const source of spec.sources) {
    if (ids.has(source.id))
      add('CL002', 'sources', `Duplicate source ID: ${source.id}`);
    if (priorities.has(source.priority))
      add('CL002', 'sources', `Duplicate source priority: ${source.priority}`);
    ids.add(source.id);
    priorities.add(source.priority);
    if (source.replaces) {
      if (replacements.has(source.replaces))
        add('CL002', 'sources', `Multiple replacements for ${source.replaces}`);
      replacements.add(source.replaces);
    }
  }
  for (const source of spec.sources) {
    const visited = new Set<string>([source.id]);
    let next = source.replaces;
    while (next !== undefined) {
      if (!ids.has(next)) {
        add('CL002', 'sources', `Unknown replaced source: ${next}`);
        break;
      }
      if (visited.has(next)) {
        add('CL003', 'sources', 'Cyclic source replacement graph');
        break;
      }
      visited.add(next);
      next = spec.sources.find((candidate) => candidate.id === next)?.replaces;
    }
  }
  const t = spec.timing;
  const times = [
    t.observationStart,
    t.observationEnd,
    t.publicationDeadline,
    t.determinationAt,
    t.settlementAt,
  ];
  if (
    times.some((time, i) => i > 0 && compareTime(times[i - 1]!, time) > 0) ||
    compareTime(t.observationStart, t.observationEnd) === 0
  ) {
    add(
      'CL003',
      'timing',
      'Require observationStart < observationEnd <= publicationDeadline <= determinationAt <= settlementAt',
    );
  }
  const period = spec.reference.reportingPeriod;
  if (
    compareTime(period.start, t.observationStart) !== 0 ||
    compareTime(period.end, t.observationEnd) !== 0
  )
    add(
      'CL003',
      'reference.reportingPeriod',
      'Reporting period bounds must equal the observation interval',
    );
  if (
    compareDecimal(spec.payout.yes, '0') < 0 ||
    compareDecimal(spec.payout.yes, '1') > 0 ||
    compareDecimal(spec.payout.no, '0') < 0 ||
    compareDecimal(spec.payout.no, '1') > 0 ||
    compareDecimal(spec.payout.yes, spec.payout.no) === 0
  ) {
    add('CL001', 'payout', 'Require distinct USD binary payouts in [0, 1]');
  }
  if (Object.values(spec.policies).includes('review') && !spec.policies.dispute)
    add(
      'CL003',
      'policies.dispute',
      'Review policies require a named dispute process',
    );
  if (
    spec.policies.units === 'convertUSD' &&
    !['USD', 'USD_million', 'USD_billion'].includes(spec.reference.unit)
  )
    add(
      'CL003',
      'policies.units',
      'USD scale conversion requires a USD reference unit',
    );
  if (
    spec.provenance?.kind === 'normalized-public' &&
    (!spec.provenance.retrievedAt || !spec.provenance.reference)
  )
    add(
      'CL001',
      'provenance',
      'Public fixtures require retrieval instant and source reference',
    );
  return issues.length
    ? { valid: false, issues }
    : { valid: true, spec, issues: [] };
}
