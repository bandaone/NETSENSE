import React from 'react';
import { X, ExternalLink, Activity, Info, Layers, AlertTriangle } from 'lucide-react';
import { StatusDot } from '../primitives/StatusDot';
import { cn } from '../../lib/utils';

interface NodeDetailPanelProps {
  nodeId:  string | null;
  onClose: () => void;
}

export function NodeDetailPanel({ nodeId, onClose }: NodeDetailPanelProps) {
  if (!nodeId) return null;

  // Derive mock data from ID
  const isCritical = nodeId.includes('dist-2') || nodeId.includes('plc');
  const type = nodeId.includes('plc')  ? 'PLC Controller'
             : nodeId.includes('dist') ? 'Distribution Switch'
             : nodeId.includes('fw')   ? 'Firewall'
             : 'Network Device';
  const name = nodeId === 'dist-2' ? 'Dist-02 (Plant Floor)' : nodeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const ip   = '192.168.1.12';
  const status: 'ok' | 'critical' = isCritical ? 'critical' : 'ok';

  return (
    <div
      className="w-[400px] h-full flex flex-col overflow-hidden"
      style={{
        background:     'rgba(5,9,20,0.72)',
        backdropFilter: 'blur(28px)',
        borderLeft:     '1px solid var(--color-border-subtle)',
        boxShadow:      '-12px 0 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-5 py-5"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusDot status={status} size="lg" pulse={isCritical} />
            <div>
              <h2 className="text-[16px] font-bold text-white tracking-tight leading-tight mb-1.5">
                {name}
              </h2>
              <div
                className="inline-flex items-center text-[10.5px] font-mono text-[var(--color-brand-primary)] px-2 py-0.5 rounded-[5px]"
                style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.15)' }}
              >
                {ip}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-default)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tag badges */}
        <div className="flex flex-wrap gap-1.5">
          <Tag>{type}</Tag>
          <Tag>VLAN 10</Tag>
          <Tag
            className="text-[var(--color-status-ok)]"
            style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}
          >
            100% Calibrated
          </Tag>
          {isCritical && (
            <Tag
              className="text-[var(--color-status-crit)]"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <AlertTriangle className="w-2.5 h-2.5 inline mr-1" />
              Incident Active
            </Tag>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6" style={{ scrollbarWidth: 'none' }}>

        {/* Hardware registry */}
        <section>
          <SectionTitle icon={<Info className="w-3.5 h-3.5" />}>Hardware Registry</SectionTitle>
          <div
            className="rounded-xl space-y-0 overflow-hidden"
            style={{ background: 'rgba(3,7,18,0.4)', border: '1px solid var(--color-border-subtle)' }}
          >
            {[
              { label: 'MAC ADDRESS',      value: '00:1B:44:11:3A:B7', mono: true   },
              { label: 'VENDOR',           value: 'Cisco Systems Industrial'         },
              { label: 'OS VERSION',       value: 'IOS XE v17.3.4',    mono: true   },
              { label: 'FIRST SEEN',       value: '1 March 2026'                    },
              { label: 'LAST ACTIVE',      value: 'Just now (Passive)'              },
            ].map(({ label, value, mono }, idx, arr) => (
              <div
                key={label}
                className="flex justify-between items-center px-4 py-3 text-[11.5px]"
                style={idx < arr.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.03)' } : {}}
              >
                <span className="text-[var(--color-text-disabled)] font-bold text-[9.5px] tracking-wider uppercase">
                  {label}
                </span>
                <span className={cn(
                  'text-[var(--color-text-secondary)] font-medium',
                  mono && 'font-mono text-[var(--color-brand-primary)] text-[11px]',
                )}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Sensor metrics */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={<Activity className="w-3.5 h-3.5" />} className="mb-0">
              Live Sensor Metrics
            </SectionTitle>
            <button className="flex items-center gap-1 text-[10.5px] font-bold text-[var(--color-brand-primary)] hover:text-white transition-colors">
              Full Analyzer <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            <MetricCard label="Response Latency" value={isCritical ? 'TIMEOUT' : '14ms'} status={isCritical ? 'critical' : 'ok'} />
            <MetricCard label="CPU Core Load"    value={isCritical ? '—'       : '23%'}  status={isCritical ? 'unknown'  : 'ok'} />
            <MetricCard label="Active Ports"     value="42 / 48"                          status="ok" />
          </div>
        </section>

        {/* Topology position */}
        <section>
          <SectionTitle icon={<Layers className="w-3.5 h-3.5" />}>Network Position</SectionTitle>
          <div
            className="rounded-xl px-4 py-3.5 space-y-2.5"
            style={{ background: 'rgba(3,7,18,0.4)', border: '1px solid var(--color-border-subtle)' }}
          >
            {[
              { label: 'LAYER',      value: 'Distribution (L2)' },
              { label: 'SITE ZONE',  value: 'Plant Floor East'  },
              { label: 'UPSTREAM',   value: 'Core-01 (MPLS)'    },
              { label: 'DOWNSTREAM', value: '14 endpoints'      },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-[11.5px]">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-text-disabled)]">{label}</span>
                <span className="text-[var(--color-text-secondary)] font-medium">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer actions ── */}
      <div
        className="flex-shrink-0 flex gap-2.5 p-4"
        style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'rgba(3,7,18,0.25)' }}
      >
        <button
          className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)]"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border-default)' }}
        >
          Device Config
        </button>
        <button
          className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-[#030712] transition-all duration-150 hover:scale-[1.02]"
          style={{
            background: 'var(--color-brand-primary)',
            border:     '1px solid rgba(255,255,255,0.12)',
            boxShadow:  '0 4px 20px rgba(56,189,248,0.3)',
          }}
        >
          Forensic Replay
        </button>
      </div>
    </div>
  );
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function Tag({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-[6px] text-[9.5px] font-extrabold uppercase tracking-widest text-[var(--color-text-secondary)]',
        className,
      )}
      style={{
        background:  'rgba(3,7,18,0.5)',
        border:      '1px solid var(--color-border-subtle)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function SectionTitle({ icon, children, className }: { icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn(
      'flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-3',
      className,
    )}>
      <span className="text-[var(--color-brand-primary)]">{icon}</span>
      {children}
    </h3>
  );
}

function MetricCard({ label, value, status }: { label: string; value: string; status: 'ok' | 'critical' | 'unknown' }) {
  const isCrit = status === 'critical';
  const bars   = Array.from({ length: 14 }, (_, i) => {
    const pct = isCrit && i > 9 ? 85 + i * 2 : Math.abs(Math.sin(i / 1.8) * 55 + 35);
    return Math.min(100, pct);
  });

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200"
      style={{
        background: isCrit
          ? 'rgba(239,68,68,0.04)'
          : 'rgba(3,7,18,0.35)',
        border: isCrit
          ? '1px solid rgba(239,68,68,0.2)'
          : '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="text-[11.5px] font-semibold text-[var(--color-text-secondary)]">{label}</div>

      <div className="flex items-center gap-3.5">
        {/* Bar sparkline */}
        <div className="flex items-end gap-[2px] h-6 w-14 opacity-70">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height:     `${h}%`,
                background: isCrit && i > 9
                  ? 'var(--color-status-crit)'
                  : status === 'ok' && i === 13
                  ? 'var(--color-status-ok)'
                  : 'var(--color-brand-primary)',
                opacity: isCrit && i > 9 ? 1 : 0.35,
              }}
            />
          ))}
        </div>

        {/* Value */}
        <span
          className="text-[13px] font-extrabold font-mono min-w-[56px] text-right"
          style={{ color: isCrit ? 'var(--color-status-crit)' : '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
