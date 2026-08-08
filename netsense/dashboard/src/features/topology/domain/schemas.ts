import { z } from 'zod';

export const TOPOLOGY_SCHEMA_VERSION = '1.0.0' as const;

export const operationalHealthSchema = z.enum([
  'healthy',
  'degraded',
  'unreachable',
  'unknown',
]);

export const observationFreshnessSchema = z.enum([
  'current',
  'stale',
  'expired',
  'never_observed',
]);

export const monitoringCoverageSchema = z.enum([
  'full',
  'partial',
  'none',
  'unsupported',
]);

export const managementStateSchema = z.enum([
  'managed',
  'passive_only',
  'excluded',
  'maintenance',
]);

export const knowledgeKindSchema = z.enum([
  'observed',
  'configured',
  'derived',
  'inferred',
  'predicted',
  'unknown',
]);

export const operationalCriticalitySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const entityAssessmentSchema = z.object({
  operationalHealth: operationalHealthSchema,
  freshness: observationFreshnessSchema,
  coverage: monitoringCoverageSchema,
  managementState: managementStateSchema,
  confidence: z.number().min(0).max(1),
  assessedAt: z.string().datetime(),
  reasonCodes: z.array(z.string()),
  evidenceIds: z.array(z.string()),
}).strict();

export const organisationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
}).strict();

export const siteSchema = z.object({
  id: z.string().min(1),
  organisationId: z.string().min(1),
  name: z.string().min(1),
}).strict();

export const topologyNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    'site',
    'location',
    'zone',
    'subnet',
    'vlan',
    'device',
    'service',
    'application',
    'workload',
    'process',
    'capability',
    'user_group',
    'aggregate',
    'unknown',
  ]),
  displayName: z.string().min(1),
  role: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  identifiers: z.object({
    hostnames: z.array(z.string()),
    ipAddresses: z.array(z.string()),
    macAddresses: z.array(z.string()),
    serialNumbers: z.array(z.string()),
  }).strict(),
  parentId: z.string().nullable(),
  operationalCriticality: operationalCriticalitySchema,
  lifecycleState: z.enum(['active', 'discovered', 'retired']),
  assessment: entityAssessmentSchema,
  tags: z.array(z.string()),
  evidenceIds: z.array(z.string()),
}).strict();

export const networkInterfaceSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  name: z.string().min(1),
  ifIndex: z.number().int().positive().optional(),
  macAddresses: z.array(z.string()),
  addresses: z.array(z.string()),
  media: z.enum(['copper', 'fibre', 'wireless', 'virtual', 'unknown']),
  speedBps: z.number().nonnegative().nullable(),
  adminState: z.enum(['up', 'down', 'unknown']),
  operationalState: z.enum(['up', 'down', 'unknown']),
  vlan: z.object({
    mode: z.enum(['access', 'trunk', 'routed', 'unknown']),
    memberships: z.array(z.number().int().min(1).max(4094)),
  }).strict(),
  counters: z.object({
    inErrors: z.number().nonnegative(),
    outErrors: z.number().nonnegative(),
    inDiscards: z.number().nonnegative(),
    outDiscards: z.number().nonnegative(),
    observedAt: z.string().datetime(),
  }).strict().optional(),
  evidenceIds: z.array(z.string()),
}).strict();

const relationshipEndpointSchema = z.object({
  nodeId: z.string().min(1).optional(),
  interfaceId: z.string().min(1).optional(),
}).strict().superRefine((endpoint, context) => {
  if (!endpoint.nodeId && !endpoint.interfaceId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A relationship endpoint requires a nodeId or interfaceId.',
    });
  }
});

export const topologyRelationshipSchema = z.object({
  id: z.string().min(1),
  source: relationshipEndpointSchema,
  target: relationshipEndpointSchema,
  relationshipType: z.enum([
    'physical_adjacency',
    'layer2_membership',
    'layer3_reachability',
    'observed_flow',
    'hosts',
    'depends_on',
    'controls',
    'serves',
    'observed_by',
    'redundancy_peer',
    'conduit_crossing',
  ]),
  directionality: z.enum(['directed', 'bidirectional', 'undirected']),
  status: z.enum(['healthy', 'degraded', 'down', 'unknown']),
  confidence: z.number().min(0).max(1),
  firstObservedAt: z.string().datetime(),
  lastObservedAt: z.string().datetime(),
  evidenceIds: z.array(z.string()),
  expiresAt: z.string().datetime().nullable(),
  knowledgeKind: knowledgeKindSchema,
}).strict();

export const evidenceRecordSchema = z.object({
  id: z.string().min(1),
  sourceType: z.enum([
    'lldp',
    'cdp',
    'arp',
    'mac_table',
    'snmp',
    'syslog',
    'flow',
    'routing',
    'manual',
    'import',
    'simulation',
  ]),
  collectorId: z.string().min(1),
  observedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  summary: z.string().min(1),
  confidenceContribution: z.number().min(0).max(1),
  limitations: z.array(z.string()),
}).strict();

export const coverageSummarySchema = z.object({
  totalEntities: z.number().int().nonnegative(),
  full: z.number().int().nonnegative(),
  partial: z.number().int().nonnegative(),
  none: z.number().int().nonnegative(),
  unsupported: z.number().int().nonnegative(),
}).strict();

export const topologySnapshotSchema = z.object({
  schemaVersion: z.literal(TOPOLOGY_SCHEMA_VERSION),
  snapshotId: z.string().min(1),
  organisation: organisationSchema,
  site: siteSchema,
  synthetic: z.literal(true),
  syntheticDataNotice: z.string().min(1),
  generatedAt: z.string().datetime(),
  observedAt: z.string().datetime(),
  coverageSummary: coverageSummarySchema,
  nodes: z.array(topologyNodeSchema),
  interfaces: z.array(networkInterfaceSchema),
  relationships: z.array(topologyRelationshipSchema),
  evidence: z.array(evidenceRecordSchema),
}).strict();
