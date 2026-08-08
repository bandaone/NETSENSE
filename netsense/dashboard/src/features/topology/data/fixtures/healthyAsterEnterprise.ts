import type {
  EntityAssessment,
  NetworkInterface,
  TopologyNode,
  TopologyRelationship,
  TopologySnapshot,
} from '../../domain/types';

export const ASTER_ORGANISATION_ID = 'organisation:aster-services';
export const ASTER_SITE_ID = 'site:aster-central-campus';
export const ASTER_HEALTHY_SCENARIO_ID = 'scenario:aster-enterprise:healthy';

const OBSERVED_AT = '2026-08-06T08:30:00.000Z';
const EXPIRES_AT = '2026-08-06T08:35:00.000Z';
const EVIDENCE_ID = 'evidence:aster:synthetic-inventory';
const SYNTHETIC_NOTICE =
  'Synthetic cross-industry demonstration data. The organisation, site, addresses, services, people and relationships are fictional and do not describe a real installation.';

function assessment(coverage: EntityAssessment['coverage'] = 'full'): EntityAssessment {
  return {
    operationalHealth: 'healthy',
    freshness: 'current',
    coverage,
    managementState: 'managed',
    confidence: coverage === 'full' ? 0.97 : 0.8,
    assessedAt: OBSERVED_AT,
    reasonCodes: ['synthetic_healthy_scenario'],
    evidenceIds: [EVIDENCE_ID],
  };
}

function node(
  id: string,
  kind: TopologyNode['kind'],
  displayName: string,
  role: string,
  parentId: string | null,
  operationalCriticality: TopologyNode['operationalCriticality'],
  options: { address?: string; coverage?: EntityAssessment['coverage']; tags?: string[] } = {},
): TopologyNode {
  return {
    id,
    kind,
    displayName,
    role,
    identifiers: {
      hostnames: [],
      ipAddresses: options.address ? [options.address] : [],
      macAddresses: [],
      serialNumbers: [],
    },
    parentId,
    operationalCriticality,
    lifecycleState: 'active',
    assessment: assessment(options.coverage),
    tags: options.tags ?? [],
    evidenceIds: [EVIDENCE_ID],
  };
}

function networkInterface(
  id: string,
  deviceId: string,
  name: string,
  ifIndex: number,
): NetworkInterface {
  return {
    id,
    deviceId,
    name,
    ifIndex,
    macAddresses: [],
    addresses: [],
    media: 'fibre',
    speedBps: 10_000_000_000,
    adminState: 'up',
    operationalState: 'up',
    vlan: { mode: 'trunk', memberships: [] },
    evidenceIds: [EVIDENCE_ID],
  };
}

function relationship(
  id: string,
  relationshipType: TopologyRelationship['relationshipType'],
  source: TopologyRelationship['source'],
  target: TopologyRelationship['target'],
  directionality: TopologyRelationship['directionality'] = 'directed',
): TopologyRelationship {
  return {
    id,
    source,
    target,
    relationshipType,
    directionality,
    status: 'healthy',
    confidence: 0.97,
    firstObservedAt: '2026-08-01T08:00:00.000Z',
    lastObservedAt: OBSERVED_AT,
    evidenceIds: [EVIDENCE_ID],
    expiresAt: EXPIRES_AT,
    knowledgeKind: 'observed',
  };
}

const EDGE_ZONE = 'zone:aster:network-edge';
const CORE_ZONE = 'zone:aster:core-infrastructure';
const ACCESS_ZONE = 'zone:aster:staff-access';
const SERVICES_ZONE = 'zone:aster:digital-services';

const FIREWALL = 'device:aster:perimeter-firewall';
const CORE_01 = 'device:aster:core-01';
const CORE_02 = 'device:aster:core-02';
const ACCESS_01 = 'device:aster:access-01';
const COMPUTE = 'device:aster:compute-cluster';
const PROBE = 'device:aster:monitoring-probe';
const DIRECTORY = 'service:aster:directory';
const IDENTITY = 'application:aster:identity';
const COLLABORATION = 'application:aster:collaboration';
const FINANCE = 'application:aster:finance';
const CUSTOMER_PORTAL = 'application:aster:customer-portal';
const STAFF_ACCESS = 'capability:aster:staff-access';
const FINANCE_OPERATIONS = 'capability:aster:finance-operations';
const CUSTOMER_SERVICES = 'capability:aster:customer-services';
const WORKFORCE = 'user-group:aster:workforce';

