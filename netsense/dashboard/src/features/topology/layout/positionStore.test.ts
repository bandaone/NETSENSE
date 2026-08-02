import { describe, expect, it } from 'vitest';
import {
  MUKUBA_SITE_ID,
  healthyMukubaOperationsLayout,
  healthyMukubaSnapshotFixture,
} from '../data/fixtures/healthyMukubaSite';
import { MemoryPositionStore } from './memoryPositionStore';

describe('MemoryPositionStore', () => {
  it('retrieves canonical layouts independently of topology data', () => {
    const store = new MemoryPositionStore([healthyMukubaOperationsLayout]);
    const profile = store.get({
      siteId: MUKUBA_SITE_ID,
      scopeId: MUKUBA_SITE_ID,
      lens: 'operations',
    });

    expect(profile?.profileId).toBe(healthyMukubaOperationsLayout.profileId);
    expect('positions' in healthyMukubaSnapshotFixture).toBe(false);
  });

  it('isolates a user override from the canonical layout', () => {
    const store = new MemoryPositionStore([healthyMukubaOperationsLayout]);
    store.save({
      ...healthyMukubaOperationsLayout,
      profileId: 'layout:mukuba:user:analyst-1',
      provenance: 'user_override',
      ownerUserId: 'analyst-1',
      positions: { ...healthyMukubaOperationsLayout.positions, 'device:test': { x: 1, y: 2 } },
    });

    expect(store.get({
      siteId: MUKUBA_SITE_ID,
      scopeId: MUKUBA_SITE_ID,
      lens: 'operations',
    })?.provenance).toBe('site_canonical');
    expect(store.get({
      siteId: MUKUBA_SITE_ID,
      scopeId: MUKUBA_SITE_ID,
      lens: 'operations',
      ownerUserId: 'analyst-1',
    })?.provenance).toBe('user_override');
  });

  it('requires ownership for user overrides', () => {
    const store = new MemoryPositionStore();
    expect(() => store.save({
      ...healthyMukubaOperationsLayout,
      provenance: 'user_override',
    })).toThrow(/requires ownerUserId/);
  });
});
