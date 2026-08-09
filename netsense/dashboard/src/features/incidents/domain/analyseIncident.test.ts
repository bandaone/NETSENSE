import { describe, expect, it } from 'vitest';
import {
  ASTER_COMPUTE_ID,
  ASTER_CUSTOMER_PORTAL_ID,
} from '../../topology/data/fixtures/healthyAsterEnterprise';
import {
  ASTER_FAILED_REDUNDANT_LINK_ID,
  asterRedundantLinkIncidentScenario,
  asterServiceDependencyIncidentScenario,
} from '../data/fixtures/asterIncidentScenarios';
import { IncidentInvariantError } from './errors';
import { analyseIncident } from './analyseIncident';

describe('analyseIncident', () => {
  it('ranks an earlier shared dependency from explicit observations', () => {
    const analysis = analyseIncident(asterServiceDependencyIncidentScenario);

    expect(analysis).toMatchObject({
      incidentId: asterServiceDependencyIncidentScenario.incident.id,
      tenantId: asterServiceDependencyIncidentScenario.incident.tenantId,
      siteId: asterServiceDependencyIncidentScenario.incident.siteId,
    });
    expect(analysis.probableCauseCandidates[0]).toMatchObject({
      target: { kind: 'node', id: ASTER_COMPUTE_ID },
      rank: 1,
      confidence: 'high',
    });
    expect(analysis.probableCauseCandidates[0].supportingFactors.map(factor => factor.code)).toEqual(
      expect.arrayContaining(['direct_symptom', 'temporal_precedence', 'shared_downstream_symptoms']),
    );
  });

  it('distinguishes confirmed observations from downstream risk', () => {
    const analysis = analyseIncident(asterServiceDependencyIncidentScenario);
    const impact = new Map(analysis.impact.map(item => [item.entityId, item.classification]));

    expect(impact.get(ASTER_COMPUTE_ID)).toBe('confirmed_affected');
    expect(impact.get('application:aster:identity')).toBe('confirmed_affected');
    expect(impact.get('application:aster:finance')).toBe('at_risk');
    expect(analysis.limitations).toContain(
      'No people or user count is inferred because the scenario contains no configured population evidence.',
    );
  });

  it('does not turn stale downstream evidence into an outage claim', () => {
    const scenario = {
      ...asterServiceDependencyIncidentScenario,
      snapshot: {
        ...asterServiceDependencyIncidentScenario.snapshot,
        nodes: asterServiceDependencyIncidentScenario.snapshot.nodes.map(node =>
          node.id === ASTER_CUSTOMER_PORTAL_ID
            ? { ...node, assessment: { ...node.assessment, freshness: 'stale' as const } }
            : node,
        ),
      },
    };

    const analysis = analyseIncident(scenario);
    expect(analysis.impact.find(item => item.entityId === ASTER_CUSTOMER_PORTAL_ID)?.classification)
      .toBe('unknown');
  });

  it('finds a healthy alternate path and avoids a false downstream outage', () => {
    const analysis = analyseIncident(asterRedundantLinkIncidentScenario);

    expect(analysis.probableCauseCandidates[0].target).toEqual({
      kind: 'relationship',
      id: ASTER_FAILED_REDUNDANT_LINK_ID,
    });
    expect(analysis.alternatePaths[0]).toMatchObject({
      failedRelationshipId: ASTER_FAILED_REDUNDANT_LINK_ID,
      state: 'healthy_path_observed',
    });
    expect(analysis.alternatePaths[0].pathNodeIds.length).toBeGreaterThan(2);
    expect(analysis.impact.every(item => item.classification !== 'confirmed_affected')).toBe(true);
    expect(analysis.impact.every(item => item.classification === 'unaffected_alternate_path')).toBe(true);
  });

  it('rejects missing candidate references at the domain boundary', () => {
    const scenario = {
      ...asterServiceDependencyIncidentScenario,
      candidateTargets: [{ kind: 'node' as const, id: 'device:missing' }],
    };

    expect(() => analyseIncident(scenario)).toThrow(IncidentInvariantError);
  });

  it('rejects unsupported incident schema versions', () => {
    expect(() => analyseIncident({
      ...asterServiceDependencyIncidentScenario,
      schemaVersion: '2.0.0',
    })).toThrow();
  });
});
