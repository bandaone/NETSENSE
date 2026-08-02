import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no official @types package for cytoscape-fcose
import fcose from 'cytoscape-fcose';
import { Maximize2, Snowflake } from 'lucide-react';
import { cn } from '../../lib/utils';

cytoscape.use(fcose);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TopologyMapProps {
  layer:              1 | 2 | 3;
  data:               any[];
  activeIncidentIds?: string[];
  onNodeClick?:       (nodeId: string, data: any) => void;
  className?:         string;
}

interface NodeTooltip {
  x: number;
  y: number;
  data: Record<string, any>;
}

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS: Record<string, string> = {
  ok:          '#10B981',
  warning:     '#F59E0B',
  critical:    '#EF4444',
  maintenance: '#A855F7',
  learning:    '#06B6D4',
  unknown:     '#64748B',
};

// ─── Cytoscape style factory ──────────────────────────────────────────────────

const buildStyle = (layer: number): any[] => [
  {
    selector: 'node',
    style: {
      'label':        layer >= 2 ? 'data(label)' : '',
      'color':        '#E2E8F0',
      'font-family':  'Inter, sans-serif',
      'font-size':    '10px',
      'font-weight':  '600',
      'text-valign':  'bottom',
      'text-halign':  'center',
      'text-margin-y': 8,
      'text-background-color':   '#030712',
      'text-background-opacity': layer >= 2 ? 0.75 : 0,
      'text-background-padding': '4px',
      'text-background-shape':   'roundrectangle',

      'background-color':   '#080d1a',
      'background-opacity': 0.85,
      'border-width':       2.5,
      'border-color': (ele: any) => {
        if (layer === 3 && !ele.data('affected') && !ele.data('rootCause')) return '#1e293b';
        return STATUS[ele.data('status')] ?? STATUS.unknown;
      },

      'shadow-blur': (ele: any) => {
        if (layer === 3 && ele.data('rootCause')) return 25;
        return 12;
      },
      'shadow-color': (ele: any) => {
        if (layer === 3 && !ele.data('affected') && !ele.data('rootCause')) return 'transparent';
        return STATUS[ele.data('status')] ?? STATUS.unknown;
      },
      'shadow-opacity':  0.8,
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,

      'width':  (ele: any) => 22 + (ele.data('criticality') ?? 1) * 6,
      'height': (ele: any) => 22 + (ele.data('criticality') ?? 1) * 6,
      'shape':  (ele: any) => {
        const t = ele.data('type');
        if (t === 'firewall')              return 'diamond';
        if (t === 'plc' || t === 'hmi')   return 'hexagon';
        if (t === 'server')                return 'round-rectangle';
        return 'ellipse';
      },
      'opacity': (ele: any) => {
        if (layer === 3 && !ele.data('affected') && !ele.data('rootCause')) return 0.18;
        return 1;
      },
    } as any,
  },
  {
    selector: 'node:selected',
    style: {
      'border-width':   4,
      'border-color':   '#38bdf8',
      'shadow-blur':    22,
      'shadow-color':   '#38bdf8',
      'shadow-opacity': 1.0,
      'background-color': '#0b192e',
    } as any,
  },
  {
    selector: 'node[?rootCause]',
    style: {
      'border-width':   4,
      'border-color':   '#EF4444',
      'shadow-blur':    30,
      'shadow-color':   '#EF4444',
      'shadow-opacity': 1.0,
      'background-color': '#1a0b0b',
    } as any,
  },
  {
    selector: 'edge',
    style: {
      'width': (ele: any) => Math.max(1.5, Math.min(6, 1.5 + (ele.data('utilization') ?? 0) / 20)),
      'line-color': (ele: any) => {
        if (layer === 3 && !ele.data('affected')) return '#111827';
        if (layer === 3 && ele.data('affected'))  return '#F59E0B';
        const u = ele.data('utilization') ?? 0;
        if (u > 70) return '#EF4444';
        if (u > 40) return '#F59E0B';
        return 'rgba(56, 189, 248, 0.25)';
      },
      'curve-style':       'bezier',
      'line-style':        (ele: any) => ele.data('inferred') ? 'dashed' : 'solid',
      'line-dash-pattern': [6, 5],
      'opacity': (ele: any) => {
        if (layer === 3 && !ele.data('affected')) return 0.08;
        return 0.85;
      },
    } as any,
  },
];

// ─── TopologyMap ──────────────────────────────────────────────────────────────

