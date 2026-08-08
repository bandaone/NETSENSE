import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { healthyAsterEnterpriseSnapshotFixture } from '../data/fixtures/healthyAsterEnterprise';
import { projectSnapshotForLens } from '../projection/lensProjection';
import {
  compileAtlasGraph,
  extractAtlasPositions,
  stabilizeAtlasPositions,
} from './atlasLayout';

describe('Atlas layout', () => {
  it('compiles generic containment, interface ports and orthogonal routing constraints', () => {
    const physical = projectSnapshotForLens(healthyAsterEnterpriseSnapshotFixture, 'physical');
    const graph = compileAtlasGraph(physical);
    const edgeZone = graph.children?.find(node => node.id === 'zone:aster:network-edge');
    const firewall = edgeZone?.children?.find(node => node.id === 'device:aster:perimeter-firewall');

    expect(graph.layoutOptions?.['elk.direction']).toBe('RIGHT');
    expect(graph.layoutOptions?.['elk.edgeRouting']).toBe('ORTHOGONAL');
    expect(firewall?.ports?.map(port => port.id)).toContain('interface:aster:firewall:core-01');
    expect(graph.edges?.find(edge => edge.id === 'relationship:aster:firewall:core-01')?.sources)
      .toEqual(['interface:aster:firewall:core-01']);
  });

  it('produces positions for every projected entity using ELK', async () => {
    const dependency = projectSnapshotForLens(healthyAsterEnterpriseSnapshotFixture, 'dependency');
    const elk = new ELK({ algorithms: ['layered'] });
    const result = await elk.layout(compileAtlasGraph(dependency));
    const positions = extractAtlasPositions(result);

    expect(Object.keys(positions)).toHaveLength(dependency.nodes.length);
    expect(Object.values(positions).every(position => Number.isFinite(position.x) && Number.isFinite(position.y))).toBe(true);
  });

  it('preserves established positions and inserts new entities without occupying an anchor', () => {
    const previous = { a: { x: 100, y: 100 }, b: { x: 300, y: 100 } };
    const stabilized = stabilizeAtlasPositions(
      { a: { x: 10, y: 10 }, b: { x: 210, y: 10 }, c: { x: 10, y: 10 } },
      previous,
    );

    expect(stabilized.a).toEqual(previous.a);
    expect(stabilized.b).toEqual(previous.b);
    expect(stabilized.c).not.toEqual(previous.a);
  });
});
