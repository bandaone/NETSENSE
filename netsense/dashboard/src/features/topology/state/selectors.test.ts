import { describe, expect, it } from 'vitest';
import { healthyMukubaSnapshotFixture } from '../data/fixtures/healthyMukubaSite';
import { selectSituationSummary } from './selectors';

describe('selectSituationSummary', () => {
  it('derives the healthy situation from the snapshot', () => {
    const summary = selectSituationSummary(healthyMukubaSnapshotFixture);

    expect(summary.environmentState).toBe('normal');
    expect(summary.environmentLabel).toBe('Operating normally');
    expect(summary.visibilityPercent).toBe(100);
    expect(summary.evidenceLabel).toBe('Evidence current');
    expect(summary.importantEntityCount).toBeGreaterThan(0);
    expect(summary).not.toHaveProperty('activeIncidents');
  });

  it('does not classify an empty scope as healthy', () => {
    const snapshot = structuredClone(healthyMukubaSnapshotFixture);
    snapshot.nodes = [];
    snapshot.coverageSummary = {
      totalEntities: 0,
      full: 0,
      partial: 0,
      none: 0,
      unsupported: 0,
    };

    const summary = selectSituationSummary(snapshot);
    expect(summary.environmentState).toBe('uncertain');
    expect(summary.environmentLabel).toBe('Insufficient evidence');
    expect(summary.visibilityLabel).toBe('No visibility');
    expect(summary.evidenceLabel).toBe('No evidence');
  });

  it('reports abnormal assessments without turning unknown into failure', () => {
    const degraded = structuredClone(healthyMukubaSnapshotFixture);
    degraded.nodes[0].assessment.operationalHealth = 'degraded';
    expect(selectSituationSummary(degraded).environmentLabel).toBe('Attention required');

    const unknown = structuredClone(healthyMukubaSnapshotFixture);
    unknown.nodes[0].assessment.operationalHealth = 'unknown';
    expect(selectSituationSummary(unknown).environmentLabel).toBe('Status uncertain');
  });

  it('surfaces stale and expired evidence independently from health', () => {
    const stale = structuredClone(healthyMukubaSnapshotFixture);
    stale.nodes[0].assessment.freshness = 'stale';
    expect(selectSituationSummary(stale).evidenceLabel).toBe('Evidence stale');
    expect(selectSituationSummary(stale).environmentLabel).toBe('Operating normally');

    const expired = structuredClone(healthyMukubaSnapshotFixture);
    expired.nodes[0].assessment.freshness = 'expired';
    expect(selectSituationSummary(expired).evidenceLabel).toBe('Evidence expired');
  });

  it('derives coverage from full and partial monitoring counts', () => {
    const snapshot = structuredClone(healthyMukubaSnapshotFixture);
    snapshot.coverageSummary = {
      totalEntities: 20,
      full: 10,
      partial: 5,
      none: 3,
      unsupported: 2,
    };

    const summary = selectSituationSummary(snapshot);
    expect(summary.visibilityPercent).toBe(75);
    expect(summary.visibilityDetail).toBe('10 full · 5 partial · 5 gaps');
  });
});
