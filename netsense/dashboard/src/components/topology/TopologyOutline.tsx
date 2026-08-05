import type { TopologyNode, TopologySnapshot } from '../../features/topology/domain/types';
import { cn } from '../../lib/utils';

const HEALTH_MARKER: Record<TopologyNode['assessment']['operationalHealth'], string> = {
  healthy: '✓',
  degraded: '△',
  unreachable: '×',
  unknown: '?',
};

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

export function TopologyOutline({
  snapshot,
  selectedNodeId,
  onSelect,
}: {
  snapshot: TopologySnapshot;
  selectedNodeId: string | undefined;
  onSelect: (nodeId: string, trigger: HTMLButtonElement) => void;
}) {
  const nodesById = new Map(snapshot.nodes.map(node => [node.id, node]));

  return (
    <section className="h-full overflow-auto bg-[var(--color-bg-canvas)] p-4" aria-labelledby="topology-outline-heading">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-4">
          <h2 id="topology-outline-heading" className="text-[15px] font-semibold text-white">Topology table</h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Structured representation of {snapshot.site.name}. Select an entity to inspect its operational context.
          </p>
        </div>

        <div className="overflow-hidden border border-[var(--color-border-default)]">
          <table className="w-full border-collapse text-left text-[12px]">
            <caption className="sr-only">
              Entities in {snapshot.site.name}, including health, role, location, evidence freshness and monitoring coverage.
            </caption>
            <thead className="sticky top-0 z-10 bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
              <tr>
                <th scope="col" className="border-b border-[var(--color-border-default)] px-3 py-2.5 font-medium">Entity</th>
                <th scope="col" className="border-b border-[var(--color-border-default)] px-3 py-2.5 font-medium">Current assessment</th>
                <th scope="col" className="border-b border-[var(--color-border-default)] px-3 py-2.5 font-medium">Role</th>
                <th scope="col" className="border-b border-[var(--color-border-default)] px-3 py-2.5 font-medium">Location or group</th>
                <th scope="col" className="border-b border-[var(--color-border-default)] px-3 py-2.5 font-medium">Evidence</th>
                <th scope="col" className="border-b border-[var(--color-border-default)] px-3 py-2.5 font-medium">Visibility</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.nodes.map(node => {
                const parent = node.parentId ? nodesById.get(node.parentId) : undefined;
                const selected = selectedNodeId === node.id;
                return (
                  <tr
                    key={node.id}
                    className={cn(
                      'border-b border-[var(--color-border-subtle)] last:border-b-0',
                      selected ? 'bg-[var(--color-brand-soft)]' : 'hover:bg-[var(--color-bg-hover)]',
                    )}
                  >
                    <th scope="row" className="px-3 py-2 font-normal">
                      <button
                        type="button"
                        onClick={event => onSelect(node.id, event.currentTarget)}
                        aria-current={selected ? 'true' : undefined}
                        className="text-left font-medium text-white underline-offset-4 hover:text-[var(--color-brand-primary)] hover:underline"
                      >
                        {node.displayName}
                      </button>
                      <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{humanize(node.kind)}</div>
                    </th>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                      <span className="mr-1.5" aria-hidden="true">{HEALTH_MARKER[node.assessment.operationalHealth]}</span>
                      {humanize(node.assessment.operationalHealth)}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{humanize(node.role)}</td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{parent?.displayName ?? 'Top level'}</td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{humanize(node.assessment.freshness)}</td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{humanize(node.assessment.coverage)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
