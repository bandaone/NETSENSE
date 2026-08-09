import { describe, expect, it } from 'vitest';
import {
  entityAssessmentSchema,
  operationalCriticalitySchema,
  topologySnapshotSchema,
} from './schemas';
import { healthyMukubaSnapshotFixture } from '../data/fixtures/healthyMukubaSite';

describe('Atlas topology schemas', () => {
  it('keeps health, freshness, coverage and management as independent dimensions', () => {
    const result = entityAssessmentSchema.safeParse({
      operationalHealth: 'healthy',
      freshness: 'stale',
      coverage: 'partial',
      managementState: 'maintenance',
      confidence: 0.61,
      assessedAt: '2026-08-02T12:00:00.000Z',
      reasonCodes: ['maintenance_window'],
      evidenceIds: ['evidence:test'],
    });

    expect(result.success).toBe(true);
  });

  it('constrains operational criticality to the ADR scale', () => {
    expect(operationalCriticalitySchema.safeParse(1).success).toBe(true);
    expect(operationalCriticalitySchema.safeParse(5).success).toBe(true);
    expect(operationalCriticalitySchema.safeParse(0).success).toBe(false);
    expect(operationalCriticalitySchema.safeParse(6).success).toBe(false);
  });

  it('rejects layout coordinates embedded in a topology snapshot', () => {
    const result = topologySnapshotSchema.safeParse({
      ...healthyMukubaSnapshotFixture,
      positions: { 'device:test': { x: 10, y: 20 } },
    });

    expect(result.success).toBe(false);
  });

  it('supports live snapshots without weakening synthetic labelling', () => {
    const liveSnapshot = {
      ...healthyMukubaSnapshotFixture,
      synthetic: false,
      syntheticDataNotice: null,
    };

    expect(topologySnapshotSchema.safeParse(liveSnapshot).success).toBe(true);
    expect(topologySnapshotSchema.safeParse({
      ...healthyMukubaSnapshotFixture,
      syntheticDataNotice: null,
    }).success).toBe(false);
    expect(topologySnapshotSchema.safeParse({
      ...liveSnapshot,
      syntheticDataNotice: 'Misleading fixture label',
    }).success).toBe(false);
  });
});
