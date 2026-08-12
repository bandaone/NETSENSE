import { describe, expect, it } from 'vitest';
import { healthyAsterEnterpriseSnapshotFixture } from '../data/fixtures/healthyAsterEnterprise';
import { healthyMukubaSnapshotFixture } from '../data/fixtures/healthyMukubaSite';
import { projectSnapshotForLens } from './lensProjection';

describe('projectSnapshotForLens', () => {
  it('projects a physical network without sector-specific application entities', () => {
    const physical = projectSnapshotForLens(healthyAsterEnterpriseSnapshotFixture, 'physical');

    expect(physical.nodes.some(node => node.kind === 'device')).toBe(true);
    expect(physical.nodes.some(node => node.kind === 'application')).toBe(false);
    expect(physical.relationships.every(relationship => [
      'physical_adjacency',
      'layer2_membership',
      'redundancy_peer',
      'conduit_crossing',
      'observed_by',
    ].includes(relationship.relationshipType))).toBe(true);
  });

  it('projects organisational dependencies while retaining their containing zones', () => {
    const dependency = projectSnapshotForLens(healthyAsterEnterpriseSnapshotFixture, 'dependency');

    expect(dependency.nodes.some(node => node.kind === 'capability')).toBe(true);
    expect(dependency.nodes.some(node => node.kind === 'zone')).toBe(true);
    expect(dependency.nodes.some(node => node.id === 'device:aster:perimeter-firewall')).toBe(false);
    expect(dependency.relationships.some(relationship => relationship.relationshipType === 'serves')).toBe(true);
    expect(dependency.relationships.some(relationship => relationship.relationshipType === 'physical_adjacency')).toBe(false);
    expect(dependency.coverageSummary.totalEntities).toBe(dependency.nodes.length);
  });

  it('shows observed communication only as operational evidence', () => {
    const snapshot = structuredClone(healthyAsterEnterpriseSnapshotFixture);
    snapshot.relationships = [{
      ...snapshot.relationships[0],
      relationshipType: 'observed_flow',
      knowledgeKind: 'observed',
    }];

    expect(projectSnapshotForLens(snapshot, 'operations').relationships).toHaveLength(1);
    expect(projectSnapshotForLens(snapshot, 'physical').relationships).toHaveLength(0);
    expect(projectSnapshotForLens(snapshot, 'dependency').relationships).toHaveLength(0);
  });

  it('uses the same projection engine for enterprise and industrial fixtures', () => {
    for (const snapshot of [healthyAsterEnterpriseSnapshotFixture, healthyMukubaSnapshotFixture]) {
      const operations = projectSnapshotForLens(snapshot, 'operations');
      expect(operations.nodes.length).toBeGreaterThan(0);
      expect(operations.relationships.length).toBeGreaterThan(0);
      expect(operations.nodes.every(node => !node.parentId || operations.nodes.some(parent => parent.id === node.parentId))).toBe(true);
    }
  });
});
