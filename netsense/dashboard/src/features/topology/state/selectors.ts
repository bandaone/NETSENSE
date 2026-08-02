import type { TopologySnapshot } from '../domain/types';

export interface TopologySummary {
  devicesHealthy: number;
  devicesTotal: number;
  activeIncidents: number;
  coveragePercent: number;
  currentObservations: number;
}

export function selectTopologySummary(snapshot: TopologySnapshot): TopologySummary {
  const devices = snapshot.nodes.filter(node => node.kind === 'device');
  const devicesHealthy = devices.filter(
    node => node.assessment.operationalHealth === 'healthy',
  ).length;
  const currentObservations = snapshot.nodes.filter(
    node => node.assessment.freshness === 'current',
  ).length;
  const covered = snapshot.coverageSummary.full + snapshot.coverageSummary.partial;

  return {
    devicesHealthy,
    devicesTotal: devices.length,
    activeIncidents: 0,
    coveragePercent: snapshot.nodes.length === 0
      ? 0
      : Math.round((covered / snapshot.nodes.length) * 100),
    currentObservations,
  };
}
