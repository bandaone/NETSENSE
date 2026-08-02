import { useCallback, useEffect, useRef, useState } from 'react';
import cytoscape, { type Core, type ElementDefinition, type StylesheetStyle } from 'cytoscape';
import { Lock, Maximize2, Unlock } from 'lucide-react';
import {
  isAtlasNodeData,
  type AtlasCytoscapeNodeData,
} from '../../features/topology/rendering/cytoscapeAdapter';
import { cn } from '../../lib/utils';

export interface TopologyMapProps {
  elements: ElementDefinition[];
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
      color: '#CBD5E1',
      'font-family': 'Inter, sans-serif',
      'font-size': 10,
      'font-weight': 600,
      'text-wrap': 'wrap',
      'text-max-width': 120,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 8,
      'text-background-color': '#070B14',
      'text-background-opacity': 0.88,
      'text-background-padding': 4,
      'text-background-shape': 'roundrectangle',
      width: 'data(size)',
      height: 'data(size)',
      shape: 'data(shape)',
      'background-color': '#111827',
      'border-width': 3,
      'border-color': 'data(statusColor)',
      'shadow-blur': 8,
      'shadow-color': 'data(statusColor)',
      'shadow-opacity': 0.25,
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
    },
  },
  {
    selector: 'node.atlas-zone',
    style: {
      label: 'data(label)',
      color: '#94A3B8',
      'font-family': 'Inter, sans-serif',
      'font-size': 11,
      'font-weight': 700,
      'text-transform': 'uppercase',
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': 10,
      'background-color': '#0B1220',
      'background-opacity': 0.42,
      'border-width': 1,
      'border-color': '#273449',
      'border-style': 'solid',
      padding: 28,
      shape: 'round-rectangle',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'overlay-color': '#38BDF8',
      'overlay-opacity': 0.12,
      'overlay-padding': 8,
      'border-width': 4,
      'border-color': '#38BDF8',
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
      'arrow-scale': 0.75,
      opacity: 0.78,
    },
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#38BDF8',
      'target-arrow-color': '#38BDF8',
      opacity: 1,
      'overlay-color': '#38BDF8',
      'overlay-opacity': 0.08,
      'overlay-padding': 4,
    },
  },
] as const;

// Cytoscape accepts data(...) mappers for these properties at runtime, while its
// public TypeScript declarations model several of them as literal values only.
const ATLAS_STYLES = ATLAS_STYLE_DEFINITIONS as unknown as StylesheetStyle[];

export function TopologyMap({ elements, onNodeClick, className }: TopologyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core>();
  const initialElementsRef = useRef(elements);
  const fittedRef = useRef(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [tooltip, setTooltip] = useState<NodeTooltip>();

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const cy = cytoscape({
      container: containerRef.current,
      elements: initialElementsRef.current,
      style: ATLAS_STYLES,
      layout: { name: 'preset', fit: true, padding: 72 },
      wheelSensitivity: 0.12,
      minZoom: 0.2,
      maxZoom: 3,
      boxSelectionEnabled: false,
    });
    cyRef.current = cy;
    fittedRef.current = cy.nodes().length > 0;
    cy.autolock(true);

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
    cy.on('pan zoom', () => setTooltip(undefined));

    return () => {
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

    cy.autolock(!isEditingLayout);
    if (!fittedRef.current && cy.nodes().length > 0) {
      fittedRef.current = true;
      requestAnimationFrame(() => {
        cy.resize();
        cy.fit(cy.elements(), 72);
      });
    }
  }, [elements, isEditingLayout]);

  const fitView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.resize();
    cy.fit(cy.elements(), 72);
  }, []);
  const zoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: cy.zoom() * 1.2,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }, []);
  const zoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: cy.zoom() * 0.8,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }, []);

  const toggleLayoutEditing = () => {
    setIsEditingLayout(current => {
      const next = !current;
      const cy = cyRef.current;
      if (cy) {
        if (next) cy.nodes('.atlas-entity').unlock();
        else cy.nodes().lock();
      }
      return next;
    });
  };

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden bg-[#050810]', className)}
      aria-label="Operational topology map"
    >
      <div ref={containerRef} className="absolute inset-0" />

      {tooltip && (
        <div
          className="pointer-events-none absolute z-30 min-w-[230px] rounded-lg border border-[var(--color-border-default)] bg-[#0A101D]/95 p-3 shadow-2xl"
          style={{ left: tooltip.x + 16, top: tooltip.y, transform: 'translateY(-50%)' }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] font-bold text-white">{tooltip.data.displayName}</span>
            <span className="text-[10px] font-bold uppercase" style={{ color: tooltip.data.statusColor }}>
              {tooltip.data.operationalHealth}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-[10.5px] text-[var(--color-text-secondary)]">
            <div className="font-mono text-[var(--color-brand-primary)]">{tooltip.data.primaryAddress}</div>
            <div>{tooltip.data.role.replace(/_/g, ' ')}</div>
            <div>
              {tooltip.data.freshness} evidence · {tooltip.data.coverage} coverage ·{' '}
              {Math.round(tooltip.data.confidence * 100)}% confidence
            </div>
            <div>{tooltip.data.managementState.replace(/_/g, ' ')}</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-[#0A101D]/90">
          <button onClick={zoomIn} title="Zoom in" className="h-9 w-9 text-lg text-slate-400 hover:bg-white/5 hover:text-white">+</button>
          <button onClick={zoomOut} title="Zoom out" className="h-9 w-9 border-l border-[var(--color-border-subtle)] text-lg text-slate-400 hover:bg-white/5 hover:text-white">−</button>
        </div>
        <button onClick={fitView} title="Fit topology" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[#0A101D]/90 text-slate-400 hover:text-white">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={toggleLayoutEditing}
          aria-pressed={isEditingLayout}
          title={isEditingLayout ? 'Finish layout editing' : 'Edit layout'}
          className={cn(
            'flex h-9 items-center gap-2 rounded-lg border px-3 text-[10.5px] font-bold',
            isEditingLayout
              ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
              : 'border-[var(--color-border-default)] bg-[#0A101D]/90 text-slate-400',
          )}
        >
          {isEditingLayout ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {isEditingLayout ? 'Editing layout' : 'Layout locked'}
        </button>
      </div>

      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-4 rounded-lg border border-[var(--color-border-default)] bg-[#0A101D]/90 px-4 py-2 text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Healthy</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-slate-500" /> Physical</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-cyan-500" /> Redundancy</span>
      </div>
    </div>
  );
}
