import { z } from 'zod';
import {
  entityAssessmentSchema,
  evidenceRecordSchema,
  knowledgeKindSchema,
  managementStateSchema,
  monitoringCoverageSchema,
  networkInterfaceSchema,
  observationFreshnessSchema,
  operationalHealthSchema,
  topologyNodeSchema,
  topologyRelationshipSchema,
  topologySnapshotSchema,
} from './schemas';
import { topologyDiffOperationSchema, topologyDiffSchema } from './diffSchemas';

export type OperationalHealth = z.infer<typeof operationalHealthSchema>;
export type ObservationFreshness = z.infer<typeof observationFreshnessSchema>;
export type MonitoringCoverage = z.infer<typeof monitoringCoverageSchema>;
export type ManagementState = z.infer<typeof managementStateSchema>;
export type KnowledgeKind = z.infer<typeof knowledgeKindSchema>;
export type EntityAssessment = z.infer<typeof entityAssessmentSchema>;
export type TopologyNode = z.infer<typeof topologyNodeSchema>;
export type NetworkInterface = z.infer<typeof networkInterfaceSchema>;
export type TopologyRelationship = z.infer<typeof topologyRelationshipSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type TopologySnapshot = z.infer<typeof topologySnapshotSchema>;
export type TopologyDiffOperation = z.infer<typeof topologyDiffOperationSchema>;
export type TopologyDiff = z.infer<typeof topologyDiffSchema>;

export type OperationalCriticality = 1 | 2 | 3 | 4 | 5;
