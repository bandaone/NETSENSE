import React, { useState } from 'react';
import { ACTIVE_INCIDENT } from '../../lib/mockData';
import { StatusDot } from '../primitives/StatusDot';
import {
  Clock, Crosshair, Cpu, Users, Layers,
  ExternalLink, CheckSquare, Square,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function IncidentPanel() {
  const inc = ACTIVE_INCIDENT;
  const [checklist, setChecklist] = useState(inc.checklist);

  const toggleCheck = (id: number) =>
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));

  const done     = checklist.filter(i => i.done).length;
  const progress = Math.round((done / checklist.length) * 100);

  return (
    <div
      className="w-[480px] h-full flex flex-col overflow-hidden"
      style={{
        background:     'rgba(5,9,20,0.72)',
        backdropFilter: 'blur(28px)',
        borderLeft:     '1px solid rgba(239,68,68,0.2)',
        boxShadow:      '-12px 0 48px rgba(239,68,68,0.05)',
      }}
    >
      {/* ── Critical header ──────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          padding:      '20px 24px',
          borderBottom: '1px solid rgba(239,68,68,0.18)',
          background:   'rgba(239,68,68,0.04)',
        }}
      >
        {/* Glow orb */}
        <div
          className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)' }}
        />

        <div className="relative z-10">
          {/* Badge row */}
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white px-2.5 py-1 rounded-md"
              style={{
                background: 'var(--color-status-crit)',
                boxShadow:  '0 0 12px rgba(239,68,68,0.4)',
                border:     '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <StatusDot status="critical" pulse />
              Critical Response
            </span>

            <span
              className="ml-auto text-[11px] font-mono font-bold text-[var(--color-status-crit)] px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {inc.id}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-[17px] font-extrabold text-white leading-snug mb-3 tracking-tight">
            {inc.description}
          </h2>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-[11.5px] font-semibold text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              Started 8 min ago
            </div>
            <span className="w-1 h-1 rounded-full bg-[var(--color-border-default)]" />
            <div className="flex items-center gap-1.5 text-[var(--color-status-learning)] font-mono font-bold">
              <Crosshair className="w-3.5 h-3.5" />
              89% Confidence
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-5 py-5" style={{ scrollbarWidth: 'none' }}>

        {/* Blast radius */}
        <div className="px-5">
          <SectionLabel>Blast Radius</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5">
            <BlastStat label="Isolated"  value={inc.blastRadius.devicesTotal} icon={<Layers className="w-3.5 h-3.5" />} />
            <BlastStat label="PLCs Down" value={inc.blastRadius.plcs}         icon={<Cpu    className="w-3.5 h-3.5" />} critical />
            <BlastStat label="Operators" value={inc.blastRadius.operators}    icon={<Users  className="w-3.5 h-3.5" />} />
          </div>
        </div>

        {/* Runbook checklist */}
        <div className="px-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel className="mb-0">Runbook Checklist</SectionLabel>
            <div className="flex items-center gap-2.5">
              {/* Progress bar */}
              <div className="w-16 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width:      `${progress}%`,
                    background: progress === 100 ? 'var(--color-status-ok)' : 'var(--color-brand-primary)',
                    boxShadow:  progress === 100 ? '0 0 6px rgba(16,185,129,0.4)' : '0 0 6px rgba(56,189,248,0.3)',
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono font-bold text-[var(--color-brand-primary)] px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}
              >
                {done}/{checklist.length}
              </span>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(3,7,18,0.3)', border: '1px solid var(--color-border-subtle)' }}
          >
            {checklist.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-150 hover:bg-[rgba(255,255,255,0.025)] group"
                style={idx < checklist.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.03)' } : {}}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {item.done
                    ? <CheckSquare className="w-4.5 h-4.5 text-[var(--color-status-ok)]" style={{ width: 18, height: 18 }} />
                    : <Square     className="w-4.5 h-4.5 text-[var(--color-text-disabled)] group-hover:text-[var(--color-text-secondary)] transition-colors" style={{ width: 18, height: 18 }} />
                  }
                </div>
                <span className={cn(
                  'text-[12.5px] font-semibold leading-snug transition-all',
                  item.done ? 'text-[var(--color-text-disabled)] line-through' : 'text-white',
                )}>
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="px-5">
          <SectionLabel>Event Timeline</SectionLabel>
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[rgba(239,68,68,0.2)]" />
            {inc.timeline.map((event, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 border-2"
                  style={{
                    borderColor:     'var(--color-status-crit)',
                    backgroundColor: i === 0 ? 'var(--color-status-crit)' : 'rgba(5,9,20,0.9)',
                    boxShadow:       i === 0 ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] mb-0.5">{event.time}</div>
                  <div className="text-[11.5px] font-medium text-[var(--color-text-secondary)] leading-snug">{event.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Similar past incident */}
        <div className="px-5">
          <SectionLabel>Incident Memory</SectionLabel>
          <div
            className="rounded-xl p-4 relative overflow-hidden"
            style={{ background: 'rgba(3,7,18,0.4)', border: '1px solid var(--color-border-subtle)' }}
          >
            <div
              className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none opacity-40"
              style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[12.5px] font-bold text-white">{inc.similarPast.date}</span>
                <span
                  className="text-[9.5px] font-mono font-bold text-[var(--color-status-ok)] px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  Resolved · {inc.similarPast.duration}
                </span>
              </div>
              <p className="text-[11.5px] text-[var(--color-text-secondary)] leading-relaxed mb-3">
                <span className="font-bold text-white">Root Cause: </span>
                {inc.similarPast.rootCause}
              </p>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-[10.5px] font-semibold text-[var(--color-text-muted)]">
                  Resolved by {inc.similarPast.resolvedBy}
                </span>
                <button className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-brand-primary)] hover:text-white transition-colors">
                  Audit Log <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Footer CTA ──────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 p-4 flex gap-2.5"
        style={{ borderTop: '1px solid rgba(239,68,68,0.15)', background: 'rgba(3,7,18,0.35)' }}
      >
        <button
          className="flex-shrink-0 px-4 py-2.5 rounded-xl text-[12px] font-bold text-[var(--color-text-secondary)] hover:text-white transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]"
          style={{ border: '1px solid var(--color-border-default)' }}
        >
          Suppress
        </button>
        <button
          className="flex-1 py-2.5 rounded-xl text-[12px] font-extrabold uppercase tracking-wider text-white transition-all duration-150 hover:scale-[1.01]"
          style={{
            background: 'var(--color-status-crit)',
            border:     '1px solid rgba(255,255,255,0.12)',
            boxShadow:  '0 4px 24px rgba(239,68,68,0.35)',
          }}
        >
          Acknowledge &amp; Escalate
        </button>
      </div>
    </div>
  );
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn(
      'text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-text-disabled)] mb-3',
      className,
    )}>
      {children}
    </h3>
  );
}

function BlastStat({ label, value, icon, critical }: { label: string; value: number; icon: React.ReactNode; critical?: boolean }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: critical ? 'rgba(239,68,68,0.05)' : 'rgba(3,7,18,0.3)',
        border:     critical ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--color-border-subtle)',
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest mb-2"
        style={{ color: critical ? 'var(--color-status-crit)' : 'var(--color-text-muted)' }}
      >
        {icon} {label}
      </div>
      <div
        className="text-[26px] font-extrabold leading-none font-mono"
        style={{
          color: critical ? 'var(--color-status-crit)' : '#f1f5f9',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}
