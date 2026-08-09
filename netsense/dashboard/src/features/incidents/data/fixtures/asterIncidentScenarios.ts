import type { IncidentScenario } from '../../domain/types';
import type { EntityAssessment, EvidenceRecord, TopologySnapshot } from '../../../topology/domain/types';
import {
  ASTER_COLLABORATION_ID,
  ASTER_COMPUTE_ID,
  ASTER_CORE_01_ID,
  ASTER_FINANCE_ID,
  ASTER_IDENTITY_ID,
  ASTER_ORGANISATION_ID,
  ASTER_SITE_ID,
  healthyAsterEnterpriseSnapshotFixture,
} from '../../../topology/data/fixtures/healthyAsterEnterprise';

const INCIDENT_AT = '2026-08-06T08:31:00.000Z';
const ANALYSED_AT = '2026-08-06T08:31:35.000Z';
const COMPUTE_EVIDENCE_ID = 'evidence:aster:compute-unreachable';
const SERVICE_EVIDENCE_ID = 'evidence:aster:service-symptoms';
const FAILED_LINK_EVIDENCE_ID = 'evidence:aster:core-01-access-link-down';
export const ASTER_FAILED_REDUNDANT_LINK_ID = 'relationship:aster:core-01:access';
export const ASTER_SERVICE_DEPENDENCY_INCIDENT_ID = 'incident:aster:2026-08-06:identity-services';
export const ASTER_REDUNDANT_LINK_INCIDENT_ID = 'incident:aster:2026-08-06:redundant-access-link';

function assessment(
  source: EntityAssessment,
  operationalHealth: EntityAssessment['operationalHealth'],
  evidenceIds: string[],
): EntityAssessment {
  return {
    ...source,
    operationalHealth,
    assessedAt: ANALYSED_AT,
    confidence: 0.94,
    reasonCodes: ['synthetic_incident_observation'],
    evidenceIds,
  };
}

function withIncidentEvidence(
  snapshot: TopologySnapshot,
  evidence: EvidenceRecord[],
): TopologySnapshot {
  return {
    ...snapshot,
    snapshotId: `${snapshot.snapshotId}:incident`,
    generatedAt: ANALYSED_AT,
    observedAt: ANALYSED_AT,
    evidence: [...snapshot.evidence, ...evidence],
  };
}

