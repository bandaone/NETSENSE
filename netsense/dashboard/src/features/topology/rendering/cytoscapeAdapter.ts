import type { ElementDefinition } from 'cytoscape';
import type { TopologyNode, TopologyRelationship, TopologySnapshot } from '../domain/types';
import type { LayoutProfile } from '../layout/types';
import { KNOWLEDGE_GRAMMAR, RELATIONSHIP_GRAMMAR } from './visualGrammar';

const STATUS_COLOR: Record<TopologyNode['assessment']['operationalHealth'], string> = {
  healthy: '#65ad7d',
  degraded: '#d0a05b',
  unreachable: '#d56a6a',
  unknown: '#8b96a3',
};

const STATUS_MARKER: Record<TopologyNode['assessment']['operationalHealth'], string> = {
  healthy: '✓',
  degraded: '△',
  unreachable: '×',
  unknown: '?',
};

const COVERAGE_MARKER: Record<TopologyNode['assessment']['coverage'], string> = {
  full: '',
  partial: '◐',
  none: '○',
  unsupported: '⊘',
};

const FRESHNESS_MARKER: Record<TopologyNode['assessment']['freshness'], string> = {
  current: '',
  stale: '◷',
  expired: '⌛',
  never_observed: '?',
};

export interface AtlasCytoscapeNodeData {
  id: string;
  label: string;
  labelLow: string;
  labelMedium: string;
  labelHigh: string;
  displayName: string;
  role: string;
  roleLabel: string;
  kind: TopologyNode['kind'];
  primaryAddress: string;
  operationalHealth: TopologyNode['assessment']['operationalHealth'];
  freshness: TopologyNode['assessment']['freshness'];
  coverage: TopologyNode['assessment']['coverage'];
  managementState: TopologyNode['assessment']['managementState'];
  confidence: number;
  operationalCriticality: TopologyNode['operationalCriticality'];
  statusColor: string;
  statusMarker: string;
  shape: string;
  size: number;
  parent?: string;
}

export interface AtlasCytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  relationshipType: TopologyRelationship['relationshipType'];
  relationshipLabel: string;
  knowledgeKind: TopologyRelationship['knowledgeKind'];
  knowledgeLabel: string;
  confidence: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  lineColor: string;
  width: number;
  opacity: number;
  targetArrowShape: 'none' | 'triangle';
}

function nodeShape(node: TopologyNode): string {
  switch (node.kind) {
    case 'zone': return 'round-rectangle';
    case 'service': return 'round-rectangle';
    case 'process': return 'hexagon';
    case 'subnet': return 'diamond';
    case 'vlan': return 'round-diamond';
    case 'site': return 'round-rectangle';
    case 'unknown': return 'octagon';
    case 'device': return 'ellipse';
  }
}

function nodeSize(node: TopologyNode): number {
  switch (node.kind) {
    case 'zone': return 1;
    case 'process': return 48;
    case 'service': return 40;
    case 'site': return 52;
    default: return 38;
  }
}

function statusPrefix(node: TopologyNode): string {
  return [
    STATUS_MARKER[node.assessment.operationalHealth],
    COVERAGE_MARKER[node.assessment.coverage],
    FRESHNESS_MARKER[node.assessment.freshness],
  ].filter(Boolean).join(' ');
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
    const prefix = statusPrefix(node);
    const primaryAddress = node.identifiers.ipAddresses[0] ?? 'Address not observed';
    const roleLabel = node.role.replace(/_/g, ' ');
    const mediumLabel = node.kind === 'zone' ? node.displayName : `${prefix} ${node.displayName}`;
    const highLabel = node.kind === 'zone'
      ? node.displayName
      : `${mediumLabel}\n${roleLabel} · ${primaryAddress}`;
    const lowLabel = node.kind === 'zone' || node.operationalCriticality === 5
      ? node.displayName
      : '';
    const data: AtlasCytoscapeNodeData = {
      id: node.id,
      label: mediumLabel,
      labelLow: lowLabel,
      labelMedium: mediumLabel,
      labelHigh: highLabel,
      displayName: node.displayName,
      role: node.role,
      roleLabel,
      kind: node.kind,
      primaryAddress,
      operationalHealth: node.assessment.operationalHealth,
      freshness: node.assessment.freshness,
      coverage: node.assessment.coverage,
      managementState: node.assessment.managementState,
      confidence: node.assessment.confidence,
      operationalCriticality: node.operationalCriticality,
      statusColor: STATUS_COLOR[node.assessment.operationalHealth],
      statusMarker: STATUS_MARKER[node.assessment.operationalHealth],
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
    const relationshipGrammar = RELATIONSHIP_GRAMMAR[relationship.relationshipType];
    const knowledgeGrammar = KNOWLEDGE_GRAMMAR[relationship.knowledgeKind];
    const stateColor = relationship.status === 'down'
      ? '#d56a6a'
      : relationship.status === 'degraded'
        ? '#d0a05b'
        : relationship.status === 'unknown'
          ? '#8b96a3'
          : relationshipGrammar.lineColor;
    const data: AtlasCytoscapeEdgeData = {
      id: relationship.id,
      source,
      target,
      relationshipType: relationship.relationshipType,
      relationshipLabel: relationshipGrammar.label,
      knowledgeKind: relationship.knowledgeKind,
      knowledgeLabel: knowledgeGrammar.label,
      confidence: relationship.confidence,
      lineStyle: knowledgeGrammar.lineStyle,
      lineColor: stateColor,
      width: relationshipGrammar.width,
      opacity: knowledgeGrammar.opacity,
      targetArrowShape: relationshipGrammar.targetArrowShape,
    };
    return [{ group: 'edges' as const, data }];
  });

  return [...nodeElements, ...edgeElements];
}

export function isAtlasNodeData(value: unknown): value is AtlasCytoscapeNodeData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AtlasCytoscapeNodeData>;
  return typeof candidate.id === 'string' && typeof candidate.displayName === 'string';
}
