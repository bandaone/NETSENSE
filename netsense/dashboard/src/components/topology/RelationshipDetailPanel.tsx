import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { resolveEndpointNodeId } from '../../features/topology/domain/graph';
import type { TopologyRelationship, TopologySnapshot } from '../../features/topology/domain/types';
import { EvidenceBadge } from '../primitives/EvidenceBadge';

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[106px_minmax(0,1fr)] gap-4 border-b border-[var(--color-border-subtle)] py-2.5 last:border-b-0">
      <dt className="text-[11px] text-[var(--color-text-muted)]">{label}</dt>
      <dd className={mono
        ? 'break-all text-right font-mono text-[10px] text-[var(--color-text-secondary)]'
        : 'text-right text-[12px] text-[var(--color-text-secondary)]'}>
        {value}
      </dd>
    </div>
  );
}

export function RelationshipDetailPanel({
  relationship,
  snapshot,
  onClose,
}: {
  relationship: TopologyRelationship;
  snapshot: TopologySnapshot;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => panelRef.current?.focus(), [relationship.id]);

  const context = useMemo(() => {
    const sourceId = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
    const targetId = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
    const source = snapshot.nodes.find(node => node.id === sourceId);
    const target = snapshot.nodes.find(node => node.id === targetId);
    const sourceInterface = snapshot.interfaces.find(item => item.id === relationship.source.interfaceId);
    const targetInterface = snapshot.interfaces.find(item => item.id === relationship.target.interfaceId);
    const evidence = snapshot.evidence.filter(record => relationship.evidenceIds.includes(record.id));
    return { source, target, sourceInterface, targetInterface, evidence };
  }, [relationship, snapshot]);

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-label={`${humanize(relationship.relationshipType)} relationship details`}
      className="flex h-full w-[390px] flex-none flex-col overflow-hidden border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] outline-none"
    >
      <header className="flex-none border-b border-[var(--color-border-default)] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <EvidenceBadge kind={relationship.knowledgeKind} />
              <span className="text-[11px] text-[var(--color-text-muted)]">{humanize(relationship.status)}</span>
            </div>
            <h2 className="mt-3 text-[16px] font-semibold capitalize text-[var(--color-text-primary)]">
              {humanize(relationship.relationshipType)}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {context.source?.displayName ?? 'Unresolved source'} → {context.target?.displayName ?? 'Unresolved target'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close relationship inspector"
            className="flex h-8 w-8 flex-none items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Relationship meaning</h3>
          <dl className="mt-2">
            <Row label="Source" value={context.source?.displayName ?? 'Unresolved'} />
            <Row label="Source interface" value={context.sourceInterface?.name ?? 'Not identified'} mono />
            <Row label="Target" value={context.target?.displayName ?? 'Unresolved'} />
            <Row label="Target interface" value={context.targetInterface?.name ?? 'Not identified'} mono />
            <Row label="Direction" value={humanize(relationship.directionality)} />
            <Row label="Confidence" value={`${Math.round(relationship.confidence * 100)}% evidence confidence`} />
          </dl>
        </section>

        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Observation window</h3>
          <dl className="mt-2">
            <Row label="First observed" value={relationship.firstObservedAt} mono />
            <Row label="Last observed" value={relationship.lastObservedAt} mono />
            <Row label="Expires" value={relationship.expiresAt ?? 'No expiry recorded'} mono />
          </dl>
        </section>

        <section className="px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Evidence and limitations</h3>
          {context.evidence.length === 0 ? (
            <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">No evidence record resolves for this relationship.</p>
          ) : context.evidence.map(record => (
            <div key={record.id} className="mt-3 border-l-2 border-[var(--color-border-default)] pl-3">
              <div className="text-[12px] text-[var(--color-text-secondary)]">{record.summary}</div>
              <div className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">{record.observedAt}</div>
              {record.limitations.map(limitation => (
                <p key={limitation} className="mt-2 text-[11px] leading-4 text-[var(--color-text-muted)]">{limitation}</p>
              ))}
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
}
