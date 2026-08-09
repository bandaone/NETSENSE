import { z } from 'zod';
import { topologySnapshotSchema } from '../../topology/domain/schemas';

export const INCIDENT_SCHEMA_VERSION = '1.0.0' as const;

export const incidentSeveritySchema = z.enum(['information', 'warning', 'major', 'critical']);
export const incidentStateSchema = z.enum(['open', 'acknowledged', 'resolved']);

export const incidentSummarySchema = z.object({
  schemaVersion: z.literal(INCIDENT_SCHEMA_VERSION),
  id: z.string().min(1),
  tenantId: z.string().min(1),
  siteId: z.string().min(1),
  title: z.string().min(1),
  severity: incidentSeveritySchema,
  state: incidentStateSchema,
  detectedAt: z.string().datetime(),
  acknowledgedAt: z.string().datetime().nullable(),
  resolvedAt: z.string().datetime().nullable(),
}).strict();

export const incidentTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('node'), id: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('relationship'), id: z.string().min(1) }).strict(),
]);

export const symptomKindSchema = z.enum([
  'unreachable',
  'degraded',
  'service_unavailable',
  'interface_down',
  'error_rate_increase',
]);

export const incidentObservationSchema = z.object({
  id: z.string().min(1),
  target: incidentTargetSchema,
  symptomKind: symptomKindSchema,
  observedAt: z.string().datetime(),
  knowledgeKind: z.enum(['observed', 'configured', 'derived', 'inferred', 'predicted', 'unknown']),
  evidenceIds: z.array(z.string()).min(1),
  summary: z.string().min(1),
}).strict();

export const incidentScenarioSchema = z.object({
  schemaVersion: z.literal(INCIDENT_SCHEMA_VERSION),
  incident: z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    title: z.string().min(1),
    severity: incidentSeveritySchema,
    state: incidentStateSchema,
    detectedAt: z.string().datetime(),
    siteId: z.string().min(1),
  }).strict(),
  analysedAt: z.string().datetime(),
  snapshot: topologySnapshotSchema,
  observations: z.array(incidentObservationSchema).min(1),
  candidateTargets: z.array(incidentTargetSchema).min(1),
}).strict();

export const confidenceBandSchema = z.enum(['high', 'moderate', 'low']);
export const impactClassificationSchema = z.enum([
  'confirmed_affected',
  'likely_affected',
  'at_risk',
  'unaffected_alternate_path',
  'unknown',
]);

export const analysisFactorSchema = z.object({
  code: z.string().min(1),
  summary: z.string().min(1),
  weight: z.number(),
  evidenceIds: z.array(z.string()),
}).strict();

export const rootCauseCandidateSchema = z.object({
  target: incidentTargetSchema,
  rank: z.number().int().positive(),
  score: z.number().min(0).max(1),
  confidence: confidenceBandSchema,
  supportingFactors: z.array(analysisFactorSchema),
  weakeningFactors: z.array(analysisFactorSchema),
  downstreamObservationCount: z.number().int().nonnegative(),
}).strict();

export const impactAssessmentSchema = z.object({
  entityId: z.string().min(1),
  classification: impactClassificationSchema,
  reasons: z.array(z.string()).min(1),
  evidenceIds: z.array(z.string()),
}).strict();

export const alternatePathFindingSchema = z.object({
  failedRelationshipId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  state: z.enum(['healthy_path_observed', 'no_healthy_path_observed', 'insufficient_evidence']),
  pathNodeIds: z.array(z.string()),
  pathRelationshipIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  summary: z.string().min(1),
}).strict();

export const safeCheckSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    'passive_verification',
    'safe_network_check',
    'physical_inspection',
    'requires_authorisation',
    'not_supported',
  ]),
  title: z.string().min(1),
  rationale: z.string().min(1),
  target: incidentTargetSchema,
}).strict();

export const incidentAnalysisSchema = z.object({
  schemaVersion: z.literal(INCIDENT_SCHEMA_VERSION),
  incidentId: z.string().min(1),
  analysedAt: z.string().datetime(),
  probableCauseCandidates: z.array(rootCauseCandidateSchema).min(1),
  impact: z.array(impactAssessmentSchema),
  alternatePaths: z.array(alternatePathFindingSchema),
  safeNextChecks: z.array(safeCheckSchema).min(1),
  limitations: z.array(z.string()),
}).strict();
