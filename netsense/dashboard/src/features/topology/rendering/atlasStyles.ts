import type { StylesheetStyle } from 'cytoscape';

export interface AtlasRendererPalette {
  canvas: string;
  nodeText: string;
  nodeSurface: string;
  nodePartial: string;
  nodeService: string;
  nodeCapability: string;
  nodeBorder: string;
  nodeServiceBorder: string;
  nodeCapabilityBorder: string;
  groupText: string;
  groupSurface: string;
  groupBorder: string;
  groupOpacity: number;
  edgeText: string;
  edgePhysical: string;
  edgeLayer2: string;
  edgeLayer3: string;
  edgeFlow: string;
  edgeHosts: string;
  edgeDependency: string;
  edgeControl: string;
  edgeServes: string;
  edgeObserved: string;
  edgeRedundancy: string;
  edgeConduit: string;
  brand: string;
  healthy: string;
  warning: string;
  critical: string;
  unknown: string;
}

const FALLBACK_PALETTE: AtlasRendererPalette = {
  canvas: '#10161d',
  nodeText: '#d5dde4',
  nodeSurface: '#17212a',
  nodePartial: '#1b2631',
  nodeService: '#1a2630',
  nodeCapability: '#1d282f',
  nodeBorder: '#5c6a76',
  nodeServiceBorder: '#667581',
  nodeCapabilityBorder: '#72808b',
  groupText: '#a8b3bd',
  groupSurface: '#121920',
  groupBorder: '#3b4854',
  groupOpacity: 0.46,
  edgeText: '#b5bec7',
  edgePhysical: '#71808d',
  edgeLayer2: '#7e8994',
  edgeLayer3: '#758da4',
  edgeFlow: '#709990',
  edgeHosts: '#7c8995',
  edgeDependency: '#7395a5',
  edgeControl: '#bc9561',
  edgeServes: '#8296a8',
  edgeObserved: '#6c9691',
  edgeRedundancy: '#969dae',
  edgeConduit: '#9985a6',
  brand: '#62b5c6',
  healthy: '#70bc88',
  warning: '#d7a75f',
  critical: '#df7777',
  unknown: '#98a4af',
};

type PaletteToken = Exclude<keyof AtlasRendererPalette, 'groupOpacity'>;

const PALETTE_TOKENS: Record<PaletteToken, string> = {
  canvas: '--color-bg-canvas',
  nodeText: '--atlas-node-text',
  nodeSurface: '--atlas-node-surface',
  nodePartial: '--atlas-node-partial',
  nodeService: '--atlas-node-service',
  nodeCapability: '--atlas-node-capability',
  nodeBorder: '--atlas-node-border',
  nodeServiceBorder: '--atlas-node-service-border',
  nodeCapabilityBorder: '--atlas-node-capability-border',
  groupText: '--atlas-group-text',
  groupSurface: '--atlas-group-surface',
  groupBorder: '--atlas-group-border',
  edgeText: '--atlas-edge-text',
  edgePhysical: '--atlas-edge-physical',
  edgeLayer2: '--atlas-edge-layer2',
  edgeLayer3: '--atlas-edge-layer3',
  edgeFlow: '--atlas-edge-flow',
  edgeHosts: '--atlas-edge-hosts',
  edgeDependency: '--atlas-edge-dependency',
  edgeControl: '--atlas-edge-control',
  edgeServes: '--atlas-edge-serves',
  edgeObserved: '--atlas-edge-observed',
  edgeRedundancy: '--atlas-edge-redundancy',
  edgeConduit: '--atlas-edge-conduit',
  brand: '--color-brand-primary',
  healthy: '--color-status-ok',
  warning: '--color-status-warn',
  critical: '--color-status-crit',
  unknown: '--color-status-unknown',
};

export function createAtlasRendererPalette(
  readToken: (token: string) => string,
): AtlasRendererPalette {
  const palette = { ...FALLBACK_PALETTE };
  for (const [key, token] of Object.entries(PALETTE_TOKENS) as Array<[PaletteToken, string]>) {
    palette[key] = readToken(token).trim() || FALLBACK_PALETTE[key];
  }
  const groupOpacity = Number.parseFloat(readToken('--atlas-group-opacity'));
  palette.groupOpacity = Number.isFinite(groupOpacity)
    ? groupOpacity
    : FALLBACK_PALETTE.groupOpacity;
  return palette;
}

export function readAtlasRendererPalette(root: Element): AtlasRendererPalette {
  const styles = getComputedStyle(root);
  return createAtlasRendererPalette(token => styles.getPropertyValue(token));
}

