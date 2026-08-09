import { useEffect, useMemo, useRef } from 'react';
import { Lock, X } from 'lucide-react';
import { operationalCriticalityLabel } from '../../features/topology/domain/criticality';
import type { TopologyNode, TopologyRelationship, TopologySnapshot } from '../../features/topology/domain/types';
import { RELATIONSHIP_GRAMMAR } from '../../features/topology/rendering/visualGrammar';

interface NodeDetailPanelProps {
  node: TopologyNode | undefined;
  snapshot: TopologySnapshot;
  onClose: () => void;
}

const HEALTH_MARKER: Record<TopologyNode['assessment']['operationalHealth'], string> = {
  healthy: '✓',
  degraded: '△',
  unreachable: '×',
  unknown: '?',
};

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.55) return 'Moderate';
  return 'Low';
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-[var(--color-border-subtle)] py-2.5 last:border-b-0">
      <dt className="text-[12px] text-[var(--color-text-muted)]">{label}</dt>
      <dd className={mono
        ? 'break-all text-right font-mono text-[11px] text-[var(--color-text-secondary)]'
        : 'text-right text-[12px] text-[var(--color-text-secondary)]'}>
        {value}
      </dd>
    </div>
  );
}

function endpointNodeId(
  endpoint: TopologyRelationship['source'],
  snapshot: TopologySnapshot,
): string | undefined {
  if (endpoint.nodeId) return endpoint.nodeId;
  if (!endpoint.interfaceId) return undefined;
  return snapshot.interfaces.find(networkInterface => networkInterface.id === endpoint.interfaceId)?.deviceId;
}