const nodes: TopologyNode[] = [
  node(EDGE_ZONE, 'zone', 'Network Edge', 'security_zone', null, 5),
  node(CORE_ZONE, 'zone', 'Core Infrastructure', 'network_zone', null, 5),
  node(ACCESS_ZONE, 'zone', 'Staff Access', 'network_zone', null, 4),
  node(SERVICES_ZONE, 'zone', 'Digital Services', 'application_zone', null, 5),
  node(FIREWALL, 'device', 'Perimeter Firewall', 'firewall', EDGE_ZONE, 5, { address: '192.0.2.1' }),
  node(CORE_01, 'device', 'Core Switch 01', 'core_switch', CORE_ZONE, 5, { address: '192.0.2.11' }),
  node(CORE_02, 'device', 'Core Switch 02', 'core_switch', CORE_ZONE, 5, { address: '192.0.2.12' }),
  node(ACCESS_01, 'device', 'Campus Access 01', 'access_switch', ACCESS_ZONE, 4, { address: '192.0.2.31' }),
  node(COMPUTE, 'device', 'Compute Cluster', 'virtualisation_cluster', SERVICES_ZONE, 5, { address: '192.0.2.41' }),
  node(PROBE, 'device', 'Monitoring Probe', 'monitoring_probe', CORE_ZONE, 4, { address: '192.0.2.50' }),
  node(DIRECTORY, 'service', 'Directory Service', 'identity_service', SERVICES_ZONE, 5),
  node(IDENTITY, 'application', 'Identity Platform', 'business_application', SERVICES_ZONE, 5),
  node(COLLABORATION, 'application', 'Collaboration Suite', 'business_application', SERVICES_ZONE, 4),
  node(FINANCE, 'application', 'Finance Platform', 'business_application', SERVICES_ZONE, 5),
  node(CUSTOMER_PORTAL, 'application', 'Customer Portal', 'customer_application', SERVICES_ZONE, 5, { coverage: 'partial' }),
  node(STAFF_ACCESS, 'capability', 'Staff Digital Access', 'business_service', ACCESS_ZONE, 4),
  node(FINANCE_OPERATIONS, 'capability', 'Finance Operations', 'department_function', SERVICES_ZONE, 5),
  node(CUSTOMER_SERVICES, 'capability', 'Customer Services', 'customer_service', SERVICES_ZONE, 5),
  node(WORKFORCE, 'user_group', 'Hybrid Workforce', 'user_group', ACCESS_ZONE, 4, { coverage: 'partial' }),
];

const interfaces: NetworkInterface[] = [
  networkInterface('interface:aster:firewall:core-01', FIREWALL, 'xe-0/0/1', 1),
  networkInterface('interface:aster:firewall:core-02', FIREWALL, 'xe-0/0/2', 2),
  networkInterface('interface:aster:core-01:firewall', CORE_01, 'Te1/1/1', 1),
  networkInterface('interface:aster:core-02:firewall', CORE_02, 'Te1/1/1', 1),
  networkInterface('interface:aster:core-01:peer', CORE_01, 'Te1/1/48', 48),
  networkInterface('interface:aster:core-02:peer', CORE_02, 'Te1/1/48', 48),
  networkInterface('interface:aster:core-01:access', CORE_01, 'Te1/1/20', 20),
  networkInterface('interface:aster:access:core', ACCESS_01, 'Te1/0/48', 48),
  networkInterface('interface:aster:core-02:compute', CORE_02, 'Te1/1/21', 21),
  networkInterface('interface:aster:compute:core', COMPUTE, 'bond0', 1),
];