export const asterServiceDependencyIncidentScenario: IncidentScenario = {
  schemaVersion: '1.0.0',
  incident: {
    id: ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
    tenantId: ASTER_ORGANISATION_ID,
    title: 'Identity-dependent services unavailable',
    severity: 'major',
    state: 'open',
    detectedAt: INCIDENT_AT,
    siteId: ASTER_SITE_ID,
  },
  analysedAt: ANALYSED_AT,
  snapshot: (() => {
    const snapshot = withIncidentEvidence(healthyAsterEnterpriseSnapshotFixture, [
      {
        id: COMPUTE_EVIDENCE_ID,
        sourceType: 'snmp',
        collectorId: 'collector:aster:synthetic-probe',
        observedAt: INCIDENT_AT,
        expiresAt: '2026-08-06T08:36:00.000Z',
        summary: 'The synthetic probe stopped receiving current management responses from the compute cluster.',
        confidenceContribution: 0.94,
        limitations: ['Reachability from one observation point does not establish power state or hardware failure.'],
      },
      {
        id: SERVICE_EVIDENCE_ID,
        sourceType: 'simulation',
        collectorId: 'collector:aster:synthetic-service-checks',
        observedAt: '2026-08-06T08:31:15.000Z',
        expiresAt: '2026-08-06T08:36:15.000Z',
        summary: 'Synthetic service checks recorded identity and collaboration unavailability after the compute symptom.',
        confidenceContribution: 0.92,
        limitations: ['Service checks establish availability only from the configured synthetic observation points.'],
      },
    ]);
    return {
      ...snapshot,
      nodes: snapshot.nodes.map(node => {
        if (node.id === ASTER_COMPUTE_ID) {
          return { ...node, assessment: assessment(node.assessment, 'unreachable', [COMPUTE_EVIDENCE_ID]) };
        }
        if ([ASTER_IDENTITY_ID, ASTER_COLLABORATION_ID, ASTER_FINANCE_ID].includes(node.id)) {
          return { ...node, assessment: assessment(node.assessment, 'degraded', [SERVICE_EVIDENCE_ID]) };
        }
        return node;
      }),
    };
  })(),
  observations: [
    {
      id: 'observation:aster:compute-unreachable',
      target: { kind: 'node', id: ASTER_COMPUTE_ID },
      symptomKind: 'unreachable',
      observedAt: INCIDENT_AT,
      knowledgeKind: 'observed',
      evidenceIds: [COMPUTE_EVIDENCE_ID],
      summary: 'Compute Cluster became unreachable from the synthetic monitoring probe.',
    },
    {
      id: 'observation:aster:identity-unavailable',
      target: { kind: 'node', id: ASTER_IDENTITY_ID },
      symptomKind: 'service_unavailable',
      observedAt: '2026-08-06T08:31:15.000Z',
      knowledgeKind: 'observed',
      evidenceIds: [SERVICE_EVIDENCE_ID],
      summary: 'Identity Platform service checks failed after the compute symptom.',
    },
    {
      id: 'observation:aster:collaboration-unavailable',
      target: { kind: 'node', id: ASTER_COLLABORATION_ID },
      symptomKind: 'service_unavailable',
      observedAt: '2026-08-06T08:31:20.000Z',
      knowledgeKind: 'observed',
      evidenceIds: [SERVICE_EVIDENCE_ID],
      summary: 'Collaboration Suite service checks failed after the identity symptom.',
    },
    {
      id: 'observation:aster:finance-degraded',
      target: { kind: 'node', id: ASTER_FINANCE_ID },
      symptomKind: 'degraded',
      observedAt: '2026-08-06T08:31:25.000Z',
      knowledgeKind: 'observed',
      evidenceIds: [SERVICE_EVIDENCE_ID],
      summary: 'Finance Platform response checks degraded; business impact is not confirmed.',
    },
  ],
  candidateTargets: [
    { kind: 'node', id: ASTER_COMPUTE_ID },
    { kind: 'node', id: ASTER_IDENTITY_ID },
    { kind: 'node', id: ASTER_CORE_01_ID },
  ],
};

export const asterRedundantLinkIncidentScenario: IncidentScenario = {
  schemaVersion: '1.0.0',
  incident: {
    id: ASTER_REDUNDANT_LINK_INCIDENT_ID,
    tenantId: ASTER_ORGANISATION_ID,
    title: 'One campus access uplink down',
    severity: 'warning',
    state: 'open',
    detectedAt: INCIDENT_AT,
    siteId: ASTER_SITE_ID,
  },
  analysedAt: ANALYSED_AT,
  snapshot: (() => {
    const snapshot = withIncidentEvidence(healthyAsterEnterpriseSnapshotFixture, [{
      id: FAILED_LINK_EVIDENCE_ID,
      sourceType: 'snmp',
      collectorId: 'collector:aster:synthetic-probe',
      observedAt: INCIDENT_AT,
      expiresAt: '2026-08-06T08:36:00.000Z',
      summary: 'Both endpoints report the synthetic Core 01 access uplink out of service.',
      confidenceContribution: 0.98,
      limitations: ['This observation does not establish the physical cause of the link loss.'],
    }]);
    return {
      ...snapshot,
      relationships: snapshot.relationships.map(relationship =>
        relationship.id === ASTER_FAILED_REDUNDANT_LINK_ID
          ? {
            ...relationship,
            status: 'down' as const,
            lastObservedAt: INCIDENT_AT,
            evidenceIds: [FAILED_LINK_EVIDENCE_ID],
          }
          : relationship,
      ),
    };
  })(),
  observations: [{
    id: 'observation:aster:core-01-access-link-down',
    target: { kind: 'relationship', id: ASTER_FAILED_REDUNDANT_LINK_ID },
    symptomKind: 'interface_down',
    observedAt: INCIDENT_AT,
    knowledgeKind: 'observed',
    evidenceIds: [FAILED_LINK_EVIDENCE_ID],
    summary: 'The primary Core 01 to Campus Access 01 uplink is down.',
  }],
  candidateTargets: [
    { kind: 'relationship', id: ASTER_FAILED_REDUNDANT_LINK_ID },
    { kind: 'node', id: ASTER_CORE_01_ID },
  ],
};
