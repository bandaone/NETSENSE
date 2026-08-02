import {
  HEALTHY_SCENARIO_ID,
  MUKUBA_ORGANISATION_ID,
  MUKUBA_SITE_ID,
  healthyMukubaOperationsLayout,
  healthyMukubaSnapshotFixture,
} from './fixtures/healthyMukubaSite';
import { FixtureTopologyRepository } from './fixtureTopologyRepository';
import { MemoryPositionStore } from '../layout/memoryPositionStore';

export const defaultTopologyRequest = {
  organisationId: MUKUBA_ORGANISATION_ID,
  siteId: MUKUBA_SITE_ID,
  scenarioId: HEALTHY_SCENARIO_ID,
} as const;

export const defaultTopologyRepository = new FixtureTopologyRepository(
  new Map([[HEALTHY_SCENARIO_ID, healthyMukubaSnapshotFixture]]),
);

export const defaultPositionStore = new MemoryPositionStore([
  healthyMukubaOperationsLayout,
]);
