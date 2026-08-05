import type { SituationSummary } from '../../features/topology/state/selectors';
import { cn } from '../../lib/utils';

function SituationCell({
  label,
  value,
  detail,
  marker,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  marker?: string;
  tone?: 'neutral' | 'normal' | 'attention' | 'uncertain';
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 first:pl-5">
      {marker && (
        <span
          className={cn(
            'flex h-5 w-5 flex-none items-center justify-center border text-[11px] font-semibold',
            tone === 'normal' && 'border-[var(--color-status-ok)]/50 text-[var(--color-status-ok)]',
            tone === 'attention' && 'border-[var(--color-status-warn)]/60 text-[var(--color-status-warn)]',
            tone === 'uncertain' && 'border-[var(--color-status-unknown)]/60 text-[var(--color-status-unknown)]',
          )}
          aria-hidden="true"
        >
          {marker}
        </span>
      )}
      <div className="min-w-0">
        <div className="text-[11px] leading-none text-[var(--color-text-muted)]">{label}</div>
        <div className="mt-1 flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[13px] font-semibold text-white">{value}</span>
          <span className="hidden truncate text-[11px] text-[var(--color-text-muted)] xl:inline">{detail}</span>
        </div>
      </div>
    </div>
  );
}

export function SituationStrip({ summary }: { summary: SituationSummary }) {
  const marker = summary.environmentState === 'normal'
    ? '✓'
    : summary.environmentState === 'attention' ? '△' : '?';

  return (
    <section
      aria-label="Current situation"
      className="grid h-14 flex-none grid-cols-[1.25fr_1fr_1fr_0.85fr] divide-x divide-[var(--color-border-subtle)] border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
    >
      <SituationCell
        label="Environment"
        value={summary.environmentLabel}
        detail={summary.environmentDetail}
        marker={marker}
        tone={summary.environmentState}
      />
      <SituationCell
        label="Monitoring visibility"
        value={summary.visibilityLabel}
        detail={summary.visibilityDetail}
      />
      <SituationCell
        label="Evidence freshness"
        value={summary.evidenceLabel}
        detail={summary.evidenceDetail}
      />
      <SituationCell
        label="Operational importance"
        value={`${summary.importantEntityCount} mission-critical`}
        detail={summary.importantEntityDetail}
      />
    </section>
  );
}
