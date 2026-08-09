import { resolveEndpointNodeId } from '../domain/graph';
import type { MonitoringCoverage, OperationalHealth, TopologyNode, TopologySnapshot } from '../domain/types';

export interface TopologyFilters {
  query: string;
  health: OperationalHealth | 'all';
  coverage: MonitoringCoverage | 'all';
  kind: TopologyNode['kind'] | 'all';
}

function searchableText(node: TopologyNode, snapshot: TopologySnapshot): string {
  const interfaces = snapshot.interfaces.filter(networkInterface => networkInterface.deviceId === node.id);
  return [
    node.id,
    node.displayName,
    node.role,
    node.kind,
    ...node.tags,
    ...node.identifiers.hostnames,
    ...node.identifiers.ipAddresses,
    ...node.identifiers.macAddresses,
    ...node.identifiers.serialNumbers,
    ...interfaces.flatMap(networkInterface => [
      networkInterface.id,
      networkInterface.name,
      ...networkInterface.addresses,
      ...networkInterface.macAddresses,
      ...networkInterface.vlan.memberships.map(String),
    ]),
  ].join(' ').toLocaleLowerCase();
}

export function findTopologyMatches(
  snapshot: TopologySnapshot,
  filters: TopologyFilters,
): TopologyNode[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return snapshot.nodes.filter(node =>
    (query.length === 0 || searchableText(node, snapshot).includes(query)) &&
    (filters.health === 'all' || node.assessment.operationalHealth === filters.health) &&
    (filters.coverage === 'all' || node.assessment.coverage === filters.coverage) &&
    (filters.kind === 'all' || node.kind === filters.kind),
  );
}

function coverageSummary(nodes: readonly TopologyNode[]): TopologySnapshot['coverageSummary'] {
  const summary = { totalEntities: nodes.length, full: 0, partial: 0, none: 0, unsupported: 0 };
  for (const node of nodes) summary[node.assessment.coverage] += 1;
  return summary;
}

export function filterTopologySnapshot(
  snapshot: TopologySnapshot,
  filters: TopologyFilters,
): TopologySnapshot {
  const isUnfiltered = filters.query.trim() === '' &&
    filters.health === 'all' && filters.coverage === 'all' && filters.kind === 'all';
  if (isUnfiltered) return snapshot;

  const matches = findTopologyMatches(snapshot, filters);
  const matchIds = new Set(matches.map(node => node.id));
  const visibleIds = new Set(matchIds);

  if (filters.query.trim() !== '') {
    for (const relationship of snapshot.relationships) {
      const source = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
      const target = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
      if (!source || !target) continue;
      if (matchIds.has(source)) visibleIds.add(target);
      if (matchIds.has(target)) visibleIds.add(source);
    }
  }

  const nodesById = new Map(snapshot.nodes.map(node => [node.id, node]));
  for (const nodeId of [...visibleIds]) {
    let node = nodesById.get(nodeId);
    while (node?.parentId) {
      visibleIds.add(node.parentId);
      node = nodesById.get(node.parentId);
    }
  }

  const nodes = snapshot.nodes.filter(node => visibleIds.has(node.id));
  const interfaces = snapshot.interfaces.filter(networkInterface => visibleIds.has(networkInterface.deviceId));
  const relationships = snapshot.relationships.filter(relationship => {
    const source = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
    const target = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
    return Boolean(source && target && visibleIds.has(source) && visibleIds.has(target));
  });

  return {
    ...snapshot,
    snapshotId: `${snapshot.snapshotId}:filtered`,
    nodes,
    interfaces,
    relationships,
    coverageSummary: coverageSummary(nodes),
  };
}
