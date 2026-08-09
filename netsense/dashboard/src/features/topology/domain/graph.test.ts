import { describe, expect, it } from 'vitest';
import { healthyAsterEnterpriseSnapshotFixture } from '../data/fixtures/healthyAsterEnterprise';
import { dependencyDescendants, findHealthyPhysicalPath } from './graph';

describe('topology graph utilities', () => {
  it('traverses dependency direction rather than display edge direction', () => {
    const descendants = dependencyDescendants(
      healthyAsterEnterpriseSnapshotFixture,
      'device:aster:compute-cluster',
    );

    expect(descendants.get('application:aster:identity')).toBe(1);
    expect(descendants.get('capability:aster:finance-operations')).toBe(2);
    expect(descendants.has('device:aster:core-02')).toBe(false);
  });

  it('finds the redundant physical route when one access link is excluded', () => {
    const path = findHealthyPhysicalPath(
      healthyAsterEnterpriseSnapshotFixture,
      'device:aster:core-01',
      'device:aster:access-01',
      new Set(['relationship:aster:core-01:access']),
    );

    expect(path?.map(step => step.nodeId)).toEqual([
      'device:aster:core-02',
      'device:aster:access-01',
    ]);
  });
});
