import {
  ASTER_HEALTHY_SCENARIO_ID,
  ASTER_ORGANISATION_ID,
  ASTER_SITE_ID,
  healthyAsterEnterpriseSnapshotFixture,
} from './fixtures/healthyAsterEnterprise';
import { HEALTHY_SCENARIO_ID, healthyMukubaSnapshotFixture } from './fixtures/healthyMukubaSite';
import { FixtureTopologyRepository } from './fixtureTopologyRepository';
import { MemoryPositionStore } from '../layout/memoryPositionStore';

export const defaultTopologyRequest = {
  tenantId: ASTER_ORGANISATION_ID,
  organisationId: ASTER_ORGANISATION_ID,
  siteId: ASTER_SITE_ID,
  scenarioId: ASTER_HEALTHY_SCENARIO_ID,
} as const;

export const defaultTopologyRepository = new FixtureTopologyRepository(
  new Map([
    [ASTER_HEALTHY_SCENARIO_ID, healthyAsterEnterpriseSnapshotFixture],
    [HEALTHY_SCENARIO_ID, healthyMukubaSnapshotFixture],
  ]),
);

export const defaultPositionStore = new MemoryPositionStore();
