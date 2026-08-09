import { describe, expect, it } from 'vitest';
import {
  HEALTHY_SCENARIO_ID,
  MUKUBA_ORGANISATION_ID,
  MUKUBA_SITE_ID,
  SYNTHETIC_DATA_NOTICE,
  healthyMukubaSnapshotFixture,
} from './fixtures/healthyMukubaSite';
import {
  TopologyNotFoundError,
  TopologyValidationError,
  UnsupportedTopologySchemaVersionError,
} from '../domain/errors';
import { FixtureTopologyRepository, parseTopologySnapshot } from './fixtureTopologyRepository';

const request = {
  tenantId: MUKUBA_ORGANISATION_ID,
  organisationId: MUKUBA_ORGANISATION_ID,
  siteId: MUKUBA_SITE_ID,
  scenarioId: HEALTHY_SCENARIO_ID,
};

describe('FixtureTopologyRepository', () => {
  it('returns a deterministic, validated healthy scenario', async () => {
    const repository = new FixtureTopologyRepository(
      new Map([[HEALTHY_SCENARIO_ID, healthyMukubaSnapshotFixture]]),
    );
    const first = await repository.getSnapshot(request);
    const second = await repository.getSnapshot(request);

    expect(first).toEqual(second);
    expect(first.syntheticDataNotice).toBe(SYNTHETIC_DATA_NOTICE);
    expect(first.nodes.every(node => node.assessment.operationalHealth === 'healthy')).toBe(true);
    expect(first.relationships.every(relationship => relationship.status === 'healthy')).toBe(true);
    expect(first.coverageSummary.totalEntities).toBe(first.nodes.length);
  });

  it('rejects unsupported schema versions with a typed error', () => {
    expect(() => parseTopologySnapshot({ schemaVersion: '2.0.0' })).toThrow(
      UnsupportedTopologySchemaVersionError,
    );
  });

  it('rejects malformed and out-of-scope fixture requests', async () => {
    expect(() => parseTopologySnapshot({ nodes: [] })).toThrow(TopologyValidationError);

    const repository = new FixtureTopologyRepository(
      new Map([[HEALTHY_SCENARIO_ID, healthyMukubaSnapshotFixture]]),
    );
    await expect(repository.getSnapshot({ ...request, siteId: 'site:other' })).rejects.toThrow(
      TopologyNotFoundError,
    );
    await expect(repository.getSnapshot({ ...request, tenantId: 'tenant:other' })).rejects.toThrow(
      'The requested topology is not available in this scope.',
    );
    await expect(repository.getSnapshot({
      ...request,
      scenarioId: 'scenario:not-present',
    })).rejects.toThrow('The requested topology is not available in this scope.');
  });

  it('contains no legacy incident conclusions or real-site identifiers', () => {
    const serialized = JSON.stringify(healthyMukubaSnapshotFixture).toLowerCase();
    for (const forbidden of ['kansanshi', 'open_incidents', 'root_cause', 'blast_radius']) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
