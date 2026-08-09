import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cable, GitBranch, Loader2, Search, X } from 'lucide-react';
import { NodeDetailPanel } from '../topology/NodeDetailPanel';
import { RelationshipDetailPanel } from '../topology/RelationshipDetailPanel';
import { TopologyLegend } from '../topology/TopologyLegend';
import { TopologyMap } from '../topology/TopologyMap';
import type { TopologyNode, TopologyRelationship, TopologySnapshot } from '../../features/topology/domain/types';
import { resolveEndpointNodeId } from '../../features/topology/domain/graph';
import { useAtlasLayout } from '../../features/topology/layout/useAtlasLayout';
import {
  ATLAS_LENSES,
  projectSnapshotForLens,
  type ActiveAtlasLens,
} from '../../features/topology/projection/lensProjection';
import {
  type AtlasCytoscapeEdgeData,
  type AtlasCytoscapeNodeData,
  projectSnapshotToCytoscape,
} from '../../features/topology/rendering/cytoscapeAdapter';
import {
  filterTopologySnapshot,
  findTopologyMatches,
  type TopologyFilters,
} from '../../features/topology/state/filterSnapshot';
import { cn } from '../../lib/utils';

const DEFAULT_FILTERS: TopologyFilters = {
  query: '',
  health: 'all',
  coverage: 'all',
  kind: 'all',
};

const LENS_ICON: Record<ActiveAtlasLens, React.ReactNode> = {
  operations: <Search className="h-3.5 w-3.5" aria-hidden="true" />,
  physical: <Cable className="h-3.5 w-3.5" aria-hidden="true" />,
  dependency: <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />,
};

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

function relatedNodeName(
  relationship: TopologyRelationship,
  selectedNodeId: string,
  snapshot: TopologySnapshot,
): string {
  const sourceId = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
  const targetId = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
  const relatedId = sourceId === selectedNodeId ? targetId : sourceId;
  return snapshot.nodes.find(node => node.id === relatedId)?.displayName ?? 'Unresolved endpoint';
}

