import type { KnowledgeKind } from '../../features/topology/domain/types';
import { cn } from '../../lib/utils';

const CONFIG: Record<KnowledgeKind, { label: string; marker: string; color: string }> = {
  observed: { label: 'Observed', marker: '●', color: 'var(--color-knowledge-observed)' },
  configured: { label: 'Configured', marker: '◇', color: 'var(--color-knowledge-configured)' },
  derived: { label: 'Derived', marker: '=', color: 'var(--color-knowledge-derived)' },
  inferred: { label: 'Inferred', marker: '∴', color: 'var(--color-knowledge-inferred)' },
  predicted: { label: 'Predicted', marker: '↗', color: 'var(--color-knowledge-predicted)' },
  unknown: { label: 'Unknown', marker: '?', color: 'var(--color-knowledge-unknown)' },
};

export function EvidenceBadge({
  kind,
  className,
}: {
  kind: KnowledgeKind;
  className?: string;
}) {
  const config = CONFIG[kind];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[11px]', className)}
      style={{ color: config.color, borderColor: `color-mix(in srgb, ${config.color} 45%, transparent)` }}
    >
      <span aria-hidden="true">{config.marker}</span>
      {config.label}
    </span>
  );
}
