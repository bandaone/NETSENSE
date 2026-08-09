import type { IncidentAnalysis } from '../domain/types';
import { resolveEndpointNodeId } from '../../topology/domain/graph';
import type { TopologyNode, TopologySnapshot } from '../../topology/domain/types';

function coverageSummary(nodes: readonly TopologyNode[]): TopologySnapshot['coverageSummary'] {
  const summary = { totalEntities: nodes.length, full: 0, partial: 0, none: 0, unsupported: 0 };
  for (const node of nodes) summary[node.assessment.coverage] += 1;
  return summary;
}

export function projectIncidentSubgraph(
  snapshot: TopologySnapshot,
  analysis: IncidentAnalysis,
): TopologySnapshot {
  const visibleIds = new Set(analysis.impact.map(item => item.entityId));
  const requiredRelationshipIds = new Set<string>();

  for (const candidate of analysis.probableCauseCandidates) {
    if (candidate.target.kind === 'node') {
      visibleIds.add(candidate.target.id);
      continue;
    }
    requiredRelationshipIds.add(candidate.target.id);
    const relationship = snapshot.relationships.find(item => item.id === candidate.target.id);
    if (!relationship) continue;
    const source = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
    const target = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
    if (source) visibleIds.add(source);
    if (target) visibleIds.add(target);
  }

  for (const alternatePath of analysis.alternatePaths) {
    alternatePath.pathNodeIds.forEach(nodeId => visibleIds.add(nodeId));
    alternatePath.pathRelationshipIds.forEach(relationshipId => requiredRelationshipIds.add(relationshipId));
    requiredRelationshipIds.add(alternatePath.failedRelationshipId);
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
    return requiredRelationshipIds.has(relationship.id) ||
      Boolean(source && target && visibleIds.has(source) && visibleIds.has(target));
  });

  return {
    ...snapshot,
    snapshotId: `${snapshot.snapshotId}:incident:${analysis.incidentId}`,
    nodes,
    interfaces,
    relationships,
    coverageSummary: coverageSummary(nodes),
  };
}
