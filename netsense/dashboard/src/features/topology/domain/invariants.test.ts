import { describe, expect, it } from 'vitest';
import { healthyMukubaSnapshotFixture } from '../data/fixtures/healthyMukubaSite';
import { TopologyInvariantError } from './errors';
import { assertTopologyInvariants } from './invariants';

describe('assertTopologyInvariants', () => {
  it('accepts the healthy synthetic fixture', () => {
    expect(() => assertTopologyInvariants(healthyMukubaSnapshotFixture)).not.toThrow();
  });

  it('rejects missing parent and evidence references', () => {
    const snapshot = structuredClone(healthyMukubaSnapshotFixture);
    snapshot.nodes[0].parentId = 'zone:missing';
    snapshot.nodes[0].evidenceIds = ['evidence:missing'];

    expect(() => assertTopologyInvariants(snapshot)).toThrow(TopologyInvariantError);
    try {
      assertTopologyInvariants(snapshot);
    } catch (error) {
      expect((error as TopologyInvariantError).violations).toEqual(expect.arrayContaining([
        expect.stringContaining('missing parent'),
        expect.stringContaining('missing evidence'),
      ]));
    }
  });

  it('requires physical adjacency to terminate on interfaces', () => {
    const snapshot = structuredClone(healthyMukubaSnapshotFixture);
    const physical = snapshot.relationships.find(
      relationship => relationship.relationshipType === 'physical_adjacency',
    );
    if (!physical) throw new Error('Fixture must include physical adjacency.');
    physical.source = { nodeId: snapshot.nodes[0].id };

    expect(() => assertTopologyInvariants(snapshot)).toThrow(/must terminate on interfaces/);
  });

  it('rejects inconsistent coverage totals', () => {
    const snapshot = structuredClone(healthyMukubaSnapshotFixture);
    snapshot.coverageSummary.totalEntities += 1;

    expect(() => assertTopologyInvariants(snapshot)).toThrow(/Coverage totalEntities/);
  });
});