function SearchRail({
  snapshot,
  filters,
  onFiltersChange,
  matches,
  selectedNodeId,
  onSelectNode,
  onSelectRelationship,
}: {
  snapshot: TopologySnapshot;
  filters: TopologyFilters;
  onFiltersChange: (filters: TopologyFilters) => void;
  matches: TopologyNode[];
  selectedNodeId?: string;
  onSelectNode: (nodeId: string, trigger: HTMLButtonElement) => void;
  onSelectRelationship: (relationshipId: string, trigger: HTMLButtonElement) => void;
}) {
  const selectedRelationships = selectedNodeId
    ? snapshot.relationships.filter(relationship => {
      const sourceId = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
      const targetId = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
      return sourceId === selectedNodeId || targetId === selectedNodeId;
    })
    : [];

  return (
    <aside className="flex h-full w-[272px] flex-none flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]" aria-label="Investigation search and filters">
      <div className="flex-none border-b border-[var(--color-border-subtle)] p-3">
        <label className="relative block">
          <span className="sr-only">Search topology</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
          <input
            type="search"
            value={filters.query}
            onChange={event => onFiltersChange({ ...filters, query: event.target.value })}
            placeholder="Name, IP, interface, role…"
            className="h-9 w-full border border-[var(--color-border-default)] bg-[var(--color-bg-base)] pl-9 pr-8 text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, query: '' })}
              aria-label="Clear topology search"
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <label>
            <span className="sr-only">Health filter</span>
            <select
              value={filters.health}
              onChange={event => onFiltersChange({ ...filters, health: event.target.value as TopologyFilters['health'] })}
              className="h-8 w-full border border-[var(--color-border-default)] bg-[var(--color-bg-base)] px-2 text-[11px] text-[var(--color-text-secondary)]"
            >
              <option value="all">All health</option>
              <option value="healthy">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="unreachable">Unreachable</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Entity kind filter</span>
            <select
              value={filters.kind}
              onChange={event => onFiltersChange({ ...filters, kind: event.target.value as TopologyFilters['kind'] })}
              className="h-8 w-full border border-[var(--color-border-default)] bg-[var(--color-bg-base)] px-2 text-[11px] text-[var(--color-text-secondary)]"
            >
              <option value="all">All kinds</option>
              <option value="device">Devices</option>
              <option value="application">Apps</option>
              <option value="service">Services</option>
              <option value="capability">Capabilities</option>
              <option value="zone">Zones</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Monitoring coverage filter</span>
            <select
              value={filters.coverage}
              onChange={event => onFiltersChange({ ...filters, coverage: event.target.value as TopologyFilters['coverage'] })}
              className="h-8 w-full border border-[var(--color-border-default)] bg-[var(--color-bg-base)] px-2 text-[11px] text-[var(--color-text-secondary)]"
            >
              <option value="all">All visibility</option>
              <option value="full">Full</option>
              <option value="partial">Partial</option>
              <option value="none">None</option>
              <option value="unsupported">Unsupported</option>
            </select>
          </label>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Entities</span>
          <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{matches.length}</span>
        </div>
        {matches.length === 0 ? (
          <div className="p-4 text-[12px] leading-5 text-[var(--color-text-muted)]">
            No entities match these filters. Clear one filter to widen the investigation scope.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border-subtle)]">
            {matches.map(node => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={event => onSelectNode(node.id, event.currentTarget)}
                  aria-pressed={selectedNodeId === node.id}
                  className={cn(
                    'w-full border-l-2 px-3 py-2.5 text-left',
                    selectedNodeId === node.id
                      ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-soft)]'
                      : 'border-transparent hover:bg-[var(--color-bg-hover)]',
                  )}
                >
                  <span className="block truncate text-[12px] font-medium text-[var(--color-text-primary)]">{node.displayName}</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--color-text-muted)]">
                    <span className="truncate">{humanize(node.role)}</span>
                    <span className="flex-none">{humanize(node.assessment.operationalHealth)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedNodeId && selectedRelationships.length > 0 && (
          <section className="border-t border-[var(--color-border-default)]">
            <div className="border-b border-[var(--color-border-subtle)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Explain relationships
            </div>
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {selectedRelationships.slice(0, 8).map(relationship => (
                <li key={relationship.id}>
                  <button
                    type="button"
                    onClick={event => onSelectRelationship(relationship.id, event.currentTarget)}
                    className="w-full px-3 py-2 text-left text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    <span className="block">{humanize(relationship.relationshipType)}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-[var(--color-text-muted)]">
                      {relatedNodeName(relationship, selectedNodeId, snapshot)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

export function InvestigateWorkspace({ snapshot }: { snapshot: TopologySnapshot }) {
  const [filters, setFilters] = useState<TopologyFilters>(DEFAULT_FILTERS);
  const [lens, setLens] = useState<ActiveAtlasLens>('dependency');
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>();
  const selectionTriggerRef = useRef<HTMLButtonElement>();

  const lensSnapshot = useMemo(() => projectSnapshotForLens(snapshot, lens), [lens, snapshot]);
  const filteredSnapshot = useMemo(
    () => filterTopologySnapshot(lensSnapshot, filters),
    [filters, lensSnapshot],
  );
  const matches = useMemo(() => findTopologyMatches(snapshot, filters), [filters, snapshot]);
  const { layout, isPending, error } = useAtlasLayout(lensSnapshot, lens);
  const elements = useMemo(
    () => projectSnapshotToCytoscape(filteredSnapshot, layout),
    [filteredSnapshot, layout],
  );
  const selectedNode = snapshot.nodes.find(node => node.id === selectedNodeId);
  const selectedRelationship = snapshot.relationships.find(item => item.id === selectedRelationshipId);

  const selectNode = useCallback((nodeId: string, trigger?: HTMLButtonElement) => {
    if (!lensSnapshot.nodes.some(node => node.id === nodeId)) {
      const node = snapshot.nodes.find(candidate => candidate.id === nodeId);
      const dependencyKinds: TopologyNode['kind'][] = [
        'service', 'application', 'workload', 'process', 'capability', 'user_group',
      ];
      setLens(node && dependencyKinds.includes(node.kind) ? 'dependency' : 'physical');
    }
    selectionTriggerRef.current = trigger;
    setSelectedRelationshipId(undefined);
    setSelectedNodeId(nodeId);
  }, [lensSnapshot.nodes, snapshot.nodes]);
  const selectRelationship = useCallback((relationshipId: string, trigger?: HTMLButtonElement) => {
    selectionTriggerRef.current = trigger;
    setSelectedNodeId(undefined);
    setSelectedRelationshipId(relationshipId);
  }, []);
  const closeInspector = useCallback(() => {
    setSelectedNodeId(undefined);
    setSelectedRelationshipId(undefined);
    requestAnimationFrame(() => selectionTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (selectedNodeId || selectedRelationshipId)) closeInspector();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeInspector, selectedNodeId, selectedRelationshipId]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-bg-base)]">
      <header className="flex h-12 flex-none items-center justify-between border-b border-[var(--color-border-subtle)] px-4">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Investigate the evidence</h2>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">Search, focus, and explain entities and relationships without changing the saved map.</p>
        </div>
        <div className="flex border border-[var(--color-border-default)]" aria-label="Investigation lens">
          {ATLAS_LENSES.map(candidate => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setLens(candidate.id)}
              aria-pressed={candidate.id === lens}
              className={cn(
                'flex h-8 items-center gap-2 border-l border-[var(--color-border-default)] px-3 text-[11px] first:border-l-0',
                candidate.id === lens
                  ? 'bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {LENS_ICON[candidate.id]}
              {candidate.shortLabel}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <SearchRail
          snapshot={snapshot}
          filters={filters}
          onFiltersChange={setFilters}
          matches={matches}
          selectedNodeId={selectedNodeId}
          onSelectNode={selectNode}
          onSelectRelationship={selectRelationship}
        />
        <div className="relative min-w-0 flex-1">
          {isPending ? (
            <div role="status" className="flex h-full items-center justify-center bg-[var(--color-bg-canvas)] text-[12px] text-[var(--color-text-secondary)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Restoring the investigation layout…
            </div>
          ) : error ? (
            <div role="alert" className="flex h-full items-center justify-center p-8 text-[12px] text-[var(--color-status-crit)]">{error}</div>
          ) : filteredSnapshot.nodes.length === 0 ? (
            <div role="status" className="flex h-full items-center justify-center bg-[var(--color-bg-canvas)] p-8 text-center text-[12px] text-[var(--color-text-muted)]">
              Nothing is visible with the current search and filters.
            </div>
          ) : (
            <>
              <TopologyMap
                key={lens}
                elements={elements}
                selectedNodeId={selectedNodeId}
                selectedRelationshipId={selectedRelationshipId}
                onNodeClick={(node: AtlasCytoscapeNodeData) => selectNode(node.id)}
                onRelationshipClick={(relationship: AtlasCytoscapeEdgeData) => selectRelationship(relationship.id)}
                onBackgroundClick={closeInspector}
              />
              <TopologyLegend snapshot={filteredSnapshot} />
              <div className="pointer-events-none absolute left-4 top-4 border-l-2 border-[var(--color-brand-primary)] bg-[var(--color-bg-surface)] px-3 py-2 shadow-[var(--shadow-floating)]">
                <div className="text-[11px] font-semibold text-[var(--color-text-primary)]">Stable investigation context</div>
                <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{filteredSnapshot.nodes.length} visible · {matches.length} matching</div>
              </div>
            </>
          )}
        </div>
        {selectedNode && <NodeDetailPanel node={selectedNode} snapshot={snapshot} onClose={closeInspector} />}
        {selectedRelationship && (
          <RelationshipDetailPanel relationship={selectedRelationship} snapshot={snapshot} onClose={closeInspector} />
        )}
      </div>
    </div>
  );
}
