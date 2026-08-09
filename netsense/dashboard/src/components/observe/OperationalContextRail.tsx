import { X } from 'lucide-react';
import type { TopologySnapshot } from '../../features/topology/domain/types';
import type { SituationSummary } from '../../features/topology/state/selectors';

function ContextSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--color-border-subtle)] px-4 py-4 last:border-b-0">
      <h2 className="text-[12px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CountRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-[12px]">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium text-[var(--color-text-secondary)]">{value}</span>
    </div>
  );
}

export function OperationalContextRail({
  snapshot,
  summary,
  onClose,
}: {
  snapshot: TopologySnapshot;
  summary: SituationSummary;
  onClose: () => void;
}) {
  const sourceTypes = [...new Set(snapshot.evidence.map(record => record.sourceType))];

  return (
    <aside
      aria-label="Operational context"
      className="flex h-full w-[292px] flex-none flex-col overflow-hidden border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
    >
      <div className="flex h-11 flex-none items-center justify-between border-b border-[var(--color-border-subtle)] px-4">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Operational context</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close operational context"
          className="flex h-7 w-7 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ContextSection title="Monitoring visibility">
          <CountRow label="Full" value={snapshot.coverageSummary.full} />
          <CountRow label="Partial" value={snapshot.coverageSummary.partial} />
          <CountRow label="Not observed" value={snapshot.coverageSummary.none} />
          <CountRow label="Unsupported" value={snapshot.coverageSummary.unsupported} />
          <p className="mt-3 border-l-2 border-[var(--color-status-unknown)] pl-3 text-[12px] leading-5 text-[var(--color-text-muted)]">
            {summary.visibilityPercent === 100
              ? 'Every entity has full or partial monitoring. Partial visibility is not equivalent to complete evidence.'
              : 'Unobserved or unsupported entities limit the conclusions NetSense can make.'}
          </p>
        </ContextSection>

        <ContextSection title="Evidence basis">
          <CountRow label="Evidence records" value={snapshot.evidence.length} />
          <CountRow label="Source types" value={sourceTypes.join(', ') || 'None'} />
          <CountRow label="Assessment" value={summary.evidenceLabel} />
          <p className="mt-3 text-[12px] leading-5 text-[var(--color-text-muted)]">
            Exact observation time: <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">{snapshot.observedAt}</span>
          </p>
        </ContextSection>

        <ContextSection title="Current scope">
          <CountRow label="Organisation" value={snapshot.organisation.name} />
          <CountRow label="Site" value={snapshot.site.name} />
          <CountRow label="Entities" value={snapshot.nodes.length} />
          <CountRow label="Relationships" value={snapshot.relationships.length} />
        </ContextSection>

        {snapshot.synthetic && (
          <ContextSection title="Data provenance">
            <p className="text-[12px] leading-5 text-[var(--color-text-muted)]">
              {snapshot.syntheticDataNotice}
            </p>
          </ContextSection>
        )}
      </div>
    </aside>
  );
}
