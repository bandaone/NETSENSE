import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers3, Map, PanelRight, Table2 } from 'lucide-react';
import { OperationalContextRail } from '../../components/observe/OperationalContextRail';
import { SituationStrip } from '../../components/observe/SituationStrip';
import { NodeDetailPanel } from '../../components/topology/NodeDetailPanel';
import { TopologyLegend } from '../../components/topology/TopologyLegend';
import { TopologyMap } from '../../components/topology/TopologyMap';
import { TopologyOutline } from '../../components/topology/TopologyOutline';
import { TopologyDataBoundary } from '../../features/topology/components/TopologyDataBoundary';
import type { TopologyNode, TopologySnapshot } from '../../features/topology/domain/types';
import type { LayoutProfile } from '../../features/topology/layout/types';
import {
  projectSnapshotToCytoscape,
  type AtlasCytoscapeNodeData,
} from '../../features/topology/rendering/cytoscapeAdapter';
import { selectSituationSummary } from '../../features/topology/state/selectors';
import { cn } from '../../lib/utils';

type WorkspaceView = 'map' | 'table';

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
          ? 'bg-[var(--color-brand-soft)] text-white'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-white',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ObserveWorkspace({ snapshot, layout }: { snapshot: TopologySnapshot; layout: LayoutProfile | undefined }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('map');
  const [contextOpen, setContextOpen] = useWideContextRail();
  const selectionTriggerRef = useRef<HTMLButtonElement>();
  const mapViewButtonRef = useRef<HTMLButtonElement>(null);

  const elements = useMemo(
    () => projectSnapshotToCytoscape(snapshot, layout),
    [snapshot, layout],
  );
  const summary = useMemo(() => selectSituationSummary(snapshot), [snapshot]);
  const selectedNode = useMemo<TopologyNode | undefined>(
    () => snapshot.nodes.find(node => node.id === selectedNodeId),
    [selectedNodeId, snapshot.nodes],
  );

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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-bg-base)]">
      <div className="flex h-11 flex-none items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2 text-[12px] font-medium text-white">
            <Layers3 className="h-4 w-4 text-[var(--color-brand-primary)]" aria-hidden="true" />
            Operations lens
          </div>
          <div className="h-4 w-px bg-[var(--color-border-default)]" aria-hidden="true" />
          <span className="truncate text-[12px] text-[var(--color-text-muted)]">Site scope · stable canonical layout</span>
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
                  ? 'border-[var(--color-brand-primary)]/50 bg-[var(--color-brand-soft)] text-white'
                  : 'border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-white',
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
              <TopologyMap
                elements={elements}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleMapNodeClick}
              />
              <TopologyLegend snapshot={snapshot} />
            </>
          ) : (
            <TopologyOutline
              snapshot={snapshot}
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

export function Dashboard() {
  return (
    <TopologyDataBoundary>
      {(snapshot, layout) => <ObserveWorkspace snapshot={snapshot} layout={layout} />}
    </TopologyDataBoundary>
  );
}
