import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Activity, Eye, Layers3, ShieldCheck } from 'lucide-react';
import { AlertFeedSidebar } from '../../components/dashboard/AlertFeedSidebar';
import { NodeDetailPanel } from '../../components/topology/NodeDetailPanel';
import { TopologyMap } from '../../components/topology/TopologyMap';
import { TopologyDataBoundary } from '../../features/topology/components/TopologyDataBoundary';
import type { TopologyNode, TopologySnapshot } from '../../features/topology/domain/types';
import type { LayoutProfile } from '../../features/topology/layout/types';
import {
  projectSnapshotToCytoscape,
  type AtlasCytoscapeNodeData,
} from '../../features/topology/rendering/cytoscapeAdapter';
import { selectTopologySummary } from '../../features/topology/state/selectors';

interface StatTileProps {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: 'normal' | 'healthy';
}

function StatTile({ label, value, detail, icon, tone = 'normal' }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[#090E19]/80 px-4 py-3">
      <div className={tone === 'healthy' ? 'text-emerald-400' : 'text-cyan-400'}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-disabled)]">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[22px] font-extrabold leading-none text-white">{value}</span>
          <span className="truncate text-[10px] text-[var(--color-text-muted)]">{detail}</span>
        </div>
      </div>
    </div>
  );
}

function AtlasOperationsWorkspace({ snapshot, layout }: { snapshot: TopologySnapshot; layout: LayoutProfile | undefined }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const elements = useMemo(
    () => projectSnapshotToCytoscape(snapshot, layout),
    [snapshot, layout],
  );
  const summary = useMemo(() => selectTopologySummary(snapshot), [snapshot]);
  const selectedNode = useMemo<TopologyNode | undefined>(
    () => snapshot.nodes.find(node => node.id === selectedNodeId),
    [selectedNodeId, snapshot.nodes],
  );
  const handleNodeClick = useCallback((node: AtlasCytoscapeNodeData) => {
    setSelectedNodeId(node.id);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-bg-base)]">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[#060A12] px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300">
            <Layers3 className="h-3.5 w-3.5" /> Operations lens
          </span>
          <span className="text-[10.5px] text-[var(--color-text-muted)]">
            Site overview · stable canonical layout
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Evidence current at <span className="font-mono text-slate-300">{snapshot.observedAt}</span>
        </div>
      </div>

      <div className="grid flex-shrink-0 grid-cols-4 gap-3 border-b border-[var(--color-border-subtle)] bg-[#050810] px-4 py-3">
        <StatTile
          label="Devices healthy"
          value={`${summary.devicesHealthy}/${summary.devicesTotal}`}
          detail="observed devices"
          icon={<Activity className="h-4 w-4" />}
          tone="healthy"
        />
        <StatTile
          label="Active incidents"
          value={String(summary.activeIncidents)}
          detail="healthy scenario"
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="healthy"
        />
        <StatTile
          label="Monitoring coverage"
          value={`${summary.coveragePercent}%`}
          detail="full or partial"
          icon={<Eye className="h-4 w-4" />}
        />
        <StatTile
          label="Current observations"
          value={`${summary.currentObservations}/${snapshot.nodes.length}`}
          detail="all entity kinds"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <TopologyMap elements={elements} onNodeClick={handleNodeClick} />
          <div className="absolute left-4 top-4 max-w-[420px] rounded-lg border border-[var(--color-border-default)] bg-[#080D18]/90 px-3 py-2 text-[9.5px] leading-relaxed text-slate-500">
            <span className="font-bold text-slate-300">Synthetic demonstration.</span>{' '}
            This topology does not describe a real installation.
          </div>
        </div>

        {selectedNode
          ? <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNodeId(undefined)} />
          : <AlertFeedSidebar alerts={[]} />}
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <TopologyDataBoundary>
      {(snapshot, layout) => <AtlasOperationsWorkspace snapshot={snapshot} layout={layout} />}
    </TopologyDataBoundary>
  );
}
