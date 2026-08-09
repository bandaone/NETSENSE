import { z } from 'zod';
import {
  coverageSummarySchema,
  entityAssessmentSchema,
  evidenceRecordSchema,
  networkInterfaceSchema,
  topologyNodeSchema,
  topologyRelationshipSchema,
} from './schemas';

export const TOPOLOGY_DIFF_SCHEMA_VERSION = '1.0.0' as const;

export const topologyDiffOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('node_upserted'),
    node: topologyNodeSchema,
  }).strict(),
  z.object({
    op: z.literal('node_removed'),
    nodeId: z.string().min(1),
  }).strict(),
  z.object({
    op: z.literal('assessment_changed'),
    nodeId: z.string().min(1),
    assessment: entityAssessmentSchema,
  }).strict(),
  z.object({
    op: z.literal('interface_upserted'),
    networkInterface: networkInterfaceSchema,
  }).strict(),
  z.object({
    op: z.literal('interface_removed'),
    interfaceId: z.string().min(1),
  }).strict(),
  z.object({
    op: z.literal('relationship_upserted'),
    relationship: topologyRelationshipSchema,
  }).strict(),
  z.object({
    op: z.literal('relationship_removed'),
    relationshipId: z.string().min(1),
  }).strict(),
  z.object({
    op: z.literal('evidence_upserted'),
    evidence: evidenceRecordSchema,
  }).strict(),
  z.object({
    op: z.literal('evidence_removed'),
    evidenceId: z.string().min(1),
  }).strict(),
  z.object({
    op: z.literal('coverage_changed'),
    coverageSummary: coverageSummarySchema,
  }).strict(),
]);

export const topologyDiffSchema = z.object({
  schemaVersion: z.literal(TOPOLOGY_DIFF_SCHEMA_VERSION),
  diffId: z.string().min(1),
  tenantId: z.string().min(1),
  siteId: z.string().min(1),
  baseSnapshotId: z.string().min(1),
  resultSnapshotId: z.string().min(1),
  sequence: z.number().int().positive(),
  producedAt: z.string().datetime(),
  operations: z.array(topologyDiffOperationSchema).min(1),
}).strict();
