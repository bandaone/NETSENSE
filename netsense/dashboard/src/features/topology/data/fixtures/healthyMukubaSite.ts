import type {
  EntityAssessment,
  NetworkInterface,
  TopologyNode,
  TopologyRelationship,
  TopologySnapshot,
} from '../../domain/types';
import type { LayoutProfile } from '../../layout/types';

export const MUKUBA_ORGANISATION_ID = 'organisation:mukuba-industrial';
export const MUKUBA_SITE_ID = 'site:mukuba-copper-complex';
export const HEALTHY_SCENARIO_ID = 'scenario:mukuba:healthy';

export const SYNTHETIC_DATA_NOTICE =
  'Synthetic demonstration data. All organisations, sites, network addresses, assets, incidents, operational processes, people, and relationships represented in this dataset are fictional and do not describe any real installation.';

const OBSERVED_AT = '2026-08-02T12:00:00.000Z';
const EXPIRES_AT = '2026-08-02T12:05:00.000Z';
const SIMULATION_EVIDENCE_ID = 'evidence:mukuba:synthetic-inventory';

function assessment(
  coverage: EntityAssessment['coverage'] = 'full',
  managementState: EntityAssessment['managementState'] = 'managed',
): EntityAssessment {
  return {
    operationalHealth: 'healthy',
    freshness: 'current',
    coverage,
    managementState,
    confidence: coverage === 'full' ? 0.98 : 0.82,
    assessedAt: OBSERVED_AT,
    reasonCodes: ['synthetic_healthy_scenario'],
    evidenceIds: [SIMULATION_EVIDENCE_ID],
  };
}

function node(
  id: string,
  kind: TopologyNode['kind'],
  displayName: string,
  role: string,
  parentId: string | null,
  operationalCriticality: TopologyNode['operationalCriticality'],
  options: {
    ipAddresses?: string[];
    hostnames?: string[];
    tags?: string[];
    assessment?: EntityAssessment;
  } = {},
): TopologyNode {
  return {
    id,
    kind,
    displayName,
    role,
    identifiers: {
      hostnames: options.hostnames ?? [],
      ipAddresses: options.ipAddresses ?? [],
      macAddresses: [],
      serialNumbers: [],
    },
    parentId,
    operationalCriticality,
    lifecycleState: 'active',
    assessment: options.assessment ?? assessment(),
    tags: options.tags ?? [],
    evidenceIds: [SIMULATION_EVIDENCE_ID],
  };
}

function networkInterface(
  id: string,
  deviceId: string,
  name: string,
  ifIndex: number,
  addresses: string[] = [],
): NetworkInterface {
  return {
    id,
    deviceId,
    name,
    ifIndex,
    macAddresses: [],
    addresses,
    media: 'fibre',
    speedBps: 1_000_000_000,
    adminState: 'up',
    operationalState: 'up',
    vlan: { mode: addresses.length > 0 ? 'routed' : 'trunk', memberships: [] },
    counters: {
      inErrors: 0,
      outErrors: 0,
      inDiscards: 0,
      outDiscards: 0,
      observedAt: OBSERVED_AT,
    },
    evidenceIds: [SIMULATION_EVIDENCE_ID],
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
    confidence: 0.98,
    firstObservedAt: '2026-07-01T08:00:00.000Z',
    lastObservedAt: OBSERVED_AT,
    evidenceIds: [SIMULATION_EVIDENCE_ID],
    expiresAt: EXPIRES_AT,
    knowledgeKind: 'observed',
  };
}

const ZONE_ENTERPRISE = 'zone:mukuba-copper-complex:enterprise-it';
const ZONE_DMZ = 'zone:mukuba-copper-complex:industrial-dmz';
const ZONE_OPERATIONS = 'zone:mukuba-copper-complex:operations';
const ZONE_CRUSHER = 'zone:mukuba-copper-complex:crusher-cell';