const relationships: TopologyRelationship[] = [
  relationship('relationship:aster:firewall:core-01', 'physical_adjacency', { interfaceId: 'interface:aster:firewall:core-01' }, { interfaceId: 'interface:aster:core-01:firewall' }, 'bidirectional'),
  relationship('relationship:aster:firewall:core-02', 'physical_adjacency', { interfaceId: 'interface:aster:firewall:core-02' }, { interfaceId: 'interface:aster:core-02:firewall' }, 'bidirectional'),
  relationship('relationship:aster:core-peer', 'physical_adjacency', { interfaceId: 'interface:aster:core-01:peer' }, { interfaceId: 'interface:aster:core-02:peer' }, 'bidirectional'),
  relationship('relationship:aster:core:access', 'physical_adjacency', { interfaceId: 'interface:aster:core-01:access' }, { interfaceId: 'interface:aster:access:core' }, 'bidirectional'),
  relationship('relationship:aster:core:compute', 'physical_adjacency', { interfaceId: 'interface:aster:core-02:compute' }, { interfaceId: 'interface:aster:compute:core' }, 'bidirectional'),
  relationship('relationship:aster:core-redundancy', 'redundancy_peer', { nodeId: CORE_01 }, { nodeId: CORE_02 }, 'bidirectional'),
  relationship('relationship:aster:compute:directory', 'hosts', { nodeId: COMPUTE }, { nodeId: DIRECTORY }),
  relationship('relationship:aster:compute:identity', 'hosts', { nodeId: COMPUTE }, { nodeId: IDENTITY }),
  relationship('relationship:aster:compute:collaboration', 'hosts', { nodeId: COMPUTE }, { nodeId: COLLABORATION }),
  relationship('relationship:aster:compute:finance', 'hosts', { nodeId: COMPUTE }, { nodeId: FINANCE }),
  relationship('relationship:aster:compute:portal', 'hosts', { nodeId: COMPUTE }, { nodeId: CUSTOMER_PORTAL }),
  relationship('relationship:aster:identity:directory', 'depends_on', { nodeId: IDENTITY }, { nodeId: DIRECTORY }),
  relationship('relationship:aster:collaboration:identity', 'depends_on', { nodeId: COLLABORATION }, { nodeId: IDENTITY }),
  relationship('relationship:aster:finance:identity', 'depends_on', { nodeId: FINANCE }, { nodeId: IDENTITY }),
  relationship('relationship:aster:portal:identity', 'depends_on', { nodeId: CUSTOMER_PORTAL }, { nodeId: IDENTITY }),
  relationship('relationship:aster:staff:collaboration', 'depends_on', { nodeId: STAFF_ACCESS }, { nodeId: COLLABORATION }),
  relationship('relationship:aster:finance-ops:finance', 'depends_on', { nodeId: FINANCE_OPERATIONS }, { nodeId: FINANCE }),
  relationship('relationship:aster:customer-services:portal', 'depends_on', { nodeId: CUSTOMER_SERVICES }, { nodeId: CUSTOMER_PORTAL }),
  relationship('relationship:aster:collaboration:workforce', 'serves', { nodeId: COLLABORATION }, { nodeId: WORKFORCE }),
  relationship('relationship:aster:access:staff', 'serves', { nodeId: ACCESS_01 }, { nodeId: STAFF_ACCESS }),
  relationship('relationship:aster:core:probe', 'observed_by', { nodeId: CORE_01 }, { nodeId: PROBE }),
  relationship('relationship:aster:edge-core-conduit', 'conduit_crossing', { nodeId: EDGE_ZONE }, { nodeId: CORE_ZONE }, 'bidirectional'),
];

export const healthyAsterEnterpriseSnapshotFixture: TopologySnapshot = {
  schemaVersion: '1.0.0',
  snapshotId: 'snapshot:aster-enterprise:healthy:2026-08-06T08:30:00Z',
  organisation: { id: ASTER_ORGANISATION_ID, name: 'Aster Services Group' },
  site: {
    id: ASTER_SITE_ID,
    organisationId: ASTER_ORGANISATION_ID,
    name: 'Central Services Campus',
  },
  synthetic: true,
  syntheticDataNotice: SYNTHETIC_NOTICE,
  generatedAt: OBSERVED_AT,
  observedAt: OBSERVED_AT,
  coverageSummary: { totalEntities: nodes.length, full: 17, partial: 2, none: 0, unsupported: 0 },
  nodes,
  interfaces,
  relationships,
  evidence: [{
    id: EVIDENCE_ID,
    sourceType: 'simulation',
    collectorId: 'collector:aster:fixture',
    observedAt: OBSERVED_AT,
    expiresAt: EXPIRES_AT,
    summary: 'Deterministic synthetic evidence for a cross-industry enterprise network scenario.',
    confidenceContribution: 0.97,
    limitations: ['Synthetic fixture only.', 'Does not represent a real organisation or installation.'],
  }],
};