export function NodeDetailPanel({ node, snapshot, onClose }: NodeDetailPanelProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (node) panelRef.current?.focus();
  }, [node]);

  const context = useMemo(() => {
    if (!node) return undefined;
    const parent = node.parentId
      ? snapshot.nodes.find(candidate => candidate.id === node.parentId)
      : undefined;
    const relationships = snapshot.relationships.flatMap(relationship => {
      const sourceId = endpointNodeId(relationship.source, snapshot);
      const targetId = endpointNodeId(relationship.target, snapshot);
      if (sourceId !== node.id && targetId !== node.id) return [];
      const relatedId = sourceId === node.id ? targetId : sourceId;
      const related = snapshot.nodes.find(candidate => candidate.id === relatedId);
      return [{ relationship, related }];
    });
    const evidence = snapshot.evidence.filter(record => node.evidenceIds.includes(record.id));
    const interfaces = snapshot.interfaces.filter(networkInterface => networkInterface.deviceId === node.id);
    return { parent, relationships, evidence, interfaces };
  }, [node, snapshot]);

  if (!node || !context) return null;

  const primaryAddress = node.identifiers.ipAddresses[0] ?? 'Not observed';
  const confidence = confidenceLabel(node.assessment.confidence);

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-label={`${node.displayName} operational details`}
      className="flex h-full w-[390px] flex-none flex-col overflow-hidden border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] outline-none"
    >
      <div className="flex-none border-b border-[var(--color-border-default)] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
              <span style={{ color: node.assessment.operationalHealth === 'healthy' ? 'var(--color-status-ok)' : undefined }} aria-hidden="true">
                {HEALTH_MARKER[node.assessment.operationalHealth]}
              </span>
              <span>{humanize(node.assessment.operationalHealth)}</span>
              <span aria-hidden="true">·</span>
              <span>{humanize(node.assessment.freshness)} evidence</span>
            </div>
            <h2 className="mt-2 truncate text-[17px] font-semibold text-[var(--color-text-primary)]">{node.displayName}</h2>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{humanize(node.role)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close entity inspector"
            className="flex h-8 w-8 flex-none items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Organisational context</h3>
          <dl className="mt-2">
            <DetailRow label="Location or group" value={context.parent?.displayName ?? 'Top level'} />
            <DetailRow label="Role" value={humanize(node.role)} />
            <DetailRow
              label="Importance"
              value={`${operationalCriticalityLabel(node.operationalCriticality)} · ${node.operationalCriticality}/5`}
            />
            <DetailRow label="Lifecycle" value={humanize(node.lifecycleState)} />
          </dl>
          <p className="mt-3 text-[11px] leading-4 text-[var(--color-text-muted)]">
            Operational importance is independent of current health and incident severity.
          </p>
        </section>

        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Current assessment</h3>
          <dl className="mt-2">
            <DetailRow label="Health" value={humanize(node.assessment.operationalHealth)} />
            <DetailRow label="Evidence freshness" value={humanize(node.assessment.freshness)} />
            <DetailRow label="Monitoring visibility" value={humanize(node.assessment.coverage)} />
            <DetailRow label="Management policy" value={humanize(node.assessment.managementState)} />
            <DetailRow label="Confidence" value={confidence} />
          </dl>
          <div className="mt-3 border-l-2 border-[var(--color-border-strong)] pl-3 text-[11px] leading-4 text-[var(--color-text-muted)]">
            <div className="font-medium text-[var(--color-text-secondary)]">Supports this assessment</div>
            <div className="mt-1">{context.evidence.length} linked evidence record{context.evidence.length === 1 ? '' : 's'}.</div>
            <div>{humanize(node.assessment.freshness)} evidence with {humanize(node.assessment.coverage)} monitoring visibility.</div>
          </div>
        </section>

        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Connected context</h3>
          {context.relationships.length === 0 ? (
            <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">No supported relationships are present in this snapshot.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--color-border-subtle)]">
              {context.relationships.slice(0, 8).map(({ relationship, related }) => (
                <li key={relationship.id} className="flex items-center justify-between gap-4 py-2.5 text-[12px]">
                  <span className="text-[var(--color-text-muted)]">{RELATIONSHIP_GRAMMAR[relationship.relationshipType].label}</span>
                  <span className="text-right text-[var(--color-text-secondary)]">{related?.displayName ?? 'Unresolved endpoint'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {node.assessment.managementState === 'passive_only' && (
          <section className="flex gap-3 border-b border-[var(--color-border-subtle)] px-5 py-4">
            <Lock className="mt-0.5 h-4 w-4 flex-none text-[var(--color-text-secondary)]" aria-hidden="true" />
            <div>
              <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Passive-only monitoring</h3>
              <p className="mt-1 text-[11px] leading-4 text-[var(--color-text-muted)]">
                NetSense has not actively queried this entity. Partial passive visibility must not be interpreted as complete evidence.
              </p>
            </div>
          </section>
        )}

        <details className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <summary className="text-[12px] font-semibold text-[var(--color-text-primary)]">Technical identity and interfaces</summary>
          <dl className="mt-3">
            <DetailRow label="Primary address" value={primaryAddress} mono />
            <DetailRow label="Hostname" value={node.identifiers.hostnames[0] ?? 'Not observed'} mono />
            <DetailRow label="Stable ID" value={node.id} mono />
            <DetailRow label="Interfaces" value={String(context.interfaces.length)} />
            <DetailRow label="Tags" value={node.tags.join(', ') || 'None'} />
          </dl>
        </details>

        <details className="px-5 py-4">
          <summary className="text-[12px] font-semibold text-[var(--color-text-primary)]">Evidence details and limitations</summary>
          <div className="mt-3 space-y-4">
            {context.evidence.map(record => (
              <div key={record.id} className="border-l-2 border-[var(--color-border-default)] pl-3">
                <div className="text-[12px] font-medium text-[var(--color-text-secondary)]">{humanize(record.sourceType)} evidence</div>
                <p className="mt-1 text-[11px] leading-4 text-[var(--color-text-muted)]">{record.summary}</p>
                <div className="mt-2 font-mono text-[10px] text-[var(--color-text-muted)]">{record.observedAt}</div>
                {record.limitations.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-4 text-[var(--color-text-muted)]">
                    {record.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </details>
      </div>
    </aside>
  );
}