const EDGE_FIREWALL = 'device:mukuba-copper-complex:edge-firewall';
const CORE_01 = 'device:mukuba-copper-complex:core-01';
const CORE_02 = 'device:mukuba-copper-complex:core-02';
const HISTORIAN = 'device:mukuba-copper-complex:historian-01';
const JUMP_SERVER = 'device:mukuba-copper-complex:jump-01';
const SCADA_01 = 'device:mukuba-copper-complex:scada-01';
const SCADA_02 = 'device:mukuba-copper-complex:scada-02';
const CRUSHER_DIST = 'device:mukuba-copper-complex:crusher-dist-01';
const CRUSHER_PLC = 'device:mukuba-copper-complex:crusher-plc-01';
const CRUSHER_HMI = 'device:mukuba-copper-complex:crusher-hmi-01';
const PROBE = 'device:mukuba-copper-complex:probe-01';
const HISTORIAN_SERVICE = 'service:mukuba-copper-complex:plant-history';
const CRUSHER_CONTROL = 'service:mukuba-copper-complex:crusher-control';
const CRUSHER_PROCESS = 'process:mukuba-copper-complex:crusher-line';

const nodes: TopologyNode[] = [
  node(ZONE_ENTERPRISE, 'zone', 'Enterprise IT', 'security_zone', null, 3),
  node(ZONE_DMZ, 'zone', 'Industrial DMZ', 'security_zone', null, 5),
  node(ZONE_OPERATIONS, 'zone', 'Site Operations', 'security_zone', null, 5),
  node(ZONE_CRUSHER, 'zone', 'Crusher Cell', 'cell_area_zone', null, 5),
  node(EDGE_FIREWALL, 'device', 'Edge Firewall', 'firewall', ZONE_ENTERPRISE, 5, {
    ipAddresses: ['10.77.0.1'],
  }),
  node(CORE_01, 'device', 'Core Switch 01', 'core_switch', ZONE_OPERATIONS, 5, {
    ipAddresses: ['10.77.1.11'],
  }),
  node(CORE_02, 'device', 'Core Switch 02', 'core_switch', ZONE_OPERATIONS, 5, {
    ipAddresses: ['10.77.1.12'],
  }),
  node(HISTORIAN, 'device', 'Plant Historian 01', 'historian', ZONE_DMZ, 4, {
    ipAddresses: ['10.77.20.21'],
    hostnames: ['hist-01.mukuba.example'],
  }),
  node(JUMP_SERVER, 'device', 'Engineering Jump Server', 'jump_server', ZONE_DMZ, 4, {
    ipAddresses: ['10.77.20.31'],
  }),
  node(SCADA_01, 'device', 'SCADA Server 01', 'scada_server', ZONE_OPERATIONS, 5, {
    ipAddresses: ['10.77.30.21'],
  }),
  node(SCADA_02, 'device', 'SCADA Server 02', 'scada_server', ZONE_OPERATIONS, 5, {
    ipAddresses: ['10.77.30.22'],
  }),
  node(CRUSHER_DIST, 'device', 'Crusher Distribution 01', 'distribution_switch', ZONE_CRUSHER, 5, {
    ipAddresses: ['10.77.40.11'],
  }),
  node(CRUSHER_PLC, 'device', 'Crusher PLC 01', 'plc', ZONE_CRUSHER, 5, {
    ipAddresses: ['10.77.40.101'],
    assessment: assessment('partial', 'passive_only'),
    tags: ['ot', 'passive-only'],
  }),
  node(CRUSHER_HMI, 'device', 'Crusher HMI 01', 'hmi', ZONE_CRUSHER, 4, {
    ipAddresses: ['10.77.40.201'],
    assessment: assessment('partial', 'passive_only'),
    tags: ['ot', 'passive-only'],
  }),
  node(PROBE, 'device', 'Atlas Monitoring Probe', 'monitoring_probe', ZONE_OPERATIONS, 4, {
    ipAddresses: ['10.77.30.50'],
  }),
  node(HISTORIAN_SERVICE, 'service', 'Plant History Service', 'historian_service', ZONE_DMZ, 4),
  node(CRUSHER_CONTROL, 'service', 'Crusher Control Service', 'control_service', ZONE_OPERATIONS, 5),
  node(CRUSHER_PROCESS, 'process', 'Crusher Line', 'industrial_process', ZONE_CRUSHER, 5, {
    assessment: assessment('partial', 'passive_only'),
  }),
];

