import { describe, expect, it } from 'vitest';
import { createAtlasRendererPalette, createAtlasStyles } from './atlasStyles';

describe('Atlas renderer environments', () => {
  it('uses declared tokens and safe Operations Dark fallbacks for missing values', () => {
    const palette = createAtlasRendererPalette(token => ({
      '--color-bg-canvas': '#fafafa',
      '--atlas-node-text': '#121212',
      '--atlas-group-opacity': '0.72',
      '--atlas-muted-node-opacity': '0.78',
      '--atlas-muted-edge-opacity': '0.22',
    }[token] ?? ''));

    expect(palette.canvas).toBe('#fafafa');
    expect(palette.nodeText).toBe('#121212');
    expect(palette.groupOpacity).toBe(0.72);
    expect(palette.mutedNodeOpacity).toBe(0.78);
    expect(palette.mutedEdgeOpacity).toBe(0.22);
    expect(palette.edgePhysical).toBe('#71808d');
  });

  it('maps semantic relationship and state colours into canvas styles', () => {
    const palette = createAtlasRendererPalette(token => token);
    const styles = createAtlasStyles(palette) as Array<{
      selector: string;
      style: Record<string, unknown>;
    }>;

    const dependency = styles.find(style =>
      style.selector === 'edge[relationshipType = "depends_on"]');
    const down = styles.find(style =>
      style.selector === 'edge[relationshipStatus = "down"]');
    const node = styles.find(style => style.selector === 'node.atlas-entity');
    const mutedNode = styles.find(style => style.selector === 'node.atlas-muted');
    const mutedEdge = styles.find(style => style.selector === 'edge.atlas-muted');

    expect(dependency?.style['line-color']).toBe('--atlas-edge-dependency');
    expect(down?.style['line-color']).toBe('--color-status-crit');
    expect(node?.style.color).toBe('--atlas-node-text');
    expect(mutedNode?.style.opacity).toBe(0.48);
    expect(mutedNode?.style['text-opacity']).toBe(1);
    expect(mutedEdge?.style.opacity).toBe(0.16);
  });
});
