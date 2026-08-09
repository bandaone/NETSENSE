import { describe, expect, it } from 'vitest';
import { createAtlasRendererPalette, createAtlasStyles } from './atlasStyles';

describe('Atlas renderer environments', () => {
  it('uses declared tokens and safe Operations Dark fallbacks for missing values', () => {
    const palette = createAtlasRendererPalette(token => ({
      '--color-bg-canvas': '#fafafa',
      '--atlas-node-text': '#121212',
      '--atlas-group-opacity': '0.72',
    }[token] ?? ''));

    expect(palette.canvas).toBe('#fafafa');
    expect(palette.nodeText).toBe('#121212');
    expect(palette.groupOpacity).toBe(0.72);
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

    expect(dependency?.style['line-color']).toBe('--atlas-edge-dependency');
    expect(down?.style['line-color']).toBe('--color-status-crit');
    expect(node?.style.color).toBe('--atlas-node-text');
  });
});
