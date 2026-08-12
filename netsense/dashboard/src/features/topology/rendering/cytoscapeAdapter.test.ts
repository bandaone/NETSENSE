import { describe, expect, it } from 'vitest';
import {
  healthyMukubaOperationsLayout,
  healthyMukubaSnapshotFixture,
} from '../data/fixtures/healthyMukubaSite';
import { projectSnapshotToCytoscape } from './cytoscapeAdapter';

describe('projectSnapshotToCytoscape', () => {
  it('projects every node and resolvable relationship with stable IDs', () => {
    const elements = projectSnapshotToCytoscape(
      healthyMukubaSnapshotFixture,
      healthyMukubaOperationsLayout,
    );
    const ids = elements.map(element => element.data.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(elements.filter(element => element.group === 'nodes')).toHaveLength(
      healthyMukubaSnapshotFixture.nodes.length,
    );
    expect(elements.filter(element => element.group === 'edges')).toHaveLength(
      healthyMukubaSnapshotFixture.relationships.length,
    );
  });

  it('applies stored positions and retains semantic health and coverage data', () => {
    const elements = projectSnapshotToCytoscape(
      healthyMukubaSnapshotFixture,
      healthyMukubaOperationsLayout,
    );
    const core = elements.find(element => element.data.id === 'device:mukuba-copper-complex:core-01');

    expect(core?.position).toEqual(
      healthyMukubaOperationsLayout.positions['device:mukuba-copper-complex:core-01'],
    );
    expect(core?.data.operationalHealth).toBe('healthy');
    expect(core?.data.coverage).toBe('full');
    expect(core?.data.label).not.toContain('✓');
  });

  it('resolves interface endpoints to their owning devices', () => {
    const elements = projectSnapshotToCytoscape(healthyMukubaSnapshotFixture, undefined);
    const physicalEdge = elements.find(
      element => element.data.id === 'relationship:mukuba:edge-fw:core-01',
    );

    expect(physicalEdge?.data.source).toBe('device:mukuba-copper-complex:edge-firewall');
    expect(physicalEdge?.data.target).toBe('device:mukuba-copper-complex:core-01');
  });

  it('keeps relationship type separate from its evidence basis', () => {
    const snapshot = structuredClone(healthyMukubaSnapshotFixture);
    snapshot.relationships[0].knowledgeKind = 'configured';
    const elements = projectSnapshotToCytoscape(snapshot, healthyMukubaOperationsLayout);
    const relationship = elements.find(element => element.data.id === snapshot.relationships[0].id);

    expect(relationship?.data.relationshipLabel).toBe('Physical adjacency');
    expect(relationship?.data.knowledgeLabel).toBe('Configured');
    expect(relationship?.data.lineStyle).toBe('dashed');
  });

  it('preserves relationship health for theme-aware state rendering', () => {
    const snapshot = structuredClone(healthyMukubaSnapshotFixture);
    snapshot.relationships[0].status = 'down';
    const elements = projectSnapshotToCytoscape(snapshot, healthyMukubaOperationsLayout);
    const relationship = elements.find(element => element.data.id === snapshot.relationships[0].id);

    expect(relationship?.data.relationshipStatus).toBe('down');
    expect(relationship?.data.lineColor).toBe('var(--color-status-crit)');
  });

  it('provides semantic-zoom labels without hard-coding sector roles into shapes', () => {
    const elements = projectSnapshotToCytoscape(
      healthyMukubaSnapshotFixture,
      healthyMukubaOperationsLayout,
    );
    const plc = elements.find(element => element.data.id === 'device:mukuba-copper-complex:crusher-plc-01');

    expect(plc?.data.shape).toBe('round-rectangle');
    expect(plc?.data.labelMedium).toContain('Crusher PLC 01');
    expect(plc?.data.labelHigh).toContain('10.77.40.101');
    expect(plc?.data.coverage).toBe('partial');
    expect(plc?.data.width).toBeGreaterThan(plc?.data.height);
  });
});
