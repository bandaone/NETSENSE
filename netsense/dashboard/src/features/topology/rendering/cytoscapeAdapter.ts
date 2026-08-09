import type { ElementDefinition } from 'cytoscape';
import type { TopologyNode, TopologyRelationship, TopologySnapshot } from '../domain/types';
import { atlasNodeDimensions } from '../layout/atlasLayout';
import type { LayoutProfile } from '../layout/types';
import { KNOWLEDGE_GRAMMAR, RELATIONSHIP_GRAMMAR } from './visualGrammar';

const STATUS_COLOR: Record<TopologyNode['assessment']['operationalHealth'], string> = {
  healthy: 'var(--color-status-ok)',
  degraded: 'var(--color-status-warn)',
  unreachable: 'var(--color-status-crit)',
  unknown: 'var(--color-status-unknown)',
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
  width: number;
  height: number;
  entityGlyph: string;
  analysisState: 'none' | 'confirmed' | 'likely' | 'at_risk' | 'alternate' | 'unknown';
  parent?: string;
}

export interface AtlasCytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  relationshipType: TopologyRelationship['relationshipType'];
  relationshipStatus: TopologyRelationship['status'];
  relationshipLabel: string;
  knowledgeKind: TopologyRelationship['knowledgeKind'];
  knowledgeLabel: string;
  confidence: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  lineColor: string;
  width: number;
  opacity: number;
  targetArrowShape: 'none' | 'triangle';
  sourceInterface: string;
  targetInterface: string;
  label: string;
  labelHigh: string;
}

function nodeShape(node: TopologyNode): string {
  switch (node.kind) {
    case 'site':
    case 'location':
    case 'zone': return 'round-rectangle';
    case 'service':
    case 'application':
    case 'workload': return 'round-rectangle';
    case 'process':
    case 'capability': return 'hexagon';
    case 'subnet': return 'diamond';
    case 'vlan': return 'round-diamond';
    case 'user_group': return 'ellipse';
    case 'aggregate': return 'barrel';
    case 'unknown': return 'octagon';
    case 'device': return 'round-rectangle';
  }
}

function nodeGlyph(node: TopologyNode): string {
  switch (node.kind) {
    case 'site': return '⌂';
    case 'location': return '⌖';
    case 'zone': return '▱';
    case 'subnet': return '◇';
    case 'vlan': return '≋';
    case 'device': return '▣';
    case 'service': return '◆';
    case 'application': return '▤';
    case 'workload': return '□';
    case 'process': return '⬡';
    case 'capability': return '◈';
    case 'user_group': return '●';
    case 'aggregate': return '⋯';
    case 'unknown': return '?';
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
  analysisStateByNodeId: Readonly<Record<string, AtlasCytoscapeNodeData['analysisState']>> = {},
): ElementDefinition[] {
  const interfaceToDevice = new Map(
    snapshot.interfaces.map(networkInterface => [networkInterface.id, networkInterface.deviceId]),
  );
  const interfacesById = new Map(
    snapshot.interfaces.map(networkInterface => [networkInterface.id, networkInterface]),
  );

  const resolveEndpoint = (endpoint: TopologyRelationship['source']): string | undefined =>
    endpoint.nodeId ?? (endpoint.interfaceId ? interfaceToDevice.get(endpoint.interfaceId) : undefined);

  const nodeElements: ElementDefinition[] = snapshot.nodes.map(node => {
    const prefix = statusPrefix(node);
    const primaryAddress = node.identifiers.ipAddresses[0] ?? 'Address not observed';
    const roleLabel = node.role.replace(/_/g, ' ');
    const isGroup = node.kind === 'site' || node.kind === 'location' || node.kind === 'zone';
    const glyph = nodeGlyph(node);
    const dimensions = atlasNodeDimensions(node);
    const mediumLabel = isGroup ? node.displayName : `${prefix}  ${glyph} ${node.displayName}`;
    const highLabel = isGroup
      ? node.displayName
      : `${mediumLabel}\n${roleLabel} · ${primaryAddress}`;
    const lowLabel = isGroup || node.operationalCriticality >= 4
      ? node.displayName
      : glyph;
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
      width: dimensions.width,
      height: dimensions.height,
      entityGlyph: glyph,
      analysisState: analysisStateByNodeId[node.id] ?? 'none',
      ...(node.parentId ? { parent: node.parentId } : {}),
    };
    return {
      group: 'nodes',
      data,
      ...(layout?.positions[node.id] ? { position: layout.positions[node.id] } : {}),
      classes: isGroup ? 'atlas-group' : 'atlas-entity',
    };
  });

  const edgeElements: ElementDefinition[] = snapshot.relationships.flatMap(relationship => {
    const source = resolveEndpoint(relationship.source);
    const target = resolveEndpoint(relationship.target);
    if (!source || !target || source === target) return [];
    const relationshipGrammar = RELATIONSHIP_GRAMMAR[relationship.relationshipType];
    const knowledgeGrammar = KNOWLEDGE_GRAMMAR[relationship.knowledgeKind];
    const stateColor = relationship.status === 'down'
      ? 'var(--color-status-crit)'
      : relationship.status === 'degraded'
        ? 'var(--color-status-warn)'
        : relationship.status === 'unknown'
          ? 'var(--color-status-unknown)'
          : relationshipGrammar.lineColor;
    const data: AtlasCytoscapeEdgeData = {
      id: relationship.id,
      source,
      target,
      relationshipType: relationship.relationshipType,
      relationshipStatus: relationship.status,
      relationshipLabel: relationshipGrammar.label,
      knowledgeKind: relationship.knowledgeKind,
      knowledgeLabel: knowledgeGrammar.label,
      confidence: relationship.confidence,
      lineStyle: knowledgeGrammar.lineStyle,
      lineColor: stateColor,
      width: relationshipGrammar.width,
      opacity: knowledgeGrammar.opacity,
      targetArrowShape: relationshipGrammar.targetArrowShape,
      sourceInterface: relationship.source.interfaceId
        ? interfacesById.get(relationship.source.interfaceId)?.name ?? 'Unknown interface'
        : 'Entity relationship',
      targetInterface: relationship.target.interfaceId
        ? interfacesById.get(relationship.target.interfaceId)?.name ?? 'Unknown interface'
        : 'Entity relationship',
      label: '',
      labelHigh: relationship.relationshipType === 'physical_adjacency'
        ? ''
        : `${knowledgeGrammar.marker} ${relationshipGrammar.label}`,
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

export function isAtlasEdgeData(value: unknown): value is AtlasCytoscapeEdgeData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AtlasCytoscapeEdgeData>;
  return typeof candidate.id === 'string' && typeof candidate.relationshipType === 'string';
}
