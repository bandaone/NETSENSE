import type {
  NetworkInterface,
  TopologyRelationship,
  TopologySnapshot,
} from './types';

export function resolveEndpointNodeId(
  endpoint: TopologyRelationship['source'],
  interfaces: readonly NetworkInterface[],
): string | undefined {
  if (endpoint.nodeId) return endpoint.nodeId;
  if (!endpoint.interfaceId) return undefined;
  return interfaces.find(networkInterface => networkInterface.id === endpoint.interfaceId)?.deviceId;
}

export interface GraphStep {
  nodeId: string;
  relationshipId: string;
}

export function dependencyDescendants(
  snapshot: TopologySnapshot,
  sourceNodeId: string,
): Map<string, number> {
  const adjacency = new Map<string, Set<string>>();
  const add = (source: string, target: string) => {
    const targets = adjacency.get(source) ?? new Set<string>();
    targets.add(target);
    adjacency.set(source, targets);
  };

  for (const relationship of snapshot.relationships) {
    const source = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
    const target = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
    if (!source || !target || source === target) continue;

    if (relationship.relationshipType === 'depends_on') add(target, source);
    if (['hosts', 'serves', 'controls'].includes(relationship.relationshipType)) add(source, target);
  }

  const distances = new Map<string, number>();
  const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: sourceNodeId, distance: 0 }];
  const visited = new Set([sourceNodeId]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const target of adjacency.get(current.nodeId) ?? []) {
      if (visited.has(target)) continue;
      visited.add(target);
      distances.set(target, current.distance + 1);
      queue.push({ nodeId: target, distance: current.distance + 1 });
    }
  }
  return distances;
}

export function findHealthyPhysicalPath(
  snapshot: TopologySnapshot,
  sourceNodeId: string,
  targetNodeId: string,
  excludedRelationshipIds: ReadonlySet<string> = new Set(),
): GraphStep[] | undefined {
  if (sourceNodeId === targetNodeId) return [];
  const adjacency = new Map<string, GraphStep[]>();
  const add = (source: string, step: GraphStep) => {
    const steps = adjacency.get(source) ?? [];
    steps.push(step);
    adjacency.set(source, steps);
  };

  for (const relationship of snapshot.relationships) {
    if (
      relationship.relationshipType !== 'physical_adjacency' ||
      relationship.status !== 'healthy' ||
      excludedRelationshipIds.has(relationship.id)
    ) continue;
    const source = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
    const target = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
    if (!source || !target || source === target) continue;
    add(source, { nodeId: target, relationshipId: relationship.id });
    add(target, { nodeId: source, relationshipId: relationship.id });
  }

  const queue = [sourceNodeId];
  const visited = new Set(queue);
  const previous = new Map<string, { nodeId: string; relationshipId: string }>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const next of adjacency.get(current) ?? []) {
      if (visited.has(next.nodeId)) continue;
      visited.add(next.nodeId);
      previous.set(next.nodeId, { nodeId: current, relationshipId: next.relationshipId });
      if (next.nodeId === targetNodeId) {
        const path: GraphStep[] = [];
        let cursor = targetNodeId;
        while (cursor !== sourceNodeId) {
          const prior = previous.get(cursor);
          if (!prior) return undefined;
          path.unshift({ nodeId: cursor, relationshipId: prior.relationshipId });
          cursor = prior.nodeId;
        }
        return path;
      }
      queue.push(next.nodeId);
    }
  }
  return undefined;
}
