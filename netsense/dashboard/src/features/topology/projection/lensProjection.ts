import type {
  NetworkInterface,
  TopologyNode,
  TopologyRelationship,
  TopologySnapshot,
} from '../domain/types';
import type { TopologyLens } from '../layout/types';

export interface AtlasLensDefinition {
  id: Extract<TopologyLens, 'operations' | 'physical' | 'dependency'>;
  label: string;
  shortLabel: string;
  purpose: string;
}

export const ATLAS_LENSES: AtlasLensDefinition[] = [
  {
    id: 'operations',
    label: 'Operations',
    shortLabel: 'Operations',
    purpose: 'Organisational structure, important infrastructure and operational capabilities.',
  },
  {
    id: 'physical',
    label: 'Physical network',
    shortLabel: 'Physical',
    purpose: 'Devices, interfaces, adjacency, redundancy and observation infrastructure.',
  },
  {
    id: 'dependency',
    label: 'Dependency',
    shortLabel: 'Dependency',
    purpose: 'Services, applications, workloads and the capabilities that rely on them.',
  },
];

export type ActiveAtlasLens = AtlasLensDefinition['id'];

const PHYSICAL_KINDS = new Set<TopologyNode['kind']>([
  'site',
  'location',
  'zone',
  'subnet',
  'vlan',
  'device',
  'aggregate',
  'unknown',
]);

const DEPENDENCY_KINDS = new Set<TopologyNode['kind']>([
  'site',
  'location',
  'zone',
  'device',
  'service',
  'application',
  'workload',
  'process',
  'capability',
  'user_group',
  'aggregate',
  'unknown',
]);

const PHYSICAL_RELATIONSHIPS = new Set<TopologyRelationship['relationshipType']>([
  'physical_adjacency',
  'layer2_membership',
  'redundancy_peer',
  'conduit_crossing',
  'observed_by',
]);

const OPERATIONS_RELATIONSHIPS = new Set<TopologyRelationship['relationshipType']>([
  'physical_adjacency',
  'hosts',
  'depends_on',
  'controls',
  'serves',
  'redundancy_peer',
  'conduit_crossing',
]);

const DEPENDENCY_RELATIONSHIPS = new Set<TopologyRelationship['relationshipType']>([
  'hosts',
  'depends_on',
  'controls',
  'serves',
  'redundancy_peer',
]);

export function relationshipEndpointNodeId(
  endpoint: TopologyRelationship['source'],
  interfaces: readonly NetworkInterface[],
): string | undefined {
  if (endpoint.nodeId) return endpoint.nodeId;
  if (!endpoint.interfaceId) return undefined;
  return interfaces.find(networkInterface => networkInterface.id === endpoint.interfaceId)?.deviceId;
}

function nodeAllowed(node: TopologyNode, lens: ActiveAtlasLens): boolean {
  if (lens === 'physical') return PHYSICAL_KINDS.has(node.kind);
  if (lens === 'dependency') return DEPENDENCY_KINDS.has(node.kind);
  return true;
}

function relationshipAllowed(
  relationship: TopologyRelationship,
  lens: ActiveAtlasLens,
): boolean {
  if (lens === 'physical') return PHYSICAL_RELATIONSHIPS.has(relationship.relationshipType);
  if (lens === 'dependency') return DEPENDENCY_RELATIONSHIPS.has(relationship.relationshipType);
  return OPERATIONS_RELATIONSHIPS.has(relationship.relationshipType);
}

function coverageSummary(nodes: readonly TopologyNode[]): TopologySnapshot['coverageSummary'] {
  const summary = { totalEntities: nodes.length, full: 0, partial: 0, none: 0, unsupported: 0 };
  for (const node of nodes) summary[node.assessment.coverage] += 1;
  return summary;
}

export function projectSnapshotForLens(
  snapshot: TopologySnapshot,
  lens: ActiveAtlasLens,
): TopologySnapshot {
  const nodesById = new Map(snapshot.nodes.map(node => [node.id, node]));
  const candidateIds = new Set(
    snapshot.nodes.filter(node => nodeAllowed(node, lens)).map(node => node.id),
  );

  const candidateRelationships = snapshot.relationships.filter(relationship => {
    if (!relationshipAllowed(relationship, lens)) return false;
    const sourceId = relationshipEndpointNodeId(relationship.source, snapshot.interfaces);
    const targetId = relationshipEndpointNodeId(relationship.target, snapshot.interfaces);
    return Boolean(sourceId && targetId && candidateIds.has(sourceId) && candidateIds.has(targetId));
  });

  const visibleIds = lens === 'dependency'
    ? new Set(snapshot.nodes.filter(node => [
      'service',
      'application',
      'workload',
      'process',
      'capability',
      'user_group',
      'aggregate',
      'unknown',
    ].includes(node.kind)).map(node => node.id))
    : new Set(candidateIds);

  if (lens === 'dependency') {
    for (const relationship of candidateRelationships) {
      if (relationship.relationshipType === 'redundancy_peer') continue;
      const sourceId = relationshipEndpointNodeId(relationship.source, snapshot.interfaces);
      const targetId = relationshipEndpointNodeId(relationship.target, snapshot.interfaces);
      if (sourceId) visibleIds.add(sourceId);
      if (targetId) visibleIds.add(targetId);
    }
    for (const relationship of candidateRelationships) {
      if (relationship.relationshipType !== 'redundancy_peer') continue;
      const sourceId = relationshipEndpointNodeId(relationship.source, snapshot.interfaces);
      const targetId = relationshipEndpointNodeId(relationship.target, snapshot.interfaces);
      if (sourceId && targetId && (visibleIds.has(sourceId) || visibleIds.has(targetId))) {
        visibleIds.add(sourceId);
        visibleIds.add(targetId);
      }
    }
  }

  const addAncestors = (nodeId: string): void => {
    let current = nodesById.get(nodeId);
    while (current?.parentId) {
      visibleIds.add(current.parentId);
      current = nodesById.get(current.parentId);
    }
  };
  visibleIds.forEach(addAncestors);

  const nodes = snapshot.nodes.filter(node => visibleIds.has(node.id));
  const nodeIds = new Set(nodes.map(node => node.id));
  const relationships = candidateRelationships.filter(relationship => {
    const sourceId = relationshipEndpointNodeId(relationship.source, snapshot.interfaces);
    const targetId = relationshipEndpointNodeId(relationship.target, snapshot.interfaces);
    return Boolean(sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId));
  });
  const interfaces = snapshot.interfaces.filter(networkInterface =>
    nodeIds.has(networkInterface.deviceId),
  );

  return {
    ...snapshot,
    snapshotId: `${snapshot.snapshotId}:lens:${lens}`,
    coverageSummary: coverageSummary(nodes),
    nodes,
    interfaces,
    relationships,
  };
}
