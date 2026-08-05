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
    lineColor: '#66727e',
    width: 1.6,
    targetArrowShape: 'none',
  },
  layer2_membership: {
    label: 'Layer 2 membership',
    lineColor: '#7d8792',
    width: 1.4,
    targetArrowShape: 'none',
  },
  layer3_reachability: {
    label: 'Layer 3 reachability',
    lineColor: '#73889e',
    width: 1.4,
    targetArrowShape: 'triangle',
  },
  observed_flow: {
    label: 'Observed flow',
    lineColor: '#6f938d',
    width: 1.2,
    targetArrowShape: 'triangle',
  },
  hosts: {
    label: 'Hosts',
    lineColor: '#75818d',
    width: 1.3,
    targetArrowShape: 'triangle',
  },
  depends_on: {
    label: 'Depends on',
    lineColor: '#708e9d',
    width: 1.4,
    targetArrowShape: 'triangle',
  },
  controls: {
    label: 'Controls',
    lineColor: '#b18d5d',
    width: 1.6,
    targetArrowShape: 'triangle',
  },
  observed_by: {
    label: 'Observed by',
    lineColor: '#658c88',
    width: 1.3,
    targetArrowShape: 'triangle',
  },
  redundancy_peer: {
    label: 'Redundancy',
    lineColor: '#8b92a3',
    width: 2.4,
    targetArrowShape: 'none',
  },
  conduit_crossing: {
    label: 'Conduit crossing',
    lineColor: '#8d7c9a',
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
