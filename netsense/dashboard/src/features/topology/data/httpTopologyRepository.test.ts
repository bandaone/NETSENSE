import { describe, expect, it, vi } from 'vitest';
import {
  TopologyAccessError,
  TopologyAuthenticationError,
  TopologyNotFoundError,
  TopologyTransportError,
  TopologyValidationError,
} from '../domain/errors';
import {
  ASTER_ORGANISATION_ID,
  ASTER_SITE_ID,
  healthyAsterEnterpriseSnapshotFixture,
} from './fixtures/healthyAsterEnterprise';
import { createTopologyDataSource } from './defaultTopologyRepository';
import { HttpTopologyRepository, type TopologyFetch } from './httpTopologyRepository';

const request = {
  tenantId: ASTER_ORGANISATION_ID,
  organisationId: ASTER_ORGANISATION_ID,
  siteId: ASTER_SITE_ID,
};

function liveSnapshot(): unknown {
  return {
    ...structuredClone(healthyAsterEnterpriseSnapshotFixture),
    synthetic: false,
    syntheticDataNotice: null,
  };
}

describe('HttpTopologyRepository', () => {
  it('loads, authenticates, validates, and scope-checks a live snapshot', async () => {
    const fetchTopology = vi.fn<TopologyFetch>().mockResolvedValue(new Response(
      JSON.stringify(liveSnapshot()),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    const repository = new HttpTopologyRepository(
      'https://platform.test/',
      () => 'short-lived-token',
      fetchTopology,
    );

    const snapshot = await repository.getSnapshot(request);

    expect(snapshot.synthetic).toBe(false);
    expect(fetchTopology).toHaveBeenCalledOnce();
    const [url, options] = fetchTopology.mock.calls[0];
    expect(url).toBe(`https://platform.test/api/v1/sites/${encodeURIComponent(ASTER_SITE_ID)}/topology`);
    expect(options?.headers).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer short-lived-token',
    });
    expect(options?.cache).toBe('no-store');
    expect(options?.credentials).toBe('omit');
  });

  it('fails before transport when no authenticated session is available', async () => {
    const fetchTopology = vi.fn<TopologyFetch>();
    const repository = new HttpTopologyRepository('', () => null, fetchTopology);

    await expect(repository.getSnapshot(request)).rejects.toBeInstanceOf(
      TopologyAuthenticationError,
    );
    expect(fetchTopology).not.toHaveBeenCalled();
  });

  it.each([
    [401, TopologyAuthenticationError],
    [403, TopologyAccessError],
    [404, TopologyNotFoundError],
    [503, TopologyTransportError],
  ])('maps HTTP status %i to a safe typed failure', async (status, errorType) => {
    const repository = new HttpTopologyRepository(
      '',
      () => 'token',
      vi.fn<TopologyFetch>().mockResolvedValue(new Response('sensitive upstream detail', { status })),
    );

    await expect(repository.getSnapshot(request)).rejects.toBeInstanceOf(errorType);
    await expect(repository.getSnapshot(request)).rejects.not.toThrow('sensitive upstream detail');
  });

  it('rejects malformed JSON and cross-scope snapshots', async () => {
    const malformed = new HttpTopologyRepository(
      '',
      () => 'token',
      vi.fn<TopologyFetch>().mockResolvedValue(new Response('{', { status: 200 })),
    );
    const outsideScope = structuredClone(liveSnapshot()) as Record<string, unknown>;
    outsideScope.tenantId = 'tenant:outside';
    const crossScope = new HttpTopologyRepository(
      '',
      () => 'token',
      vi.fn<TopologyFetch>().mockResolvedValue(new Response(JSON.stringify(outsideScope), { status: 200 })),
    );

    await expect(malformed.getSnapshot(request)).rejects.toBeInstanceOf(TopologyValidationError);
    await expect(crossScope.getSnapshot(request)).rejects.toBeInstanceOf(TopologyNotFoundError);
  });

  it('keeps fixture mode as the explicit safe default and fails closed on live misconfiguration', async () => {
    const fixture = createTopologyDataSource({}, () => null);
    expect(fixture.mode).toBe('fixture');
    expect((await fixture.repository.getSnapshot(fixture.request)).synthetic).toBe(true);

    const misconfigured = createTopologyDataSource(
      { VITE_NETSENSE_DATA_MODE: 'live' },
      () => 'token',
    );
    await expect(
      misconfigured.repository.getSnapshot(misconfigured.request),
    ).rejects.toThrow('Live topology configuration is missing');
  });
});
