import type { TopologySnapshot } from '../domain/types';

export interface TopologySnapshotRequest {
  tenantId: string;
  organisationId: string;
  siteId: string;
  scenarioId: string;
}

export interface TopologyRepository {
  getSnapshot(request: TopologySnapshotRequest): Promise<TopologySnapshot>;
}
