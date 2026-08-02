import type { ElementDefinition } from 'cytoscape';
import type { TopologyNode, TopologyRelationship, TopologySnapshot } from '../domain/types';
import type { LayoutProfile } from '../layout/types';

const STATUS_COLOR: Record<TopologyNode['assessment']['operationalHealth'], string> = {
  healthy: '#10B981',
  degraded: '#F59E0B',
  unreachable: '#EF4444',
  unknown: '#64748B',
};

const STATUS_MARKER: Record<TopologyNode['assessment']['operationalHealth'], string> = {
  healthy: '✓',
  degraded: '△',
  unreachable: '×',
  unknown: '?',
};

export interface AtlasCytoscapeNodeData {
  id: string;
  label: string;
  displayName: string;
  role: string;
  kind: TopologyNode['kind'];
  primaryAddress: string;
  operationalHealth: TopologyNode['assessment']['operationalHealth'];
  freshness: TopologyNode['assessment']['freshness'];
  coverage: TopologyNode['assessment']['coverage'];
  managementState: TopologyNode['assessment']['managementState'];
  confidence: number;
  operationalCriticality: number;
  statusColor: string;
  shape: string;
  size: number;
  parent?: string;
}

function nodeShape(node: TopologyNode): string {
  if (node.kind === 'zone') return 'round-rectangle';
  if (node.kind === 'service') return 'round-rectangle';
  if (node.kind === 'process') return 'hexagon';
  if (node.role.includes('firewall')) return 'diamond';
  if (node.role === 'plc' || node.role === 'hmi') return 'hexagon';
  if (node.role.includes('server') || node.role === 'historian') return 'round-rectangle';
  return 'ellipse';
}

function nodeSize(node: TopologyNode): number {
  if (node.kind === 'zone') return 1;
  if (node.kind === 'process') return 56;
  if (node.role.includes('core') || node.role.includes('firewall')) return 52;
  if (node.kind === 'service') return 44;
  return 36 + node.operationalCriticality * 2;
}

function relationshipStyle(relationship: TopologyRelationship): {
  lineStyle: 'solid' | 'dashed' | 'dotted';
  lineColor: string;
  width: number;
  targetArrowShape: 'none' | 'triangle';
} {
  switch (relationship.relationshipType) {
    case 'physical_adjacency':
      return { lineStyle: 'solid', lineColor: '#475569', width: 2, targetArrowShape: 'none' };
    case 'redundancy_peer':
      return { lineStyle: 'dashed', lineColor: '#06B6D4', width: 2, targetArrowShape: 'none' };
    case 'conduit_crossing':
      return { lineStyle: 'dashed', lineColor: '#A855F7', width: 3, targetArrowShape: 'triangle' };
    case 'controls':
      return { lineStyle: 'solid', lineColor: '#F59E0B', width: 2, targetArrowShape: 'triangle' };
    case 'depends_on':
    case 'hosts':
    case 'observed_by':
      return { lineStyle: 'dotted', lineColor: '#38BDF8', width: 1.5, targetArrowShape: 'triangle' };
    default:
      return { lineStyle: 'dotted', lineColor: '#64748B', width: 1, targetArrowShape: 'triangle' };
  }
}

export function projectSnapshotToCytoscape(
  snapshot: TopologySnapshot,
  layout: LayoutProfile | undefined,
): ElementDefinition[] {
  const interfaceToDevice = new Map(
    snapshot.interfaces.map(networkInterface => [networkInterface.id, networkInterface.deviceId]),
  );

  const resolveEndpoint = (endpoint: TopologyRelationship['source']): string | undefined =>
    endpoint.nodeId ?? (endpoint.interfaceId ? interfaceToDevice.get(endpoint.interfaceId) : undefined);

  const nodeElements: ElementDefinition[] = snapshot.nodes.map(node => {
    const marker = STATUS_MARKER[node.assessment.operationalHealth];
    const primaryAddress = node.identifiers.ipAddresses[0] ?? 'No observed address';
    const data: AtlasCytoscapeNodeData = {
      id: node.id,
      label: node.kind === 'zone' ? node.displayName : `${marker} ${node.displayName}\n${primaryAddress}`,
      displayName: node.displayName,
      role: node.role,
      kind: node.kind,
      primaryAddress,
      operationalHealth: node.assessment.operationalHealth,
      freshness: node.assessment.freshness,
      coverage: node.assessment.coverage,
      managementState: node.assessment.managementState,
      confidence: node.assessment.confidence,
      operationalCriticality: node.operationalCriticality,
      statusColor: STATUS_COLOR[node.assessment.operationalHealth],
      shape: nodeShape(node),
      size: nodeSize(node),
      ...(node.parentId ? { parent: node.parentId } : {}),
    };
    return {
      group: 'nodes',
      data,
      ...(layout?.positions[node.id] ? { position: layout.positions[node.id] } : {}),
      classes: node.kind === 'zone' ? 'atlas-zone' : 'atlas-entity',
    };
  });

  const edgeElements: ElementDefinition[] = snapshot.relationships.flatMap(relationship => {
    const source = resolveEndpoint(relationship.source);
    const target = resolveEndpoint(relationship.target);
    if (!source || !target || source === target) return [];
    const style = relationshipStyle(relationship);
    return [{
      group: 'edges' as const,
      data: {
        id: relationship.id,
        source,
        target,
        relationshipType: relationship.relationshipType,
        knowledgeKind: relationship.knowledgeKind,
        confidence: relationship.confidence,
        lineStyle: style.lineStyle,
        lineColor: style.lineColor,
        width: style.width,
        targetArrowShape: style.targetArrowShape,
      },
    }];
  });

  return [...nodeElements, ...edgeElements];
}

export function isAtlasNodeData(value: unknown): value is AtlasCytoscapeNodeData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AtlasCytoscapeNodeData>;
  return typeof candidate.id === 'string' && typeof candidate.displayName === 'string';
}
