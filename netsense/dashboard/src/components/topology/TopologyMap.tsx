import { useCallback, useEffect, useRef, useState } from 'react';
import cytoscape, { type Core, type ElementDefinition, type StylesheetStyle } from 'cytoscape';
import { Lock, Maximize2, Minus, Plus } from 'lucide-react';
import {
  isAtlasNodeData,
  type AtlasCytoscapeNodeData,
} from '../../features/topology/rendering/cytoscapeAdapter';
import { cn } from '../../lib/utils';

export interface TopologyMapProps {
  elements: ElementDefinition[];
  selectedNodeId?: string;
  onNodeClick?: (node: AtlasCytoscapeNodeData) => void;
  className?: string;
}

interface NodeTooltip {
  x: number;
  y: number;
  data: AtlasCytoscapeNodeData;
}

const ATLAS_STYLE_DEFINITIONS = [
  {
    selector: 'node.atlas-entity',
    style: {
      label: 'data(label)',
      color: '#cbd3dc',
      'font-family': 'Inter, ui-sans-serif, sans-serif',
      'font-size': 11,
      'font-weight': 500,
      'text-wrap': 'wrap',
      'text-max-width': 112,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 8,
      'text-background-color': '#0c1117',
      'text-background-opacity': 0.94,
      'text-background-padding': 3,
      'text-background-shape': 'rectangle',
      width: 'data(size)',
      height: 'data(size)',
      shape: 'data(shape)',
      'background-color': '#18212b',
      'border-width': 1.5,
      'border-color': '#5a6672',
    },
  },
  {
    selector: 'node.atlas-entity[operationalHealth = "degraded"]',
    style: {
      'border-width': 2.5,
      'border-color': '#d0a05b',
    },
  },
  {
    selector: 'node.atlas-entity[operationalHealth = "unreachable"]',
    style: {
      'border-width': 2.5,
      'border-color': '#d56a6a',
    },
  },
  {
    selector: 'node.atlas-entity[operationalHealth = "unknown"]',
    style: {
      'border-color': '#8b96a3',
      'border-style': 'dashed',
    },
  },
  {
    selector: 'node.atlas-entity[coverage = "partial"]',
    style: {
      'background-color': '#1a222c',
      'background-opacity': 0.72,
    },
  },
  {
    selector: 'node.atlas-zone',
    style: {
      label: 'data(label)',
      color: '#9ba6b2',
      'font-family': 'Inter, ui-sans-serif, sans-serif',
      'font-size': 12,
      'font-weight': 600,
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': 9,
      'background-color': '#111820',
      'background-opacity': 0.28,
      'border-width': 1,
      'border-color': '#34404c',
      'border-style': 'solid',
      padding: 24,
      shape: 'round-rectangle',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'overlay-color': '#59afc2',
      'overlay-opacity': 0.1,
      'overlay-padding': 7,
      'border-width': 2.5,
      'border-color': '#59afc2',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 'data(width)',
      'line-color': 'data(lineColor)',
      'line-style': 'data(lineStyle)',
      'curve-style': 'bezier',
      'target-arrow-shape': 'data(targetArrowShape)',
      'target-arrow-color': 'data(lineColor)',
      'arrow-scale': 0.68,
      opacity: 'data(opacity)',
    },
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#59afc2',
      'target-arrow-color': '#59afc2',
      opacity: 1,
      'overlay-color': '#59afc2',
      'overlay-opacity': 0.07,
      'overlay-padding': 4,
    },
  },
] as const;

// Cytoscape supports data(...) mappings that are narrower than its public
// TypeScript declarations for some style properties.
const ATLAS_STYLES = ATLAS_STYLE_DEFINITIONS as unknown as StylesheetStyle[];

function updateSemanticLabels(cy: Core): void {
  const zoom = cy.zoom();
  const field = zoom < 0.66 ? 'labelLow' : zoom < 1.18 ? 'labelMedium' : 'labelHigh';
  cy.batch(() => {
    cy.nodes().forEach(node => {
      const data: unknown = node.data();
      if (!isAtlasNodeData(data)) return;
      node.data('label', data[field]);
    });
  });
}

