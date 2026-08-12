import { describe, expect, it } from 'vitest';
import { automaticAtlasZoomLimit } from './viewportPolicy';

describe('automaticAtlasZoomLimit', () => {
  it('prevents a pair of observed endpoints from becoming oversized cards', () => {
    expect(automaticAtlasZoomLimit(1)).toBe(1.35);
    expect(automaticAtlasZoomLimit(2)).toBe(1.35);
  });

  it('allows a little more scale for a sparse cluster and leaves larger maps unconstrained', () => {
    expect(automaticAtlasZoomLimit(6)).toBe(1.25);
    expect(automaticAtlasZoomLimit(7)).toBeUndefined();
    expect(automaticAtlasZoomLimit(0)).toBeUndefined();
  });
});
