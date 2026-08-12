import {
  ASTER_HEALTHY_SCENARIO_ID,
  ASTER_ORGANISATION_ID,
  ASTER_SITE_ID,
  healthyAsterEnterpriseSnapshotFixture,
} from './fixtures/healthyAsterEnterprise';
import { HEALTHY_SCENARIO_ID, healthyMukubaSnapshotFixture } from './fixtures/healthyMukubaSite';
import { FixtureTopologyRepository } from './fixtureTopologyRepository';
import { HttpTopologyRepository, type AccessTokenProvider, type TopologyFetch } from './httpTopologyRepository';
import { MemoryPositionStore } from '../layout/memoryPositionStore';
import { TopologyConfigurationError } from '../domain/errors';
import type { TopologyRepository, TopologySnapshotRequest } from './topologyRepository';

export const ATLAS_SESSION_TOKEN_KEY = 'netsense.atlas.accessToken';

interface TopologyRuntimeEnvironment {
  DEV?: boolean;
  VITE_NETSENSE_DATA_MODE?: string;
  VITE_NETSENSE_API_BASE_URL?: string;
  VITE_NETSENSE_DEV_PROXY_AUTH?: string;
  VITE_NETSENSE_TENANT_ID?: string;
  VITE_NETSENSE_ORGANISATION_ID?: string;
  VITE_NETSENSE_SITE_ID?: string;
}

export interface TopologyDataSource {
  mode: 'fixture' | 'live';
  repository: TopologyRepository;
  request: TopologySnapshotRequest;
}

class ConfigurationFailureRepository implements TopologyRepository {
  constructor(private readonly message: string) {}

  async getSnapshot(): Promise<never> {
    throw new TopologyConfigurationError(this.message);
  }
}

const fixtureRepository = new FixtureTopologyRepository(
  new Map([
    [ASTER_HEALTHY_SCENARIO_ID, healthyAsterEnterpriseSnapshotFixture],
    [HEALTHY_SCENARIO_ID, healthyMukubaSnapshotFixture],
  ]),
);

function fixtureDataSource(): TopologyDataSource {
  return {
    mode: 'fixture',
    repository: fixtureRepository,
    request: {
      tenantId: ASTER_ORGANISATION_ID,
      organisationId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
      scenarioId: ASTER_HEALTHY_SCENARIO_ID,
    },
  };
}

export function createTopologyDataSource(
  environment: TopologyRuntimeEnvironment,
  accessToken: AccessTokenProvider,
  fetchTopology?: TopologyFetch,
): TopologyDataSource {
  const mode = environment.VITE_NETSENSE_DATA_MODE?.trim() || 'fixture';
  if (mode === 'fixture') return fixtureDataSource();

  const request = {
    tenantId: environment.VITE_NETSENSE_TENANT_ID?.trim() || '',
    organisationId: environment.VITE_NETSENSE_ORGANISATION_ID?.trim() || '',
    siteId: environment.VITE_NETSENSE_SITE_ID?.trim() || '',
  };
  if (mode !== 'live') {
    return {
      mode: 'live',
      repository: new ConfigurationFailureRepository(
        'VITE_NETSENSE_DATA_MODE must be either "fixture" or "live".',
      ),
      request,
    };
  }

  const missing = Object.entries(request)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    return {
      mode,
      repository: new ConfigurationFailureRepository(
        `Live topology configuration is missing: ${missing.join(', ')}.`,
      ),
      request,
    };
  }

  const allowDevelopmentProxyAuthentication = environment.DEV === true &&
    environment.VITE_NETSENSE_DEV_PROXY_AUTH?.trim().toLocaleLowerCase() === 'true';

  const repository = fetchTopology
    ? new HttpTopologyRepository(
      environment.VITE_NETSENSE_API_BASE_URL || '',
      accessToken,
      fetchTopology,
      allowDevelopmentProxyAuthentication,
    )
    : new HttpTopologyRepository(
      environment.VITE_NETSENSE_API_BASE_URL || '',
      accessToken,
      undefined,
      allowDevelopmentProxyAuthentication,
    );
  return { mode, repository, request };
}

function browserSessionAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(ATLAS_SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

const defaultTopologyDataSource = createTopologyDataSource(
  import.meta.env,
  browserSessionAccessToken,
);

export const defaultTopologyRepository = defaultTopologyDataSource.repository;
export const defaultTopologyRequest = defaultTopologyDataSource.request;
export const defaultTopologyMode = defaultTopologyDataSource.mode;
export const defaultPositionStore = new MemoryPositionStore();
