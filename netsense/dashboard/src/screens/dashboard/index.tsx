import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Cable, GitBranch, Loader2, Map, PanelRight, Table2 } from 'lucide-react';
import { OperationalContextRail } from '../../components/observe/OperationalContextRail';
import { SituationStrip } from '../../components/observe/SituationStrip';
import { InvestigateWorkspace } from '../../components/investigate/InvestigateWorkspace';
import { ResolveWorkspace } from '../../components/resolve/ResolveWorkspace';
import { NodeDetailPanel } from '../../components/topology/NodeDetailPanel';
import { TopologyLegend } from '../../components/topology/TopologyLegend';
import { TopologyMap } from '../../components/topology/TopologyMap';
import { TopologyOutline } from '../../components/topology/TopologyOutline';
import { TopologyDataBoundary } from '../../features/topology/components/TopologyDataBoundary';
import type { TopologyNode, TopologySnapshot } from '../../features/topology/domain/types';
import { useAtlasLayout } from '../../features/topology/layout/useAtlasLayout';
import {
  ATLAS_LENSES,
  projectSnapshotForLens,
  type ActiveAtlasLens,
} from '../../features/topology/projection/lensProjection';
import {
  projectSnapshotToCytoscape,
  type AtlasCytoscapeNodeData,
} from '../../features/topology/rendering/cytoscapeAdapter';
import { selectSituationSummary } from '../../features/topology/state/selectors';
import { cn } from '../../lib/utils';
import type { WorkspaceMode } from '../../features/workspace/types';

type WorkspaceView = 'map' | 'table';

const LENS_ICONS: Record<ActiveAtlasLens, React.ReactNode> = {
  operations: <Activity className="h-3.5 w-3.5" aria-hidden="true" />,
  physical: <Cable className="h-3.5 w-3.5" aria-hidden="true" />,
  dependency: <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />,
};

function useWideContextRail(): [boolean, (next: boolean) => void] {
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1600px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1600px)');
    const handleChange = (event: MediaQueryListEvent) => setOpen(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return [open, setOpen];
}