export function TopologyMap({
  elements,
  selectedNodeId,
  onNodeClick,
  className,
}: TopologyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core>();
  const initialElementsRef = useRef(elements);
  const fittedRef = useRef(false);
  const [tooltip, setTooltip] = useState<NodeTooltip>();

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const cy = cytoscape({
      container: containerRef.current,
      elements: initialElementsRef.current,
      style: ATLAS_STYLES,
      layout: { name: 'preset', fit: true, padding: 54 },
      wheelSensitivity: 0.12,
      minZoom: 0.25,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autolock: true,
    });
    cyRef.current = cy;
    fittedRef.current = cy.nodes().length > 0;
    updateSemanticLabels(cy);

    cy.on('tap', 'node.atlas-entity', event => {
      const data: unknown = event.target.data();
      if (isAtlasNodeData(data)) onNodeClick?.(data);
    });
    cy.on('mouseover', 'node.atlas-entity', event => {
      const data: unknown = event.target.data();
      if (!isAtlasNodeData(data)) return;
      const position = event.target.renderedPosition();
      setTooltip({ x: position.x, y: position.y, data });
    });
    cy.on('mouseout', 'node.atlas-entity', () => setTooltip(undefined));
    cy.on('pan', () => setTooltip(undefined));
    cy.on('zoom', () => {
      setTooltip(undefined);
      updateSemanticLabels(cy);
    });

    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        cy.resize();
        cy.fit(cy.elements(), 54);
        updateSemanticLabels(cy);
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      cy.destroy();
      cyRef.current = undefined;
    };
  }, [onNodeClick]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const nextIds = new Set(elements.map(element => element.data.id).filter(Boolean));

    cy.batch(() => {
      cy.elements().forEach(element => {
        if (!nextIds.has(element.id())) element.remove();
      });

      for (const definition of elements) {
        const id = definition.data.id;
        if (!id) continue;
        const existing = cy.getElementById(id);
        if (existing.length === 0) {
          cy.add(definition);
        } else {
          existing.data(definition.data);
          if (existing.isNode() && definition.position) existing.position(definition.position);
        }
      }
    });

    if (!fittedRef.current && cy.nodes().length > 0) {
      fittedRef.current = true;
      requestAnimationFrame(() => {
        cy.resize();
        cy.fit(cy.elements(), 54);
        updateSemanticLabels(cy);
      });
    } else {
      updateSemanticLabels(cy);
    }
  }, [elements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedNodeId) cy.getElementById(selectedNodeId).select();
  }, [selectedNodeId]);

  const fitView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.resize();
    cy.fit(cy.elements(), 54);
    updateSemanticLabels(cy);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: cy.zoom() * factor,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }, []);

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden bg-[var(--color-bg-canvas)]', className)}
      role="region"
      aria-label="Operational topology map. Use the topology table view for keyboard navigation and a structured text representation."
    >
      <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />

      {tooltip && (
        <div
          className="pointer-events-none absolute z-30 min-w-[230px] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-3 shadow-[var(--shadow-floating)]"
          style={{ left: tooltip.x + 16, top: tooltip.y, transform: 'translateY(-50%)' }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] font-semibold text-white">{tooltip.data.displayName}</span>
            <span className="text-[12px]" style={{ color: tooltip.data.statusColor }}>
              <span aria-hidden="true">{tooltip.data.statusMarker}</span>{' '}
              {tooltip.data.operationalHealth}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-[12px] text-[var(--color-text-secondary)]">
            <div>{tooltip.data.roleLabel}</div>
            <div className="font-mono text-[11px] text-[var(--color-text-muted)]">{tooltip.data.primaryAddress}</div>
            <div>{tooltip.data.freshness} evidence · {tooltip.data.coverage} coverage</div>
            <div>{tooltip.data.managementState.replace(/_/g, ' ')}</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <div className="flex border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            aria-label="Zoom in"
            title="Zoom in"
            className="flex h-8 w-8 items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            aria-label="Zoom out"
            title="Zoom out"
            className="flex h-8 w-8 items-center justify-center border-l border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-white"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={fitView}
          aria-label="Fit topology to view"
          title="Fit topology to view"
          className="flex h-8 w-8 items-center justify-center border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-white"
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex h-8 items-center gap-2 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2.5 text-[11px] text-[var(--color-text-muted)]">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Canonical layout
        </div>
      </div>
    </div>
  );
}