export function createAtlasStyles(palette: AtlasRendererPalette): StylesheetStyle[] {
  const definitions = [
    {
      selector: 'node.atlas-entity',
      style: {
        label: 'data(label)',
        color: palette.nodeText,
        'font-family': 'Inter, ui-sans-serif, sans-serif',
        'font-size': 10.5,
        'font-weight': 500,
        'text-wrap': 'wrap',
        'text-max-width': 104,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-margin-y': 0,
        'text-background-color': palette.canvas,
        'text-background-opacity': 0,
        'text-background-padding': 0,
        'text-background-shape': 'rectangle',
        width: 'data(width)',
        height: 'data(height)',
        shape: 'data(shape)',
        'background-color': palette.nodeSurface,
        'border-width': 1.5,
        'border-color': palette.nodeBorder,
      },
    },
    {
      selector: 'node.atlas-entity[operationalHealth = "degraded"]',
      style: { 'border-width': 2.5, 'border-color': palette.warning },
    },
    {
      selector: 'node.atlas-entity[operationalHealth = "unreachable"]',
      style: { 'border-width': 2.5, 'border-color': palette.critical },
    },
    {
      selector: 'node.atlas-entity[operationalHealth = "unknown"]',
      style: { 'border-color': palette.unknown, 'border-style': 'dashed' },
    },
    {
      selector: 'node.atlas-entity[coverage = "partial"]',
      style: { 'background-color': palette.nodePartial, 'background-opacity': 0.82 },
    },
    {
      selector: 'node.atlas-entity[analysisState = "confirmed"]',
      style: {
        'border-width': 3,
        'border-color': palette.critical,
        'underlay-color': palette.critical,
        'underlay-opacity': 0.12,
        'underlay-padding': 7,
      },
    },
    {
      selector: 'node.atlas-entity[analysisState = "likely"]',
      style: { 'border-width': 2.5, 'border-color': palette.warning },
    },
    {
      selector: 'node.atlas-entity[analysisState = "at_risk"]',
      style: { 'border-style': 'dashed', 'border-color': palette.warning },
    },
    {
      selector: 'node.atlas-entity[analysisState = "alternate"]',
      style: {
        'border-width': 2,
        'border-color': palette.healthy,
        'underlay-color': palette.healthy,
        'underlay-opacity': 0.08,
        'underlay-padding': 5,
      },
    },
    {
      selector: 'node.atlas-entity[analysisState = "unknown"]',
      style: { 'border-style': 'dotted', 'border-color': palette.unknown },
    },
    {
      selector: 'node.atlas-entity[kind = "application"], node.atlas-entity[kind = "service"], node.atlas-entity[kind = "workload"]',
      style: {
        'background-color': palette.nodeService,
        'border-color': palette.nodeServiceBorder,
      },
    },
    {
      selector: 'node.atlas-entity[kind = "capability"], node.atlas-entity[kind = "process"]',
      style: {
        'background-color': palette.nodeCapability,
        'border-color': palette.nodeCapabilityBorder,
      },
    },
    {
      selector: 'node.atlas-group',
      style: {
        label: 'data(label)',
        color: palette.groupText,
        'font-family': 'Inter, ui-sans-serif, sans-serif',
        'font-size': 12,
        'font-weight': 600,
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': 9,
        'background-color': palette.groupSurface,
        'background-opacity': palette.groupOpacity,
        'border-width': 1,
        'border-color': palette.groupBorder,
        'border-style': 'solid',
        padding: 32,
        shape: 'rectangle',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'overlay-color': palette.brand,
        'overlay-opacity': 0.1,
        'overlay-padding': 7,
        'border-width': 2.5,
        'border-color': palette.brand,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 'data(width)',
        'line-color': palette.edgePhysical,
        'line-style': 'data(lineStyle)',
        'curve-style': 'taxi',
        'taxi-direction': 'rightward',
        'taxi-turn': '50%',
        'taxi-turn-min-distance': 18,
        'target-arrow-shape': 'data(targetArrowShape)',
        'target-arrow-color': palette.edgePhysical,
        'arrow-scale': 0.68,
        opacity: 'data(opacity)',
        label: 'data(label)',
        color: palette.edgeText,
        'font-family': 'Inter, ui-sans-serif, sans-serif',
        'font-size': 9,
        'text-background-color': palette.canvas,
        'text-background-opacity': 0.94,
        'text-background-padding': 3,
        'text-rotation': 'autorotate',
      },
    },
    ...relationshipStyles(palette),
    {
      selector: 'edge[relationshipType = "redundancy_peer"]',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distance': 34,
        'control-point-weight': 0.5,
      },
    },
    {
      selector: 'edge[relationshipStatus = "down"]',
      style: { 'line-color': palette.critical, 'target-arrow-color': palette.critical },
    },
    {
      selector: 'edge[relationshipStatus = "degraded"]',
      style: { 'line-color': palette.warning, 'target-arrow-color': palette.warning },
    },
    {
      selector: 'edge[relationshipStatus = "unknown"]',
      style: { 'line-color': palette.unknown, 'target-arrow-color': palette.unknown },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': palette.brand,
        'target-arrow-color': palette.brand,
        opacity: 1,
        'overlay-color': palette.brand,
        'overlay-opacity': 0.07,
        'overlay-padding': 4,
      },
    },
    {
      selector: '.atlas-muted',
      style: { opacity: 0.14, 'text-opacity': 0.08 },
    },
    {
      selector: 'edge.atlas-related',
      style: {
        opacity: 0.96,
        'line-color': palette.brand,
        'target-arrow-color': palette.brand,
      },
    },
  ];

  // Cytoscape supports data(...) mappings that are narrower than its public
  // TypeScript declarations for a small set of style properties.
  return definitions as unknown as StylesheetStyle[];
}

function relationshipStyles(palette: AtlasRendererPalette) {
  const relationships: Array<[string, string]> = [
    ['physical_adjacency', palette.edgePhysical],
    ['layer2_membership', palette.edgeLayer2],
    ['layer3_reachability', palette.edgeLayer3],
    ['observed_flow', palette.edgeFlow],
    ['hosts', palette.edgeHosts],
    ['depends_on', palette.edgeDependency],
    ['controls', palette.edgeControl],
    ['serves', palette.edgeServes],
    ['observed_by', palette.edgeObserved],
    ['redundancy_peer', palette.edgeRedundancy],
    ['conduit_crossing', palette.edgeConduit],
  ];
  return relationships.map(([relationship, color]) => ({
    selector: `edge[relationshipType = "${relationship}"]`,
    style: { 'line-color': color, 'target-arrow-color': color },
  }));
}