const interfaces: NetworkInterface[] = [
  networkInterface('interface:mukuba:edge-fw:wan', EDGE_FIREWALL, 'wan0', 1, ['10.77.0.1']),
  networkInterface('interface:mukuba:edge-fw:core-01', EDGE_FIREWALL, 'Gi1/1', 2),
  networkInterface('interface:mukuba:edge-fw:core-02', EDGE_FIREWALL, 'Gi1/2', 3),
  networkInterface('interface:mukuba:core-01:firewall', CORE_01, 'Te1/1/1', 1),
  networkInterface('interface:mukuba:core-01:peer', CORE_01, 'Te1/1/48', 48),
  networkInterface('interface:mukuba:core-01:crusher', CORE_01, 'Te1/1/20', 20),
  networkInterface('interface:mukuba:core-02:firewall', CORE_02, 'Te1/1/1', 1),
  networkInterface('interface:mukuba:core-02:peer', CORE_02, 'Te1/1/48', 48),
  networkInterface('interface:mukuba:crusher-dist:uplink', CRUSHER_DIST, 'Gi1/0/48', 48),
  networkInterface('interface:mukuba:crusher-dist:plc', CRUSHER_DIST, 'Gi1/0/10', 10),
  networkInterface('interface:mukuba:crusher-dist:hmi', CRUSHER_DIST, 'Gi1/0/11', 11),
  networkInterface('interface:mukuba:crusher-plc:eth1', CRUSHER_PLC, 'Ethernet/1', 1),
  networkInterface('interface:mukuba:crusher-hmi:eth1', CRUSHER_HMI, 'Ethernet/1', 1),
];

const relationships: TopologyRelationship[] = [
  relationship(
    'relationship:mukuba:edge-fw:core-01',
    'physical_adjacency',
    { interfaceId: 'interface:mukuba:edge-fw:core-01' },
    { interfaceId: 'interface:mukuba:core-01:firewall' },
    'bidirectional',
  ),
  relationship(
    'relationship:mukuba:edge-fw:core-02',
    'physical_adjacency',
    { interfaceId: 'interface:mukuba:edge-fw:core-02' },
    { interfaceId: 'interface:mukuba:core-02:firewall' },
    'bidirectional',
  ),
  relationship(
    'relationship:mukuba:core-peer-link',
    'physical_adjacency',
    { interfaceId: 'interface:mukuba:core-01:peer' },
    { interfaceId: 'interface:mukuba:core-02:peer' },
    'bidirectional',
  ),
  relationship(
    'relationship:mukuba:core-01:crusher-dist',
    'physical_adjacency',
    { interfaceId: 'interface:mukuba:core-01:crusher' },
    { interfaceId: 'interface:mukuba:crusher-dist:uplink' },
    'bidirectional',
  ),
  relationship(
    'relationship:mukuba:crusher-dist:plc',
    'physical_adjacency',
    { interfaceId: 'interface:mukuba:crusher-dist:plc' },
    { interfaceId: 'interface:mukuba:crusher-plc:eth1' },
    'bidirectional',
  ),
  relationship(
    'relationship:mukuba:crusher-dist:hmi',
    'physical_adjacency',
    { interfaceId: 'interface:mukuba:crusher-dist:hmi' },
    { interfaceId: 'interface:mukuba:crusher-hmi:eth1' },
    'bidirectional',
  ),
  relationship('relationship:mukuba:core-redundancy', 'redundancy_peer', { nodeId: CORE_01 }, { nodeId: CORE_02 }, 'bidirectional'),
  relationship('relationship:mukuba:scada-redundancy', 'redundancy_peer', { nodeId: SCADA_01 }, { nodeId: SCADA_02 }, 'bidirectional'),
  relationship('relationship:mukuba:history-host', 'hosts', { nodeId: HISTORIAN }, { nodeId: HISTORIAN_SERVICE }),
  relationship('relationship:mukuba:crusher-control-host', 'hosts', { nodeId: SCADA_01 }, { nodeId: CRUSHER_CONTROL }),
  relationship('relationship:mukuba:crusher-control-plc', 'depends_on', { nodeId: CRUSHER_CONTROL }, { nodeId: CRUSHER_PLC }),
  relationship('relationship:mukuba:crusher-process-control', 'depends_on', { nodeId: CRUSHER_PROCESS }, { nodeId: CRUSHER_CONTROL }),
  relationship('relationship:mukuba:plc-controls-process', 'controls', { nodeId: CRUSHER_PLC }, { nodeId: CRUSHER_PROCESS }),
  relationship('relationship:mukuba:probe-observes-dist', 'observed_by', { nodeId: CRUSHER_DIST }, { nodeId: PROBE }),
  relationship('relationship:mukuba:dmz-conduit', 'conduit_crossing', { nodeId: ZONE_DMZ }, { nodeId: ZONE_OPERATIONS }, 'bidirectional'),
];

