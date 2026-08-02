import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TopologyMap } from '../../components/topology/TopologyMap';
import { generateMockTopology, ACTIVE_INCIDENT } from '../../lib/mockData';
import { AlertFeedSidebar } from '../../components/dashboard/AlertFeedSidebar';
import { NodeDetailPanel } from '../../components/topology/NodeDetailPanel';
import { IncidentPanel } from '../../components/incidents/IncidentPanel';
import { Layers, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Dashboard() {
  const [layer, setLayer]             = useState<1 | 2 | 3>(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]  = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const data = useMemo(() => generateMockTopology(), []);

  const handleNodeClick = (nodeId: string, nodeData: any) => {
    if (layer === 1) {
      setLayer(2);
      setSelectedNode(nodeId);
    } else if (layer === 2) {
      setSelectedNode(nodeId);
    } else if (layer === 3) {
      if (nodeData.affected || nodeData.rootCause) {
        setSelectedNode(nodeId);
      }
    }
  };

  // Keyboard shortcut: Ctrl+K or / focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)] relative overflow-hidden">

      {/* Ambient background orbs */}
      <div className="absolute top-0 right-1/3 w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.025) 0%, transparent 70%)' }}
      />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.018) 0%, transparent 70%)' }}
      />

      {/* ── Stat row (L1 & L2) ──────────────────────────────────────────────── */}
      {layer !== 3 && (
        <div
          className="flex-shrink-0 flex gap-3.5 px-4 py-3 relative z-10"
          style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'rgba(3,7,18,0.18)' }}
        >
          <StatTile
            label="Devices Online"
            value="203"
            unit="/ 210"
            status="ok"
            delta="+2 from yesterday"
            deltaUp
            sparkData={[18,20,19,22,21,19,20,18,21,20,22,21,20]}
          />
          <StatTile
            label="Active Incidents"
            value="1"
            unit="CRITICAL"
            status="critical"
            delta="+1 from yesterday"
            deltaUp={false}
            sparkData={[0,0,0,0,1,0,0,1,0,0,0,1,1]}
          />
          <StatTile
            label="Avg Response Time"
            value="12"
            unit="ms"
            status="ok"
            delta="↓ 3ms vs yesterday"
            deltaUp
            sparkData={[16,15,14,15,13,14,13,12,13,12,13,12,12]}
          />
          <StatTile
            label="Baseline Coverage"
            value="94"
            unit="%"
            status="ok"
            delta="+2% this week"
            deltaUp
            sparkData={[88,89,90,90,91,91,92,92,93,93,94,94,94]}
          />
        </div>
      )}

      {/* ── L2 filter bar ──────────────────────────────────────────────────── */}
      {layer === 2 && (
        <div
          className="flex-shrink-0 flex items-center px-5 gap-3 relative z-10"
          style={{
            height:       52,
            borderBottom: '1px solid var(--color-border-subtle)',
            background:   'rgba(6,11,24,0.55)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Search */}
          <label
            className="flex items-center gap-2.5 flex-1 max-w-md rounded-lg px-3.5 py-2 transition-all duration-200"
            style={{
              background:  'rgba(3,7,18,0.5)',
              border:      '1px solid var(--color-border-subtle)',
              boxShadow:   'none',
            }}
            onFocus={e => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(56,189,248,0.3)';
              el.style.boxShadow   = '0 0 0 3px rgba(56,189,248,0.06)';
            }}
            onBlur={e => {
              const el = e.currentTarget;
              el.style.borderColor = 'var(--color-border-subtle)';
              el.style.boxShadow   = 'none';
            }}
          >
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by node, IP, or VLAN…"
              className="bg-transparent border-none outline-none text-[12.5px] text-white w-full placeholder:text-[var(--color-text-disabled)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[9px] font-bold text-[var(--color-text-disabled)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 rounded-[4px] flex-shrink-0 whitespace-nowrap">
              Ctrl K
            </span>
          </label>

          <div className="h-4 w-px bg-[var(--color-border-subtle)]" />

          {/* Filter chips */}
          {['Status: All', 'Type: All'].map(chip => (
            <button
              key={chip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-white transition-all duration-150"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border:     '1px solid var(--color-border-subtle)',
              }}
            >
              <SlidersHorizontal className="w-3 h-3 text-[var(--color-brand-primary)]" />
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* ── L3 incident banner ─────────────────────────────────────────────── */}
      {layer === 3 && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 relative z-10"
          style={{
            background:   'rgba(239,68,68,0.04)',
            borderBottom: '1px solid rgba(239,68,68,0.22)',
          }}
        >
          {/* Left red accent bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] animate-pulse"
            style={{ background: 'var(--color-status-crit)', boxShadow: '0 0 10px #EF4444' }}
          />

          <div className="flex items-center gap-4">
            {/* Pulsing dot */}
            <div className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-status-crit)] opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-status-crit)]" />
            </div>

            <div>
              <div className="font-extrabold text-[14px] text-white tracking-tight flex items-center gap-2 mb-1">
                CRITICAL INCIDENT IDENTIFIED
                <span
                  className="text-[10px] font-mono text-[var(--color-status-crit)] px-2 py-0.5 rounded"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  {ACTIVE_INCIDENT.id}
                </span>
              </div>
              <div className="text-[11.5px] text-[var(--color-text-secondary)] font-medium leading-none">
                {ACTIVE_INCIDENT.description} · {ACTIVE_INCIDENT.blastRadius.devicesTotal} downstream devices quarantined
              </div>
            </div>
          </div>

          <button
            onClick={() => setLayer(1)}
            className="px-4 py-2 text-[12px] font-bold text-white rounded-lg transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border:     '1px solid var(--color-border-default)',
            }}
          >
            Exit Layer
          </button>
        </div>
      )}

      {/* ── Main workspace ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative z-10">

        {/* Topology canvas */}
        <div className="flex-1 relative">
          <TopologyMap
            layer={layer}
            data={data}
            onNodeClick={handleNodeClick}
          />

          {/* ── Layer switcher dock ── */}
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center p-1 rounded-xl z-20"
            style={{
              background:     'rgba(6,11,24,0.82)',
              backdropFilter: 'blur(24px)',
              border:         '1px solid rgba(56,189,248,0.16)',
              boxShadow:      '0 8px 32px rgba(0,0,0,0.55)',
            }}
          >
            {/* Label */}
            <div className="flex items-center gap-1.5 pl-3 pr-3.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-disabled)]">
              <Layers className="w-3 h-3 text-[var(--color-brand-primary)]" />
              Layer
            </div>

            <div className="w-px h-4 bg-[var(--color-border-subtle)]" />

            {/* Layer buttons */}
            <div className="flex items-center gap-0.5 p-0.5 ml-0.5">
              <LayerBtn active={layer === 1} onClick={() => setLayer(1)}>
                L1 · Overview
              </LayerBtn>
              <LayerBtn active={layer === 2} onClick={() => setLayer(2)}>
                L2 · Detailed
              </LayerBtn>

              <div className="w-px h-4 bg-[var(--color-border-subtle)] mx-0.5" />

              <LayerBtn active={layer === 3} onClick={() => setLayer(3)} critical>
                L3 · Incident
              </LayerBtn>
            </div>
          </div>
        </div>

        {/* ── Slide-in sidepanels ── */}

        {/* L1: Alert feed */}
        <div className={cn(
          'h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex-shrink-0',
          layer === 1 ? 'w-[310px] opacity-100' : 'w-0 opacity-0',
        )}>
          <AlertFeedSidebar />
        </div>

        {/* L2: Node detail */}
        <div className={cn(
          'h-full absolute right-0 top-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-30',
          layer === 2 && selectedNode ? 'translate-x-0' : 'translate-x-full',
        )}>
          <NodeDetailPanel nodeId={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>

        {/* L3: Incident panel */}
        <div className={cn(
          'h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex-shrink-0',
          layer === 3 ? 'w-[480px] opacity-100' : 'w-0 opacity-0',
        )}>
          <IncidentPanel />
        </div>

      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

// Sparkline SVG (area chart)
function Sparkline({ data, status }: { data: number[]; status: 'ok' | 'critical' }) {
  const W = 90;
  const H = 32;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const strokeColor = status === 'critical' ? '#EF4444' : '#10B981';
  const pathD  = `M ${pts.join(' L ')}`;
  const fillD  = `M 0,${H} L ${pts.join(' L ')} L ${W},${H} Z`;

  return (
    <svg width={W} height={H} className="overflow-visible opacity-60 hover:opacity-90 transition-opacity duration-200">
      <defs>
        <linearGradient id={`spk-${status}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={strokeColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#spk-${status})`} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Stat tile card
function StatTile({
  label, value, unit, status, delta, deltaUp, sparkData,
}: {
  label:     string;
  value:     string;
  unit:      string;
  status:    'ok' | 'critical';
  delta:     string;
  deltaUp:   boolean;
  sparkData: number[];
}) {
  const isCrit = status === 'critical';
  return (
    <div
      className={cn(
        'flex-1 relative overflow-hidden rounded-2xl flex items-center justify-between transition-all duration-200 hover:translate-y-[-1px]',
        isCrit
          ? 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.025)]'
          : 'border-[var(--color-border-subtle)] bg-[rgba(8,13,28,0.4)]',
      )}
      style={{
        padding: '16px 20px',
        border:  isCrit ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--color-border-subtle)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Top edge bar for critical */}
      {isCrit && (
        <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--color-status-crit)]"
          style={{ boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}
        />
      )}

      <div className="flex-1">
        {/* Label */}
        <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-disabled)] mb-2.5">
          {label}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5 mb-2">
          <span
            className={cn(
              'text-[28px] font-extrabold leading-none tracking-tight',
              isCrit ? 'text-[var(--color-status-crit)]' : 'text-white',
            )}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </span>
          <span className={cn(
            'text-[13px] font-bold',
            isCrit ? 'text-[var(--color-status-crit)]' : 'text-[var(--color-text-muted)]',
          )}>
            {unit}
          </span>
        </div>

        {/* Delta */}
        <div className={cn(
          'flex items-center gap-1.5 text-[10.5px] font-semibold',
          deltaUp ? 'text-[var(--color-status-ok)]' : 'text-[var(--color-status-warn)]',
        )}>
          <span className="w-1 h-1 rounded-full bg-current opacity-70" />
          {delta}
        </div>
      </div>

      {/* Sparkline */}
      <div className="pl-5 flex-shrink-0 flex items-center">
        <Sparkline data={sparkData} status={status} />
      </div>
    </div>
  );
}

// Layer switcher button
function LayerBtn({
  active, onClick, children, critical,
}: {
  active:    boolean;
  onClick:   () => void;
  children:  React.ReactNode;
  critical?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold tracking-wide transition-all duration-200 whitespace-nowrap',
        active
          ? critical
            ? 'bg-[var(--color-status-crit)] text-white'
            : 'bg-[var(--color-brand-primary)] text-[#030712] font-extrabold'
          : cn(
              'text-[var(--color-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]',
              critical && 'hover:text-[var(--color-status-crit)]',
            ),
      )}
      style={
        active && !critical
          ? { boxShadow: '0 2px 12px rgba(56,189,248,0.3)' }
          : active && critical
          ? { boxShadow: '0 2px 12px rgba(239,68,68,0.3)' }
          : {}
      }
    >
      {children}
    </button>
  );
}