export function TopologyMap({ layer, data, onNodeClick, className }: TopologyMapProps) {
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef        = useRef<cytoscape.Core | null>(null);

  const [isFrozen, setIsFrozen] = useState(false);
  const [tooltip,  setTooltip]  = useState<NodeTooltip | null>(null);

  // ── Build / rebuild Cytoscape whenever data or layer changes ─────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }
    setTooltip(null);

    let cy: cytoscape.Core;

    const init = () => {
      if (!containerRef.current) return;

      cy = cytoscape({
        container:       containerRef.current,
        elements:        data,
        style:           buildStyle(layer),
        layout:          { name: 'preset' },
        wheelSensitivity: 0.1,
        minZoom:          0.15,
        maxZoom:          4,
        boxSelectionEnabled: false,
      });
      cyRef.current = cy;

      // ── Node interactions ────────────────────────────────────────────────────
      cy.on('tap', 'node', evt => {
        onNodeClick?.(evt.target.id(), evt.target.data());
      });

      cy.on('tap', evt => {
        if (evt.target === cy) setTooltip(null);
      });

      cy.on('mouseover', 'node', evt => {
        const pos = evt.target.renderedPosition();
        evt.target.animate(
          { style: { width: evt.target.width() * 1.15, height: evt.target.height() * 1.15 } },
          { duration: 100 },
        );
        setTooltip({ x: pos.x, y: pos.y, data: evt.target.data() });
      });

      cy.on('mouseout', 'node', evt => {
        const orig = 22 + (evt.target.data('criticality') ?? 1) * 6;
        evt.target.animate(
          { style: { width: orig, height: orig } },
          { duration: 100 },
        );
        setTooltip(null);
      });

      // ── Run layout ──────────────────────────────────────────────────────────
      requestAnimationFrame(() => {
        cy.resize();
        cy.layout({
          name:              'fcose',
          animate:           true,
          animationDuration: 850,
          fit:               true,
          padding:           70,
          randomize:         true,
          quality:           'proof',
          nodeSeparation:    100,
          idealEdgeLength:   (edge: any) => {
            const sc = edge.source().data('criticality') ?? 1;
            const tc = edge.target().data('criticality') ?? 1;
            return 90 + (sc + tc) * 10;
          },
          nodeRepulsion:  (_n: any) => 8500,
          edgeElasticity: (_e: any) => 0.45,
          gravity:        0.15,
          gravityRange:   4.0,
          numIter:        3000,
        } as any).run();
      });
    };

    if (container.offsetWidth > 0 && container.offsetHeight > 0) {
      init();
    } else {
      const ro = new ResizeObserver(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(container);
      return () => ro.disconnect();
    }

    return () => { cy?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, layer]);

  // ── Edge laser flow animation ─────────────────────────────────────────────
  useEffect(() => {
    let offset = 0;
    let active = true;

    const tick = () => {
      if (!active) return;
      offset = (offset - 0.08) % 11;
      const cy = cyRef.current;
      if (cy) cy.edges().style('line-dash-offset', offset);
      requestAnimationFrame(tick);
    };

    tick();
    return () => { active = false; };
  }, [data, layer]);

  // ── Freeze toggle ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.autoungrabify(isFrozen);
    cy.autolock(isFrozen);
  }, [isFrozen]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const fitView = useCallback(() => cyRef.current?.fit(undefined, 60), []);
  const zoomIn  = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);
  const zoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      className={cn('relative w-full h-full overflow-hidden', className)}
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #070f24 0%, #030712 100%)' }}
    >
      {/* Cyber grid backdrop */}
      <div className="absolute inset-0 pointer-events-none cyber-grid opacity-50" />

      {/* Radial light bloom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 20%, rgba(56,189,248,0.06) 0%, transparent 55%)' }}
      />

      {/* Cytoscape canvas */}
      <div ref={containerRef} className="absolute inset-0 z-10" />

      {/* ── Node hover tooltip ── */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-30 transition-all duration-150"
          style={{ left: tooltip.x + 18, top: tooltip.y, transform: 'translateY(-50%)' }}
        >
          <div
            style={{
              background:   'rgba(7,15,36,0.92)',
              backdropFilter: 'blur(20px)',
              borderRadius: 14,
              padding:      '12px 16px',
              minWidth:     220,
              border:       '1px solid rgba(56,189,248,0.28)',
              boxShadow:    '0 12px 40px rgba(0,0,0,0.85), 0 0 20px rgba(56,189,248,0.1)',
            }}
          >
            {/* Title row */}
            <div className="flex items-center gap-2.5 mb-3">
              <span
                style={{
                  width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: STATUS[tooltip.data.status] ?? STATUS.unknown,
                  boxShadow:       `0 0 10px ${STATUS[tooltip.data.status] ?? STATUS.unknown}`,
                }}
              />
              <span className="text-[13px] font-bold text-white tracking-tight leading-none">
                {tooltip.data.label}
              </span>
            </div>

            {/* Data rows */}
            <div className="space-y-1.5 text-[11px] font-mono">
              {[
                { k: 'IP ADDR',   v: tooltip.data.ip,                            hi: false },
                { k: 'TYPE',      v: tooltip.data.type,                           hi: false },
                { k: 'STATUS',    v: tooltip.data.status,                         hi: true  },
                { k: 'PRIORITY',  v: `${'★'.repeat(tooltip.data.criticality ?? 1)}${'☆'.repeat(5 - (tooltip.data.criticality ?? 1))}`, hi: false },
              ].map(({ k, v, hi }) => (
                <div key={k} className="flex justify-between gap-6">
                  <span className="text-[#475569]">{k}</span>
                  <span
                    className="capitalize font-semibold"
                    style={hi ? { color: STATUS[tooltip.data.status] ?? '#fff' } : { color: '#e2e8f0' }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {/* Root cause badge */}
            {tooltip.data.rootCause && (
              <div className="mt-3 px-2.5 py-1 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[10px] text-[#EF4444] font-bold tracking-widest uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
                Root Cause Isolated
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Map control dock (bottom-left) ── */}
      <div className="absolute bottom-16 left-5 flex flex-col gap-2 z-20">
        {/* Zoom cluster */}
        <div
          className="flex flex-col overflow-hidden rounded-xl border border-[rgba(255,255,255,0.07)] shadow-2xl"
          style={{ background: 'rgba(7,15,36,0.75)', backdropFilter: 'blur(16px)' }}
        >
          {[
            { label: '+', title: 'Zoom in',  action: zoomIn  },
            { label: '−', title: 'Zoom out', action: zoomOut },
          ].map(({ label, title, action }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className="h-px bg-[rgba(255,255,255,0.05)]" />}
              <button
                onClick={action}
                title={title}
                className="w-9 h-9 flex items-center justify-center text-[18px] font-mono text-[#64748b] hover:text-white hover:bg-[rgba(56,189,248,0.08)] transition-all"
              >
                {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Fit view */}
        <button
          onClick={fitView}
          title="Fit view"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-[rgba(255,255,255,0.07)] text-[#64748b] hover:text-white hover:bg-[rgba(56,189,248,0.08)] transition-all shadow-2xl"
          style={{ background: 'rgba(7,15,36,0.75)', backdropFilter: 'blur(16px)' }}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Freeze layout */}
        <button
          onClick={() => setIsFrozen(f => !f)}
          title={isFrozen ? 'Unlock layout' : 'Freeze layout'}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-xl border transition-all shadow-2xl',
            isFrozen
              ? 'border-[rgba(56,189,248,0.5)] text-[#38bdf8] bg-[rgba(56,189,248,0.1)]'
              : 'border-[rgba(255,255,255,0.07)] text-[#64748b] hover:text-white hover:bg-[rgba(56,189,248,0.08)]',
          )}
          style={{ backdropFilter: 'blur(16px)', background: isFrozen ? undefined : 'rgba(7,15,36,0.75)' }}
        >
          <Snowflake className="w-4 h-4" />
        </button>
      </div>

      {/* ── Legend pill (bottom-center) ── */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-5 py-2.5 rounded-full"
        style={{
          background:     'rgba(7,15,36,0.8)',
          backdropFilter: 'blur(20px)',
          border:         '1px solid rgba(255,255,255,0.07)',
          boxShadow:      '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        {[
          { color: STATUS.ok,          label: 'Healthy'    },
          { color: STATUS.warning,     label: 'Warning'    },
          { color: STATUS.critical,    label: 'Critical'   },
          { color: STATUS.maintenance, label: 'Suppressed' },
          { color: STATUS.learning,    label: 'Learning'   },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full block border"
              style={{ borderColor: color, backgroundColor: 'rgba(3,7,18,0.6)', boxShadow: `0 0 5px ${color}` }}
            />
            <span className="text-[10.5px] font-semibold tracking-wide text-[#64748b]">{label}</span>
          </div>
        ))}

        <div className="w-px h-3 bg-[rgba(255,255,255,0.08)]" />

        <div className="flex items-center gap-1.5">
          <span className="flex gap-[3px]">
            <span className="w-2.5 h-[2px] rounded-full bg-[#38bdf8] opacity-50" />
            <span className="w-2.5 h-[2px] rounded-full bg-[#38bdf8] opacity-50" />
          </span>
          <span className="text-[10.5px] font-semibold tracking-wide text-[#64748b]">Active Feed</span>
        </div>
      </div>
    </div>
  );
}