export const healthyMukubaSnapshotFixture: TopologySnapshot = {
  schemaVersion: '1.0.0',
  snapshotId: 'snapshot:mukuba:healthy:2026-08-02T12:00:00Z',
  tenantId: MUKUBA_ORGANISATION_ID,
  organisation: {
    id: MUKUBA_ORGANISATION_ID,
    name: 'Mukuba Industrial Systems',
  },
  site: {
    id: MUKUBA_SITE_ID,
    organisationId: MUKUBA_ORGANISATION_ID,
    name: 'Mukuba Copper Processing Complex',
  },
  synthetic: true,
  syntheticDataNotice: SYNTHETIC_DATA_NOTICE,
  generatedAt: OBSERVED_AT,
  observedAt: OBSERVED_AT,
  coverageSummary: {
    totalEntities: nodes.length,
    full: 15,
    partial: 3,
    none: 0,
    unsupported: 0,
  },
  nodes,
  interfaces,
  relationships,
  evidence: [
    {
      id: SIMULATION_EVIDENCE_ID,
      sourceType: 'simulation',
      collectorId: 'collector:mukuba:fixture',
      observedAt: OBSERVED_AT,
      expiresAt: EXPIRES_AT,
      summary: 'Deterministic synthetic evidence for the healthy Atlas demonstration scenario.',
      confidenceContribution: 0.98,
      limitations: [
        'Synthetic fixture only.',
        'Does not represent a real installation.',
        'No active interaction with an OT device occurred.',
      ],
    },
  ],
};

export const healthyMukubaOperationsLayout: LayoutProfile = {
  layoutSchemaVersion: '1.0.0',
  profileId: 'layout:mukuba:site:operations:v1',
  siteId: MUKUBA_SITE_ID,
  scopeId: MUKUBA_SITE_ID,
  lens: 'operations',
  layoutVersion: 1,
  provenance: 'site_canonical',
  algorithm: 'atlas-manual-seed-v1',
  createdAt: OBSERVED_AT,
  updatedAt: OBSERVED_AT,
  positions: {
    [ZONE_ENTERPRISE]: { x: 150, y: 170 },
    [ZONE_DMZ]: { x: 425, y: 190 },
    [ZONE_OPERATIONS]: { x: 825, y: 320 },
    [ZONE_CRUSHER]: { x: 1260, y: 500 },
    [EDGE_FIREWALL]: { x: 150, y: 170 },
    [CORE_01]: { x: 720, y: 210 },
    [CORE_02]: { x: 875, y: 210 },
    [HISTORIAN]: { x: 350, y: 150 },
    [JUMP_SERVER]: { x: 500, y: 150 },
    [SCADA_01]: { x: 675, y: 350 },
    [SCADA_02]: { x: 835, y: 350 },
    [CRUSHER_DIST]: { x: 1260, y: 360 },
    [CRUSHER_PLC]: { x: 1190, y: 520 },
    [CRUSHER_HMI]: { x: 1330, y: 520 },
    [PROBE]: { x: 980, y: 350 },
    [HISTORIAN_SERVICE]: { x: 350, y: 250 },
    [CRUSHER_CONTROL]: { x: 805, y: 500 },
    [CRUSHER_PROCESS]: { x: 1260, y: 660 },
  },
};
