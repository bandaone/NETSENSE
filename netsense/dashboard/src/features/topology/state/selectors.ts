import type {
  ObservationFreshness,
  OperationalHealth,
  TopologySnapshot,
} from '../domain/types';

export type EnvironmentState = 'normal' | 'attention' | 'uncertain';

export interface SituationSummary {
  environmentState: EnvironmentState;
  environmentLabel: string;
  environmentDetail: string;
  importantEntityCount: number;
  importantEntityDetail: string;
  visibilityPercent: number;
  visibilityLabel: string;
  visibilityDetail: string;
  evidenceLabel: string;
  evidenceDetail: string;
  observedAt: string | undefined;
}

function environmentSummary(healthStates: OperationalHealth[]): Pick<
  SituationSummary,
  'environmentState' | 'environmentLabel' | 'environmentDetail'
> {
  if (healthStates.length === 0) {
    return {
      environmentState: 'uncertain',
      environmentLabel: 'Insufficient evidence',
      environmentDetail: 'No entities in scope',
    };
  }

  const unreachable = healthStates.filter(state => state === 'unreachable').length;
  const degraded = healthStates.filter(state => state === 'degraded').length;
  const unknown = healthStates.filter(state => state === 'unknown').length;

  if (unreachable > 0 || degraded > 0) {
    const affected = unreachable + degraded;
    return {
      environmentState: 'attention',
      environmentLabel: 'Attention required',
      environmentDetail: `${affected} abnormal ${affected === 1 ? 'assessment' : 'assessments'}`,
    };
  }

  if (unknown > 0) {
    return {
      environmentState: 'uncertain',
      environmentLabel: 'Status uncertain',
      environmentDetail: `${unknown} unknown ${unknown === 1 ? 'assessment' : 'assessments'}`,
    };
  }

  return {
    environmentState: 'normal',
    environmentLabel: 'Operating normally',
    environmentDetail: `${healthStates.length} current healthy assessments`,
  };
}

function evidenceSummary(freshnessStates: ObservationFreshness[]): Pick<
  SituationSummary,
  'evidenceLabel' | 'evidenceDetail'
> {
  if (freshnessStates.length === 0) {
    return { evidenceLabel: 'No evidence', evidenceDetail: 'Nothing observed in this scope' };
  }

  const counts = {
    current: freshnessStates.filter(state => state === 'current').length,
    stale: freshnessStates.filter(state => state === 'stale').length,
    expired: freshnessStates.filter(state => state === 'expired').length,
    neverObserved: freshnessStates.filter(state => state === 'never_observed').length,
  };

  if (counts.expired > 0) {
    return {
      evidenceLabel: 'Evidence expired',
      evidenceDetail: `${counts.expired} expired ${counts.expired === 1 ? 'assessment' : 'assessments'}`,
    };
  }
  if (counts.stale > 0) {
    return {
      evidenceLabel: 'Evidence stale',
      evidenceDetail: `${counts.stale} stale ${counts.stale === 1 ? 'assessment' : 'assessments'}`,
    };
  }
  if (counts.neverObserved > 0) {
    return {
      evidenceLabel: 'Evidence incomplete',
      evidenceDetail: `${counts.neverObserved} never observed`,
    };
  }

  return {
    evidenceLabel: 'Evidence current',
    evidenceDetail: `${counts.current} current assessments`,
  };
}

export function selectSituationSummary(snapshot: TopologySnapshot): SituationSummary {
  const environment = environmentSummary(
    snapshot.nodes.map(node => node.assessment.operationalHealth),
  );
  const evidence = evidenceSummary(snapshot.nodes.map(node => node.assessment.freshness));
  const operationalEntities = snapshot.nodes.filter(node => node.kind !== 'zone');
  const importantEntityCount = operationalEntities.filter(
    node => node.operationalCriticality === 5,
  ).length;
  const visibleEntities = snapshot.coverageSummary.full + snapshot.coverageSummary.partial;
  const totalEntities = snapshot.coverageSummary.totalEntities;
  const visibilityPercent = totalEntities === 0
    ? 0
    : Math.round((visibleEntities / totalEntities) * 100);

  return {
    ...environment,
    ...evidence,
    importantEntityCount,
    importantEntityDetail: `${operationalEntities.length} operational entities`,
    visibilityPercent,
    visibilityLabel: totalEntities === 0 ? 'No visibility' : `${visibilityPercent}% monitored`,
    visibilityDetail: `${snapshot.coverageSummary.full} full · ${snapshot.coverageSummary.partial} partial · ${snapshot.coverageSummary.none + snapshot.coverageSummary.unsupported} gaps`,
    observedAt: snapshot.observedAt,
  };
}
