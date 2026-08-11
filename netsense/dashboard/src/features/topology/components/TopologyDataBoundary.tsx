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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setError(undefined);
    defaultTopologyRepository.getSnapshot(defaultTopologyRequest, controller.signal)
      .then(nextSnapshot => {
        if (active) setSnapshot(nextSnapshot);
      })
      .catch(reason => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Topology data could not be loaded.');
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const value: TopologyDataState = {
    snapshot,
    error,
    isLoading: !snapshot && !error,
    reload: () => setAttempt(value => value + 1),
  };

  return <TopologyDataContext.Provider value={value}>{children}</TopologyDataContext.Provider>;
}

interface TopologyDataBoundaryProps {
  children: (snapshot: TopologySnapshot) => ReactNode;
}

export function TopologyDataBoundary({ children }: TopologyDataBoundaryProps) {
  const { snapshot, error, reload } = useTopologyData();

  if (error) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md border-l-2 border-[var(--color-status-crit)] pl-4 text-left">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Topology unavailable</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{error}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Validate the data source or repository adapter before retrying.
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 border border-[var(--color-border-default)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            Retry validated load
          </button>
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
