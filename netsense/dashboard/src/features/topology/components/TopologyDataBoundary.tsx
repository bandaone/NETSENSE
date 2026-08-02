import { useEffect, useState, type ReactNode } from 'react';
import type { TopologySnapshot } from '../domain/types';
import type { LayoutProfile } from '../layout/types';
import {
  defaultPositionStore,
  defaultTopologyRepository,
  defaultTopologyRequest,
} from '../data/defaultTopologyRepository';

interface TopologyDataBoundaryProps {
  children: (snapshot: TopologySnapshot, layout: LayoutProfile | undefined) => ReactNode;
}

export function TopologyDataBoundary({ children }: TopologyDataBoundaryProps) {
  const [snapshot, setSnapshot] = useState<TopologySnapshot>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    defaultTopologyRepository.getSnapshot(defaultTopologyRequest)
      .then(nextSnapshot => {
        if (active) setSnapshot(nextSnapshot);
      })
      .catch(reason => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Topology data could not be loaded.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-base font-bold text-white">Topology unavailable</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">{error}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Validate the fixture or repository adapter before retrying.
          </p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div role="status" aria-live="polite" className="flex h-full items-center justify-center">
        <div className="text-sm text-[var(--color-text-secondary)]">Loading validated topology…</div>
      </div>
    );
  }

  const layout = defaultPositionStore.get({
    siteId: snapshot.site.id,
    scopeId: snapshot.site.id,
    lens: 'operations',
  });
  return <>{children(snapshot, layout)}</>;
}
