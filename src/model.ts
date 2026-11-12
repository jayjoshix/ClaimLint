import { z } from 'zod';
import { isDecimal } from './decimal.js';
import { instant } from './time.js';

const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const text = z.string().min(1).max(4000);
export const DecimalSchema = z
  .string()
  .refine(
    isDecimal,
    'Expected canonical decimal string (max 128 characters; no exponent or trailing fractional zeros)',
  );
export const InstantSchema = z
  .string()
  .max(64)
  .transform((value, ctx) => {
    try {
      return instant(value);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected ISO-8601 instant with explicit offset',
      });
      return z.NEVER;
    }
  });
export const UnitSchema = z.enum([
  'USD',
  'USD_million',
  'USD_billion',
  'count',
  'percent',
]);
export const PeriodSchema = z.strictObject({
  id,
  start: InstantSchema,
  end: InstantSchema,
  calendar: text,
});
const action = z.enum(['review', 'yes', 'no']);
const metadata = z.record(z.string().max(128), z.string().max(4000));

export const ClaimSpecV1Schema = z.strictObject({
  schemaVersion: z.literal('1.0'),
  id,
  title: text,
  description: text.optional(),
  reference: z.strictObject({
    entityId: id,
    entityName: text,
    metricId: id,
    metricName: text,
    metricDefinition: text,
    definitionId: id,
    unit: UnitSchema,
    reportingPeriod: PeriodSchema,
  }),
  condition: z.strictObject({
    comparator: z.enum(['>', '>=', '<', '<=', '==', '!=']),
    strike: DecimalSchema,
  }),
  sources: z
    .array(
      z.strictObject({
        id,
        name: text,
        priority: z.number().int().min(1).max(10000),
        replaces: id.optional(),
        reference: text.optional(),
      }),
    )
    .min(1)
    .max(32),
  timing: z.strictObject({
    observationStart: InstantSchema,
    observationEnd: InstantSchema,
    publicationDeadline: InstantSchema,
    determinationAt: InstantSchema,
    settlementAt: InstantSchema,
  }),
  policies: z.strictObject({
    missingData: action.optional(),
    latePublication: z
      .enum(['acceptUntilDetermination', 'reject', 'review'])
      .optional(),
    sourceConflict: z.enum(['precedence', 'review']).optional(),
    corrections: z
      .enum(['freezeAtDetermination', 'latestUntilSettlement', 'review'])
      .optional(),
    sourceReplacement: z.enum(['fallback', 'review']).optional(),
    metricDiscontinuation: action.optional(),
    definitionDrift: action.optional(),
    calendarChange: action.optional(),
    corporateAction: action.optional(),
    provisional: z.enum(['finalOnly', 'accept', 'review']).optional(),
    units: z.enum(['exact', 'convertUSD']).optional(),
    rounding: z
      .strictObject({
        decimalPlaces: z.number().int().min(0).max(36),
        mode: z.enum(['halfEven', 'halfUp', 'truncate']),
      })
      .optional(),
    dispute: z
      .strictObject({
        processId: id,
        description: text,
        reference: text.optional(),
      })
      .optional(),
  }),
  payout: z.strictObject({
    currency: z.literal('USD'),
    yes: DecimalSchema,
    no: DecimalSchema,
  }),
  provenance: z
    .strictObject({
      kind: z.enum(['synthetic', 'normalized-public']),
      publisher: text,
      documentTitle: text,
      retrievedAt: InstantSchema.optional(),
      reference: text.optional(),
      normalizedFields: z.array(text),
      interpretation: text,
    })
    .optional(),
});

export type ClaimSpecV1 = z.infer<typeof ClaimSpecV1Schema>;
export type Unit = z.infer<typeof UnitSchema>;
export type ReportingPeriod = z.infer<typeof PeriodSchema>;

export const EvidenceObservationSchema = z.strictObject({
  id,
  sourceId: id,
  entityId: id,
  metricId: id,
  definitionId: id,
  value: DecimalSchema,
  unit: UnitSchema,
  reportingPeriod: PeriodSchema,
  publishedAt: InstantSchema,
  availableAt: InstantSchema,
  status: z.enum(['provisional', 'final']),
  revisionId: id.optional(),
  revises: id.optional(),
  provenance: metadata.optional(),
});
export const WorldEventSchema = z.strictObject({
  id,
  sourceId: id,
  entityId: id,
  type: z.enum([
    'sourceOutage',
    'sourceReplacement',
    'metricDiscontinuation',
    'definitionDrift',
    'calendarChange',
    'corporateAction',
  ]),
  occurredAt: InstantSchema,
  availableAt: InstantSchema,
  metricId: id.optional(),
  detail: text.optional(),
});
export const EvidenceSetSchema = z.strictObject({
  observations: z.array(EvidenceObservationSchema).max(10000),
  events: z.array(WorldEventSchema).max(1000).default([]),
});
export const EvaluationContextSchema = z.strictObject({
  asOf: InstantSchema,
  settlementAttemptAt: InstantSchema.optional(),
});
export type EvidenceObservation = z.infer<typeof EvidenceObservationSchema>;
export type WorldEvent = z.infer<typeof WorldEventSchema>;
export type EvidenceSet = z.infer<typeof EvidenceSetSchema>;
export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

export type ResolutionStatus =
  'YES' | 'NO' | 'PENDING' | 'REVIEW_REQUIRED' | 'UNDEFINED' | 'INVALID_SPEC';
export interface TraceStep {
  code: string;
  data: Record<string, string | number | boolean | string[]>;
}
export interface ResolutionResult {
  engineVersion: string;
  status: ResolutionStatus;
  /** Only YES/NO are terminal financial determinations. Review is a defined, non-terminal route. */
  terminal: boolean;
  payout?: { currency: 'USD'; amount: string };
  reviewProcessId?: string;
  reasonCodes: string[];
  evidenceUsed: string[];
  trace: TraceStep[];
}
export const ENGINE_VERSION = '0.1.1';

export type PropertyId =
  | 'DETERMINISM'
  | 'ORDER_INVARIANCE'
  | 'TERMINAL_UNIQUENESS'
  | 'TOTALITY'
  | 'FINALITY'
  | 'TEMPORAL_INTEGRITY'
  | 'SOURCE_PRECEDENCE'
  | 'EXACT_BOUNDARY'
  | 'PAYOUT_BOUNDS'
  | 'UNIT_SAFETY'
  | 'IDEMPOTENCE'
  | 'FALLBACK_TERMINATION';
export interface Finding {
  code: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  property: PropertyId | 'SPEC_VALIDITY';
  scenarioId?: string;
  summary: string;
  explanation: string;
  remediation?: string;
  counterexample?: unknown;
}
export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}
