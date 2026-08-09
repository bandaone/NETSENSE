import type { KnowledgeKind, TopologyRelationship } from '../domain/types';

export type RelationshipType = TopologyRelationship['relationshipType'];

export interface RelationshipGrammar {
  label: string;
  lineColor: string;
  width: number;
  targetArrowShape: 'none' | 'triangle';
}

export interface KnowledgeGrammar {
  label: string;
  marker: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
}

export const RELATIONSHIP_GRAMMAR: Record<RelationshipType, RelationshipGrammar> = {
  physical_adjacency: {
    label: 'Physical adjacency',
    lineColor: 'var(--atlas-edge-physical)',
    width: 1.6,
    targetArrowShape: 'none',
  },
  layer2_membership: {
    label: 'Layer 2 membership',
    lineColor: 'var(--atlas-edge-layer2)',
    width: 1.4,
    targetArrowShape: 'none',
  },
  layer3_reachability: {
    label: 'Layer 3 reachability',
    lineColor: 'var(--atlas-edge-layer3)',
    width: 1.4,
    targetArrowShape: 'triangle',
  },
  observed_flow: {
    label: 'Observed flow',
    lineColor: 'var(--atlas-edge-flow)',
    width: 1.2,
    targetArrowShape: 'triangle',
  },
  hosts: {
    label: 'Hosts',
    lineColor: 'var(--atlas-edge-hosts)',
    width: 1.3,
    targetArrowShape: 'triangle',
  },
  depends_on: {
    label: 'Depends on',
    lineColor: 'var(--atlas-edge-dependency)',
    width: 1.4,
    targetArrowShape: 'triangle',
  },
  controls: {
    label: 'Controls',
    lineColor: 'var(--atlas-edge-control)',
    width: 1.6,
    targetArrowShape: 'triangle',
  },
  serves: {
    label: 'Serves',
    lineColor: 'var(--atlas-edge-serves)',
    width: 1.4,
    targetArrowShape: 'triangle',
  },
  observed_by: {
    label: 'Observed by',
    lineColor: 'var(--atlas-edge-observed)',
    width: 1.3,
    targetArrowShape: 'triangle',
  },
  redundancy_peer: {
    label: 'Redundancy',
    lineColor: 'var(--atlas-edge-redundancy)',
    width: 2.4,
    targetArrowShape: 'none',
  },
  conduit_crossing: {
    label: 'Conduit crossing',
    lineColor: 'var(--atlas-edge-conduit)',
    width: 2,
    targetArrowShape: 'triangle',
  },
};

export const KNOWLEDGE_GRAMMAR: Record<KnowledgeKind, KnowledgeGrammar> = {
  observed: { label: 'Observed', marker: '●', lineStyle: 'solid', opacity: 0.82 },
  configured: { label: 'Configured', marker: '◇', lineStyle: 'dashed', opacity: 0.8 },
  derived: { label: 'Derived', marker: '=', lineStyle: 'dotted', opacity: 0.78 },
  inferred: { label: 'Inferred', marker: '∴', lineStyle: 'dotted', opacity: 0.68 },
  predicted: { label: 'Predicted', marker: '↗', lineStyle: 'dashed', opacity: 0.62 },
  unknown: { label: 'Unknown', marker: '?', lineStyle: 'dotted', opacity: 0.52 },
};
