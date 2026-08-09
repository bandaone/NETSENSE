import { describe, expect, it } from 'vitest';
import { healthyAsterEnterpriseSnapshotFixture } from '../data/fixtures/healthyAsterEnterprise';
import { filterTopologySnapshot, findTopologyMatches } from './filterSnapshot';

describe('topology search and filters', () => {
  it('finds an entity by address and interface name', () => {
    expect(findTopologyMatches(healthyAsterEnterpriseSnapshotFixture, {
      query: '192.0.2.11', health: 'all', coverage: 'all', kind: 'all',
    }).map(node => node.displayName)).toEqual(['Core Switch 01']);

    expect(findTopologyMatches(healthyAsterEnterpriseSnapshotFixture, {
      query: 'te1/0/48', health: 'all', coverage: 'all', kind: 'all',
    }).map(node => node.displayName)).toEqual(['Campus Access 01']);
  });

  it('composes coverage and kind filters', () => {
    const matches = findTopologyMatches(healthyAsterEnterpriseSnapshotFixture, {
      query: '', health: 'healthy', coverage: 'partial', kind: 'application',
    });
    expect(matches.map(node => node.displayName)).toEqual(['Customer Portal']);
  });

  it('keeps search results, immediate context, and ancestors in the map projection', () => {
    const projection = filterTopologySnapshot(healthyAsterEnterpriseSnapshotFixture, {
      query: 'Finance Platform', health: 'all', coverage: 'all', kind: 'all',
    });
    const ids = new Set(projection.nodes.map(node => node.id));

    expect(ids.has('application:aster:finance')).toBe(true);
    expect(ids.has('device:aster:compute-cluster')).toBe(true);
    expect(ids.has('application:aster:identity')).toBe(true);
    expect(ids.has('zone:aster:digital-services')).toBe(true);
    expect(ids.has('device:aster:access-01')).toBe(false);
  });
});
