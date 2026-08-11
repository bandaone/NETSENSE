import { createContext, useContext } from 'react';
import type { TopologySnapshot } from '../domain/types';

export interface TopologyDataState {
  snapshot: TopologySnapshot | undefined;
  error: string | undefined;
  isLoading: boolean;
  reload: () => void;
}

export const TopologyDataContext = createContext<TopologyDataState | undefined>(undefined);

export function useTopologyData(): TopologyDataState {
  const value = useContext(TopologyDataContext);
  if (!value) throw new Error('useTopologyData must be used inside TopologyDataProvider.');
  return value;
}
