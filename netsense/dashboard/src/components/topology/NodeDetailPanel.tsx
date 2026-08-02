import { Activity, Eye, Lock, Network, ShieldCheck, X } from 'lucide-react';
import type { TopologyNode } from '../../features/topology/domain/types';
import { operationalCriticalityLabel } from '../../features/topology/domain/criticality';
import { StatusDot } from '../primitives/StatusDot';

interface NodeDetailPanelProps {
  node: TopologyNode | undefined;
  onClose: () => void;
}

function statusForNode(node: TopologyNode): 'ok' | 'warning' | 'critical' | 'unknown' {
  switch (node.assessment.operationalHealth) {
    case 'healthy': return 'ok';
    case 'degraded': return 'warning';
    case 'unreachable': return 'critical';
    case 'unknown': return 'unknown';
  }
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-white/[0.035] px-4 py-3 last:border-b-0">
      <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-text-disabled)]">{label}</span>
      <span className={mono ? 'text-right font-mono text-[11px] text-cyan-300' : 'text-right text-[11.5px] font-medium text-[var(--color-text-secondary)]'}>
        {value}
      </span>
    </div>
  );
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) return null;
  const status = statusForNode(node);
  const primaryAddress = node.identifiers.ipAddresses[0] ?? 'No observed address';

  return (
    <aside
      aria-label={`${node.displayName} details`}
      className="flex h-full w-[420px] flex-col overflow-hidden border-l border-[var(--color-border-subtle)] bg-[#080D18]/95 shadow-2xl"
    >
      <div className="border-b border-[var(--color-border-subtle)] px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <StatusDot status={status} size="lg" />
            <div>
              <h2 className="text-[16px] font-bold text-white">{node.displayName}</h2>
              <div className="mt-1 font-mono text-[10.5px] text-cyan-300">{primaryAddress}</div>
              <div className="mt-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                {node.role.replace(/_/g, ' ')} · synthetic scenario
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close device details" className="rounded-md p-2 text-slate-500 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <Activity className="h-3.5 w-3.5 text-cyan-400" /> Assessment
          </h3>
          <div className="overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-black/10">
            <DetailRow label="Health" value={node.assessment.operationalHealth} />
            <DetailRow label="Freshness" value={node.assessment.freshness} />
            <DetailRow label="Coverage" value={node.assessment.coverage} />
            <DetailRow label="Management" value={node.assessment.managementState.replace(/_/g, ' ')} />
            <DetailRow label="Confidence" value={`${Math.round(node.assessment.confidence * 100)}%`} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Operational importance
          </h3>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-black/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {operationalCriticalityLabel(node.operationalCriticality)}
              </span>
              <span className="font-mono text-xs text-cyan-300">{node.operationalCriticality}/5</span>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-slate-500">
              Operational criticality is independent of current health, severity, coverage and evidence confidence.
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <Network className="h-3.5 w-3.5 text-cyan-400" /> Identity
          </h3>
          <div className="overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-black/10">
            <DetailRow label="Stable ID" value={node.id} mono />
            <DetailRow label="Hostname" value={node.identifiers.hostnames[0] ?? 'Not observed'} mono />
            <DetailRow label="Lifecycle" value={node.lifecycleState} />
            <DetailRow label="Tags" value={node.tags.join(', ') || 'None'} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <Eye className="h-3.5 w-3.5 text-cyan-400" /> Evidence
          </h3>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-black/10 p-4 text-[11px] leading-relaxed text-slate-400">
            {node.evidenceIds.length} evidence record{node.evidenceIds.length === 1 ? '' : 's'} support this entity.
            Last assessment: <span className="font-mono text-slate-300">{node.assessment.assessedAt}</span>.
          </div>
        </section>

        {node.assessment.managementState === 'passive_only' && (
          <div className="flex gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
            <Lock className="mt-0.5 h-4 w-4 flex-none text-cyan-300" />
            <p className="text-[11px] leading-relaxed text-slate-300">
              Passive-only monitoring. NetSense has not actively queried this OT entity.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
