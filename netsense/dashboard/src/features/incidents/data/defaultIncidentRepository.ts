import {
  ASTER_REDUNDANT_LINK_INCIDENT_ID,
  ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
  asterRedundantLinkIncidentScenario,
  asterServiceDependencyIncidentScenario,
} from './fixtures/asterIncidentScenarios';
import { FixtureIncidentRepository } from './fixtureIncidentRepository';
import {
  ASTER_ORGANISATION_ID,
  ASTER_SITE_ID,
} from '../../topology/data/fixtures/healthyAsterEnterprise';

export const defaultIncidentId = ASTER_SERVICE_DEPENDENCY_INCIDENT_ID;
export const defaultIncidentTenantId = ASTER_ORGANISATION_ID;
export const defaultIncidentSiteId = ASTER_SITE_ID;

export const defaultIncidentRepository = new FixtureIncidentRepository(new Map([
  [ASTER_SERVICE_DEPENDENCY_INCIDENT_ID, asterServiceDependencyIncidentScenario],
  [ASTER_REDUNDANT_LINK_INCIDENT_ID, asterRedundantLinkIncidentScenario],
]), {
  actor: 'Demo operator',
  now: () => new Date().toISOString(),
});