function ViewButton({
  active,
  label,
  icon,
  onClick,
  buttonRef,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-8 items-center gap-2 border-l border-[var(--color-border-default)] px-3 text-[12px] first:border-l-0',
        active
          ? 'bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ObserveWorkspace({ snapshot }: { snapshot: TopologySnapshot }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('map');
  const [lens, setLens] = useState<ActiveAtlasLens>('operations');
  const [contextOpen, setContextOpen] = useWideContextRail();
  const selectionTriggerRef = useRef<HTMLButtonElement>();
  const mapViewButtonRef = useRef<HTMLButtonElement>(null);

  const projectedSnapshot = useMemo(
    () => projectSnapshotForLens(snapshot, lens),
    [lens, snapshot],
  );
  const { layout, isPending: isLayoutPending, error: layoutError } = useAtlasLayout(
    projectedSnapshot,
    lens,
  );
  const elements = useMemo(
    () => projectSnapshotToCytoscape(projectedSnapshot, layout),
    [layout, projectedSnapshot],
  );
  const summary = useMemo(() => selectSituationSummary(snapshot), [snapshot]);
  const selectedNode = useMemo<TopologyNode | undefined>(
    () => projectedSnapshot.nodes.find(node => node.id === selectedNodeId),
    [projectedSnapshot.nodes, selectedNodeId],
  );
  const activeLens = ATLAS_LENSES.find(candidate => candidate.id === lens) ?? ATLAS_LENSES[0];

  const selectNode = useCallback((nodeId: string, trigger?: HTMLButtonElement) => {
    selectionTriggerRef.current = trigger ?? mapViewButtonRef.current ?? undefined;
    setSelectedNodeId(nodeId);
  }, []);

  const handleMapNodeClick = useCallback((node: AtlasCytoscapeNodeData) => {
    selectNode(node.id);
  }, [selectNode]);

  const closeInspector = useCallback(() => {
    setSelectedNodeId(undefined);
    requestAnimationFrame(() => selectionTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!selectedNodeId) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInspector();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeInspector, selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId && !projectedSnapshot.nodes.some(node => node.id === selectedNodeId)) {
      setSelectedNodeId(undefined);
    }
  }, [projectedSnapshot.nodes, selectedNodeId]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-bg-base)]">
      <div className="flex h-12 flex-none items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex border border-[var(--color-border-default)]" aria-label="Topology lens">
            {ATLAS_LENSES.map(candidate => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setLens(candidate.id)}
                aria-pressed={lens === candidate.id}
                title={candidate.purpose}
                className={cn(
                  'flex h-8 items-center gap-2 border-l border-[var(--color-border-default)] px-3 text-[12px] first:border-l-0',
                  lens === candidate.id
                    ? 'bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {LENS_ICONS[candidate.id]}
                {candidate.shortLabel}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-[var(--color-border-default)]" aria-hidden="true" />
          <span className="truncate text-[12px] text-[var(--color-text-muted)]">
            {activeLens.purpose}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-[var(--color-border-default)]" aria-label="Topology representation">
            <ViewButton
              active={workspaceView === 'map'}
              label="Map"
              icon={<Map className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => setWorkspaceView('map')}
              buttonRef={mapViewButtonRef}
            />
            <ViewButton
              active={workspaceView === 'table'}
              label="Table"
              icon={<Table2 className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => setWorkspaceView('table')}
            />
          </div>
          {!selectedNode && (
            <button
              type="button"
              onClick={() => setContextOpen(!contextOpen)}
              aria-expanded={contextOpen}
              className={cn(
                'flex h-8 items-center gap-2 border px-3 text-[12px]',
                contextOpen
                  ? 'border-[var(--color-brand-primary)]/50 bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
                  : 'border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
              )}
            >
              <PanelRight className="h-3.5 w-3.5" aria-hidden="true" />
              Context
            </button>
          )}
        </div>
      </div>

      <SituationStrip summary={summary} />

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {workspaceView === 'map' ? (
            <>
              {isLayoutPending ? (
                <div
                  role="status"
                  className="flex h-full items-center justify-center bg-[var(--color-bg-canvas)] text-[12px] text-[var(--color-text-secondary)]"
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Composing the {activeLens.label.toLowerCase()} map…
                </div>
              ) : layoutError ? (
                <div role="alert" className="flex h-full items-center justify-center bg-[var(--color-bg-canvas)] p-8">
                  <div className="max-w-md border-l-2 border-[var(--color-status-crit)] pl-4">
                    <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Atlas layout unavailable</div>
                    <div className="mt-2 text-[12px] text-[var(--color-text-muted)]">{layoutError}</div>
                  </div>
                </div>
              ) : (
                <>
                  <TopologyMap
                    key={lens}
                    elements={elements}
                    selectedNodeId={selectedNodeId}
                    onNodeClick={handleMapNodeClick}
                    onBackgroundClick={selectedNode ? closeInspector : undefined}
                  />
                  <div className="pointer-events-none absolute left-4 top-4 z-20 border-l-2 border-[var(--color-brand-primary)] bg-[var(--color-bg-surface)] px-3 py-2 shadow-[var(--shadow-floating)]">
                    <div className="text-[11px] font-semibold text-[var(--color-text-primary)]">Atlas layered topology</div>
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {projectedSnapshot.nodes.length} entities · {projectedSnapshot.relationships.length} relationships
                      {layout?.computationMs !== undefined ? ` · ${layout.computationMs} ms` : ''}
                    </div>
                  </div>
                  <TopologyLegend snapshot={projectedSnapshot} />
                </>
              )}
            </>
          ) : (
            <TopologyOutline
              snapshot={projectedSnapshot}
              selectedNodeId={selectedNodeId}
              onSelect={selectNode}
            />
          )}
        </div>

        {selectedNode ? (
          <NodeDetailPanel node={selectedNode} snapshot={snapshot} onClose={closeInspector} />
        ) : contextOpen ? (
          <OperationalContextRail
            snapshot={snapshot}
            summary={summary}
            onClose={() => setContextOpen(false)}
          />
        ) : null}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedNode ? `${selectedNode.displayName} selected. Operational inspector opened.` : ''}
      </div>
    </div>
  );
}

export function Dashboard({
  workspace,
}: {
  workspace: WorkspaceMode;
}) {
  return (
    <TopologyDataBoundary>
      {snapshot => {
        if (workspace === 'investigate') return <InvestigateWorkspace snapshot={snapshot} />;
        if (workspace === 'resolve') return <ResolveWorkspace />;
        return <ObserveWorkspace snapshot={snapshot} />;
      }}
    </TopologyDataBoundary>
  );
}
