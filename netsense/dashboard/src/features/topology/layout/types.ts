export const LAYOUT_SCHEMA_VERSION = '1.0.0' as const;

export type TopologyLens =
  | 'operations'
  | 'physical'
  | 'layer2'
  | 'layer3'
  | 'dependency'
  | 'flow'
  | 'incident'
  | 'change';

export type StoredPositionProvenance =
  | 'system_suggested'
  | 'site_canonical'
  | 'user_override';

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayoutProfile {
  layoutSchemaVersion: typeof LAYOUT_SCHEMA_VERSION;
  profileId: string;
  siteId: string;
  scopeId: string;
  lens: TopologyLens;
  layoutVersion: number;
  provenance: StoredPositionProvenance;
  ownerUserId?: string;
  algorithm: string;
  computationMs?: number;
  warnings?: string[];
  createdAt: string;
  updatedAt: string;
  positions: Record<string, NodePosition>;
}

export interface IncidentFocusLayout {
  provenance: 'incident_temporary';
  incidentId: string;
  baseProfileId: string;
  positions: Record<string, NodePosition>;
}

export interface LayoutProfileKey {
  siteId: string;
  scopeId: string;
  lens: TopologyLens;
  ownerUserId?: string;
}
