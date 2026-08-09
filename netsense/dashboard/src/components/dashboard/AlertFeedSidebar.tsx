import { useState } from 'react';
import { Check, ArrowRight, Bell, CheckCircle2 } from 'lucide-react';
import { StatusDot } from '../primitives/StatusDot';
import { cn } from '../../lib/utils';

export interface AlertFeedItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  text: string;
  device: string;
  ip: string;
  time: string;
  acked: boolean;
}

export function AlertFeedSidebar({ alerts = [] }: { alerts?: AlertFeedItem[] }) {
  const newCount = alerts.filter(alert => !alert.acked).length;
  return (
    <div
      className="w-[310px] h-full flex flex-col overflow-hidden"
      style={{
        background:     'rgba(5,9,20,0.62)',
        backdropFilter: 'blur(24px)',
        borderLeft:     '1px solid var(--color-border-subtle)',
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5"
        style={{ height: 56, borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <Bell className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
          <h2 className="text-[12px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.14em]">Alert Feed</h2>
        </div>
        <span className="rounded-full border border-[var(--color-border-default)] px-2 py-0.5 text-[9px] font-extrabold text-[var(--color-text-muted)]">
          {newCount} NEW
        </span>
      </div>

      {/* Feed list */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {alerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} />
        ))}

        {alerts.length === 0 && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            <h3 className="mt-3 text-sm font-bold text-[var(--color-text-primary)]">No active alerts</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              The validated synthetic scenario is healthy. Alerts will appear here when supported observations require attention.
            </p>
          </div>
        )}

        {/* Load more */}
        {alerts.length > 0 && <div className="pt-1">
          <button
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold text-[var(--color-brand-primary)] hover:text-[var(--color-text-primary)] transition-all duration-150"
            style={{
              background: 'rgba(56,189,248,0.03)',
              border:     '1px dashed rgba(56,189,248,0.2)',
            }}
          >
            Explore All Alerts <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>}
      </div>
    </div>
  );
}

// ── AlertCard ──────────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: AlertFeedItem }) {
  const [acked, setAcked] = useState(alert.acked);
  const isCrit    = alert.severity === 'critical';
  const isWarning = alert.severity === 'warning';

  const accentColor = isCrit ? '#EF4444' : isWarning ? '#F59E0B' : '#38bdf8';

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden transition-all duration-300 group',
        acked
          ? 'opacity-55 hover:opacity-85'
          : '',
      )}
      style={{
        background:  acked
          ? 'rgba(3,7,18,0.3)'
          : `rgba(${isCrit ? '239,68,68' : isWarning ? '245,158,11' : '56,189,248'}, 0.03)`,
        border: acked
          ? '1px solid var(--color-border-subtle)'
          : `1px solid rgba(${isCrit ? '239,68,68' : isWarning ? '245,158,11' : '56,189,248'}, 0.2)`,
        padding: '14px 14px 14px 18px',
      }}
    >
      {/* Severity accent bar */}
      {!acked && (
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
          style={{
            background: accentColor,
            boxShadow:  `0 0 7px ${accentColor}`,
          }}
        />
      )}

      <div className="flex gap-2.5 items-start">
        <StatusDot
          status={alert.severity === 'info' ? 'learning' : alert.severity}
          className="mt-0.5 flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span
              className="text-[9px] font-extrabold uppercase tracking-widest"
              style={{ color: accentColor }}
            >
              {alert.severity}
            </span>
            <span className="text-[9.5px] font-medium text-[var(--color-text-disabled)] whitespace-nowrap">
              {alert.time}
            </span>
          </div>

          {/* Message */}
          <div className="text-[12px] font-semibold text-[var(--color-text-primary)] leading-snug mb-2">
            {alert.text}
          </div>

          {/* Device chip */}
          <div
            className="inline-flex items-center text-[10px] font-mono text-[var(--color-text-secondary)] px-2 py-0.5 rounded-[5px]"
            style={{ background: 'rgba(3,7,18,0.45)', border: '1px solid rgba(255,255,255,0.03)' }}
          >
            {alert.device} · {alert.ip}
          </div>

          {/* Acknowledge action — appears on hover */}
          {!acked && (
            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => setAcked(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10.5px] font-bold text-[var(--color-text-primary)] transition-all duration-150"
                style={{
                  background: 'rgba(56,189,248,0.06)',
                  border:     '1px solid rgba(56,189,248,0.2)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.14)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#38bdf8';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.2)';
                }}
              >
                <Check className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                Acknowledge
              </button>
            </div>
          )}
          {acked && (
            <div className="mt-2 text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-text-disabled)]">
              ✓ Acknowledged
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
