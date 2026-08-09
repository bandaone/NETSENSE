import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { TopologySnapshot } from '../domain/types';
import {
  defaultTopologyRepository,
  defaultTopologyRequest,
} from '../data/defaultTopologyRepository';
import { TopologyDataContext, type TopologyDataState, useTopologyData } from './topologyDataContext';

export function TopologyDataProvider({ children }: { children: ReactNode }) {
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

  const value: TopologyDataState = {
    snapshot,
    error,
    isLoading: !snapshot && !error,
  };

  return <TopologyDataContext.Provider value={value}>{children}</TopologyDataContext.Provider>;
}

interface TopologyDataBoundaryProps {
  children: (snapshot: TopologySnapshot) => ReactNode;
}

export function TopologyDataBoundary({ children }: TopologyDataBoundaryProps) {
  const { snapshot, error } = useTopologyData();

  if (error) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md border-l-2 border-[var(--color-status-crit)] pl-4 text-left">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Topology unavailable</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{error}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Validate the data source or repository adapter before retrying.
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

  return <>{children(snapshot)}</>;
}
