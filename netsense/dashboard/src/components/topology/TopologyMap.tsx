import { useCallback, useEffect, useRef, useState } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { Lock, Maximize2, Minus, Plus } from 'lucide-react';
import {
  isAtlasEdgeData,
  isAtlasNodeData,
  type AtlasCytoscapeEdgeData,
  type AtlasCytoscapeNodeData,
} from '../../features/topology/rendering/cytoscapeAdapter';
import {
  createAtlasStyles,
  readAtlasRendererPalette,
} from '../../features/topology/rendering/atlasStyles';
import { cn } from '../../lib/utils';

export interface TopologyMapProps {
  elements: ElementDefinition[];
  selectedNodeId?: string;
  selectedRelationshipId?: string;
  onNodeClick?: (node: AtlasCytoscapeNodeData) => void;
  onRelationshipClick?: (relationship: AtlasCytoscapeEdgeData) => void;
  onBackgroundClick?: () => void;
  className?: string;
}

interface NodeTooltip {
  x: number;
  y: number;
  data: AtlasCytoscapeNodeData;
}

function updateSemanticPresentation(cy: Core): void {
  const zoom = cy.zoom();
  const field = zoom < 0.66 ? 'labelLow' : zoom < 1.18 ? 'labelMedium' : 'labelHigh';
  cy.batch(() => {
    cy.nodes().forEach(node => {
      const data: unknown = node.data();
      if (!isAtlasNodeData(data)) return;
      node.data('label', data[field]);
    });
    cy.edges().forEach(edge => {
      edge.data('label', zoom >= 1.34 ? edge.data('labelHigh') : '');
    });
  });
}

export function TopologyMap({
  elements,
  selectedNodeId,
  selectedRelationshipId,
  onNodeClick,
  onRelationshipClick,
  onBackgroundClick,
  className,
}: TopologyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core>();
  const initialElementsRef = useRef(elements);
  const fittedRef = useRef(false);
  const onNodeClickRef = useRef(onNodeClick);
  const onRelationshipClickRef = useRef(onRelationshipClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  const [tooltip, setTooltip] = useState<NodeTooltip>();

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
    onRelationshipClickRef.current = onRelationshipClick;
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onBackgroundClick, onNodeClick, onRelationshipClick]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const cy = cytoscape({
      container: containerRef.current,
      elements: initialElementsRef.current,
      style: createAtlasStyles(readAtlasRendererPalette(document.documentElement)),
      layout: { name: 'preset', fit: true, padding: 54 },
      wheelSensitivity: 0.12,
      minZoom: 0.25,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autolock: true,
    });
    cyRef.current = cy;
    fittedRef.current = cy.nodes().length > 0;
    updateSemanticPresentation(cy);

    cy.on('tap', 'node.atlas-entity', event => {
      const data: unknown = event.target.data();
      if (isAtlasNodeData(data)) onNodeClickRef.current?.(data);
    });
    cy.on('tap', 'edge', event => {
      const data: unknown = event.target.data();
      if (isAtlasEdgeData(data)) onRelationshipClickRef.current?.(data);
    });
    cy.on('tap', event => {
      if (event.target === cy) onBackgroundClickRef.current?.();
    });
    cy.on('mouseover', 'node.atlas-entity', event => {
      const data: unknown = event.target.data();
      if (!isAtlasNodeData(data)) return;
      const position = event.target.renderedPosition();
      const x = position.x > cy.width() - 270 ? position.x - 246 : position.x + 16;
      const y = Math.min(Math.max(position.y, 78), cy.height() - 78);
      setTooltip({ x, y, data });
    });
    cy.on('mouseout', 'node.atlas-entity', () => setTooltip(undefined));
    cy.on('pan', () => setTooltip(undefined));
    cy.on('zoom', () => {
      setTooltip(undefined);
      updateSemanticPresentation(cy);
    });

    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        cy.resize();
        cy.fit(cy.elements(), 54);
        updateSemanticPresentation(cy);
      });
    });
    resizeObserver.observe(containerRef.current);

    const themeObserver = new MutationObserver(mutations => {
      if (!mutations.some(mutation => mutation.attributeName === 'data-environment')) return;
      cy.style(createAtlasStyles(readAtlasRendererPalette(document.documentElement)));
      updateSemanticPresentation(cy);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-environment'],
    });

    return () => {
      cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      cy.destroy();
      cyRef.current = undefined;
    };
  }, []);

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
        updateSemanticPresentation(cy);
      });
    } else {
      updateSemanticPresentation(cy);
    }
  }, [elements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('atlas-muted atlas-related');
    cy.elements().unselect();
    if (selectedNodeId) {
      const selected = cy.getElementById(selectedNodeId);
      selected.select();
      const context = selected.closedNeighborhood();
      cy.elements().not(context).addClass('atlas-muted');
      context.edges().addClass('atlas-related');
    } else if (selectedRelationshipId) {
      const selected = cy.getElementById(selectedRelationshipId);
      selected.select();
      const context = selected.connectedNodes().union(selected);
      cy.elements().not(context).addClass('atlas-muted');
      selected.addClass('atlas-related');
    }
  }, [selectedNodeId, selectedRelationshipId]);

  const fitView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.resize();
    cy.fit(cy.elements(), 54);
    updateSemanticPresentation(cy);
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
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateY(-50%)' }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{tooltip.data.displayName}</span>
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
            className="flex h-8 w-8 items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            aria-label="Zoom out"
            title="Zoom out"
            className="flex h-8 w-8 items-center justify-center border-l border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={fitView}
          aria-label="Fit topology to view"
          title="Fit topology to view"
          className="flex h-8 w-8 items-center justify-center border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex h-8 items-center gap-2 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2.5 text-[11px] text-[var(--color-text-muted)]">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Atlas layout · locked
        </div>
      </div>
    </div>
  );
}
