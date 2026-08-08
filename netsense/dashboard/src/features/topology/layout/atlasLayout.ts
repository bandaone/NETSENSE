import type {
  ElkExtendedEdge,
  ElkNode,
  ElkPort,
} from 'elkjs/lib/elk-api';
import type { TopologyNode, TopologyRelationship, TopologySnapshot } from '../domain/types';
import type { ActiveAtlasLens } from '../projection/lensProjection';
import type { NodePosition } from './types';

export const ATLAS_LAYOUT_ALGORITHM = 'netsense-atlas-elk-layered-v1';

export interface AtlasLayoutRequest {
  requestId: string;
  snapshot: TopologySnapshot;
  lens: ActiveAtlasLens;
  previousPositions?: Record<string, NodePosition>;
}

export interface AtlasLayoutResult {
  requestId: string;
  positions: Record<string, NodePosition>;
  computationMs: number;
  algorithm: typeof ATLAS_LAYOUT_ALGORITHM;
  warnings: string[];
}

export interface AtlasLayoutFailure {
  requestId: string;
  error: string;
}

export type AtlasLayoutWorkerResponse = AtlasLayoutResult | AtlasLayoutFailure;

interface NodeDimensions {
  width: number;
  height: number;
}

export function atlasNodeDimensions(node: TopologyNode): NodeDimensions {
  switch (node.kind) {
    case 'site':
    case 'location':
    case 'zone':
      return { width: 180, height: 110 };
    case 'application':
    case 'capability':
    case 'process':
      return { width: 132, height: 56 };
    case 'service':
    case 'workload':
    case 'user_group':
      return { width: 120, height: 52 };
    case 'subnet':
    case 'vlan':
      return { width: 104, height: 46 };
    case 'aggregate':
      return { width: 112, height: 50 };
    case 'unknown':
      return { width: 104, height: 48 };
    case 'device':
      return { width: 112, height: 50 };
  }
}

function endpointShapeId(endpoint: TopologyRelationship['source']): string | undefined {
  return endpoint.interfaceId ?? endpoint.nodeId;
}

function makePorts(snapshot: TopologySnapshot): Map<string, ElkPort[]> {
  const references = new Map<string, 'WEST' | 'EAST'>();
  for (const relationship of snapshot.relationships) {
    if (relationship.source.interfaceId && !references.has(relationship.source.interfaceId)) {
      references.set(relationship.source.interfaceId, 'EAST');
    }
    if (relationship.target.interfaceId && !references.has(relationship.target.interfaceId)) {
      references.set(relationship.target.interfaceId, 'WEST');
    }
  }

  const portsByDevice = new Map<string, ElkPort[]>();
  for (const networkInterface of snapshot.interfaces) {
    const side = references.get(networkInterface.id);
    if (!side) continue;
    const ports = portsByDevice.get(networkInterface.deviceId) ?? [];
    ports.push({
      id: networkInterface.id,
      width: 6,
      height: 6,
      layoutOptions: { 'elk.port.side': side },
    });
    portsByDevice.set(networkInterface.deviceId, ports);
  }
  return portsByDevice;
}

function nodeLayoutOptions(node: TopologyNode, hasChildren: boolean): Record<string, string> {
  const options: Record<string, string> = {
    'elk.portConstraints': 'FIXED_SIDE',
  };
  if (hasChildren) {
    options['elk.padding'] = '[top=54,left=34,bottom=34,right=34]';
    options['elk.spacing.nodeNode'] = '42';
  }
  if (node.kind === 'capability' || node.kind === 'process' || node.kind === 'user_group') {
    options['elk.layered.layering.layerConstraint'] = 'LAST';
  }
  return options;
}

export function compileAtlasGraph(snapshot: TopologySnapshot): ElkNode {
  const childrenByParent = new Map<string | null, TopologyNode[]>();
  const nodeIds = new Set(snapshot.nodes.map(node => node.id));
  for (const node of snapshot.nodes) {
    const parentId = node.parentId && nodeIds.has(node.parentId) ? node.parentId : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(parentId, siblings);
  }

  const portsByDevice = makePorts(snapshot);
  const buildNode = (node: TopologyNode): ElkNode => {
    const childNodes = childrenByParent.get(node.id) ?? [];
    const dimensions = atlasNodeDimensions(node);
    return {
      id: node.id,
      ...(childNodes.length === 0 ? dimensions : {}),
      labels: [{ id: `${node.id}:label`, text: node.displayName }],
      ports: portsByDevice.get(node.id),
      children: childNodes.length > 0 ? childNodes.map(buildNode) : undefined,
      layoutOptions: nodeLayoutOptions(node, childNodes.length > 0),
    };
  };

  const edges: ElkExtendedEdge[] = snapshot.relationships.flatMap(relationship => {
    const source = endpointShapeId(relationship.source);
    const target = endpointShapeId(relationship.target);
    if (!source || !target || source === target) return [];
    const dependencyRunsForward = relationship.relationshipType === 'depends_on';
    return [{
      id: relationship.id,
      // The domain statement "A depends on B" remains A → B in the renderer.
      // Layout alone reads that as B → A so infrastructure-to-capability flow
      // remains left-to-right without changing the relationship's meaning.
      sources: [dependencyRunsForward ? target : source],
      targets: [dependencyRunsForward ? source : target],
      layoutOptions: {
        'elk.layered.priority.direction': relationship.relationshipType === 'physical_adjacency' ? '10' : '2',
      },
    }];
  });

  return {
    id: `atlas:${snapshot.site.id}`,
    children: (childrenByParent.get(null) ?? []).map(buildNode),
    edges,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.mergeHierarchyEdges': 'true',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.spacing.nodeNode': '48',
      'elk.spacing.edgeNode': '28',
      'elk.layered.spacing.nodeNodeBetweenLayers': '96',
      'elk.layered.spacing.edgeNodeBetweenLayers': '38',
      'elk.padding': '[top=44,left=44,bottom=44,right=44]',
    },
  };
}

export function extractAtlasPositions(graph: ElkNode): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};
  const visit = (node: ElkNode, parentX: number, parentY: number): void => {
    const x = parentX + (node.x ?? 0);
    const y = parentY + (node.y ?? 0);
    if (node !== graph) {
      positions[node.id] = {
        x: x + (node.width ?? 0) / 2,
        y: y + (node.height ?? 0) / 2,
      };
    }
    node.children?.forEach(child => visit(child, x, y));
  };
  visit(graph, 0, 0);
  return positions;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stabilizeAtlasPositions(
  computed: Record<string, NodePosition>,
  previous: Record<string, NodePosition> | undefined,
): Record<string, NodePosition> {
  if (!previous || Object.keys(previous).length === 0) return computed;
  const commonIds = Object.keys(computed).filter(id => previous[id]);
  const offsetX = average(commonIds.map(id => previous[id].x - computed[id].x));
  const offsetY = average(commonIds.map(id => previous[id].y - computed[id].y));
  const result: Record<string, NodePosition> = {};
  const occupied: NodePosition[] = [];

  for (const [id, position] of Object.entries(computed)) {
    if (previous[id]) {
      result[id] = previous[id];
      occupied.push(previous[id]);
      continue;
    }

    const candidate = { x: position.x + offsetX, y: position.y + offsetY };
    let attempts = 0;
    while (
      occupied.some(other => Math.abs(other.x - candidate.x) < 76 && Math.abs(other.y - candidate.y) < 64) &&
      attempts < 12
    ) {
      candidate.y += 72;
      attempts += 1;
    }
    result[id] = candidate;
    occupied.push(candidate);
  }
  return result;
}
