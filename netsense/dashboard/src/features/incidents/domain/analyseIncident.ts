import {
  dependencyDescendants,
  findHealthyPhysicalPath,
  resolveEndpointNodeId,
} from '../../topology/domain/graph';
import type { TopologySnapshot } from '../../topology/domain/types';
import { assertIncidentScenarioInvariants } from './invariants';
import { incidentAnalysisSchema, incidentScenarioSchema } from './schemas';
import type {
  AlternatePathFinding,
  AnalysisFactor,
  ConfidenceBand,
  ImpactAssessment,
  IncidentAnalysis,
  IncidentObservation,
  IncidentScenario,
  IncidentTarget,
  RootCauseCandidate,
  SafeCheck,
} from './types';

const DIRECT_OBSERVATION_WEIGHT: Record<IncidentObservation['symptomKind'], number> = {
  unreachable: 0.3,
  service_unavailable: 0.3,
  interface_down: 0.27,
  degraded: 0.2,
  error_rate_increase: 0.15,
};

function targetKey(target: IncidentTarget): string {
  return `${target.kind}:${target.id}`;
}

function clampScore(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}

function confidenceBand(score: number): ConfidenceBand {
  if (score >= 0.72) return 'high';
  if (score >= 0.45) return 'moderate';
  return 'low';
}

function targetName(snapshot: TopologySnapshot, target: IncidentTarget): string {
  if (target.kind === 'node') {
    return snapshot.nodes.find(node => node.id === target.id)?.displayName ?? target.id;
  }
  const relationship = snapshot.relationships.find(candidate => candidate.id === target.id);
  if (!relationship) return target.id;
  const sourceId = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
  const targetId = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
  const sourceName = snapshot.nodes.find(node => node.id === sourceId)?.displayName ?? 'unknown source';
  const targetNodeName = snapshot.nodes.find(node => node.id === targetId)?.displayName ?? 'unknown target';
  return `${sourceName} to ${targetNodeName}`;
}

function candidateFactors(
  scenario: IncidentScenario,
  target: IncidentTarget,
  earliestObservationMs: number,
): { supporting: AnalysisFactor[]; weakening: AnalysisFactor[]; downstreamCount: number } {
  const supporting: AnalysisFactor[] = [];
  const weakening: AnalysisFactor[] = [];
  const direct = scenario.observations.filter(observation => targetKey(observation.target) === targetKey(target));
  const directEvidenceIds = [...new Set(direct.flatMap(observation => observation.evidenceIds))];

  if (direct.length > 0) {
    const strongest = Math.max(...direct.map(observation => DIRECT_OBSERVATION_WEIGHT[observation.symptomKind]));
    supporting.push({
      code: 'direct_symptom',
      summary: `${targetName(scenario.snapshot, target)} has a directly observed symptom.`,
      weight: strongest,
      evidenceIds: directEvidenceIds,
    });
    const firstObservedMs = Math.min(...direct.map(observation => Date.parse(observation.observedAt)));
    if (firstObservedMs === earliestObservationMs) {
      supporting.push({
        code: 'temporal_precedence',
        summary: 'This symptom was among the earliest observations in the incident timeline.',
        weight: 0.2,
        evidenceIds: directEvidenceIds,
      });
    }
  } else {
    weakening.push({
      code: 'no_direct_symptom',
      summary: 'No direct symptom is recorded for this candidate.',
      weight: -0.16,
      evidenceIds: [],
    });
  }

  let downstreamCount = 0;
  if (target.kind === 'node') {
    const descendants = dependencyDescendants(scenario.snapshot, target.id);
    const downstream = scenario.observations.filter(
      observation => observation.target.kind === 'node' && descendants.has(observation.target.id),
    );
    downstreamCount = new Set(downstream.map(observation => observation.target.id)).size;
    if (downstreamCount > 0) {
      supporting.push({
        code: 'shared_downstream_symptoms',
        summary: `${downstreamCount} observed downstream ${downstreamCount === 1 ? 'entity is' : 'entities are'} linked through explicit dependencies.`,
        weight: Math.min(0.36, downstreamCount * 0.12),
        evidenceIds: [...new Set(downstream.flatMap(observation => observation.evidenceIds))],
      });
    }

    const node = scenario.snapshot.nodes.find(candidate => candidate.id === target.id);
    if (node?.assessment.freshness === 'current') {
      supporting.push({
        code: 'current_assessment',
        summary: 'The candidate assessment is current.',
        weight: 0.12,
        evidenceIds: node.assessment.evidenceIds,
      });
    } else if (node) {
      weakening.push({
        code: 'stale_candidate_evidence',
        summary: `The candidate assessment is ${node.assessment.freshness.replace(/_/g, ' ')}.`,
        weight: node.assessment.freshness === 'stale' ? -0.18 : -0.3,
        evidenceIds: node.assessment.evidenceIds,
      });
    }
  }

  if (target.kind === 'relationship') {
    const alternate = alternatePathForRelationship(scenario.snapshot, target.id);
    if (alternate?.state === 'healthy_path_observed') {
      weakening.push({
        code: 'healthy_alternate_path',
        summary: 'A healthy alternate physical path remains observed between the link endpoints.',
        weight: -0.24,
        evidenceIds: alternate.evidenceIds,
      });
    }
  }

  return { supporting, weakening, downstreamCount };
}

function scoreCandidates(scenario: IncidentScenario): RootCauseCandidate[] {
  const earliestObservationMs = Math.min(
    ...scenario.observations.map(observation => Date.parse(observation.observedAt)),
  );
  const uniqueTargets = [...new Map(
    scenario.candidateTargets.map(target => [targetKey(target), target]),
  ).values()];
  const scored = uniqueTargets.map(target => {
    const factors = candidateFactors(scenario, target, earliestObservationMs);
    const rawScore = [...factors.supporting, ...factors.weakening]
      .reduce((sum, factor) => sum + factor.weight, 0);
    const score = clampScore(rawScore);
    return {
      target,
      rank: 0,
      score,
      confidence: confidenceBand(score),
      supportingFactors: factors.supporting,
      weakeningFactors: factors.weakening,
      downstreamObservationCount: factors.downstreamCount,
    };
  });

  return scored
    .sort((left, right) => right.score - left.score || targetKey(left.target).localeCompare(targetKey(right.target)))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function alternatePathForRelationship(
  snapshot: TopologySnapshot,
  relationshipId: string,
): AlternatePathFinding | undefined {
  const relationship = snapshot.relationships.find(candidate => candidate.id === relationshipId);
  if (!relationship || relationship.relationshipType !== 'physical_adjacency') return undefined;
  const sourceNodeId = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
  const targetNodeId = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
  if (!sourceNodeId || !targetNodeId) return undefined;
  const path = findHealthyPhysicalPath(snapshot, sourceNodeId, targetNodeId, new Set([relationshipId]));
  if (!path) {
    return {
      failedRelationshipId: relationshipId,
      sourceNodeId,
      targetNodeId,
      state: 'no_healthy_path_observed',
      pathNodeIds: [],
      pathRelationshipIds: [],
      evidenceIds: relationship.evidenceIds,
      summary: 'No healthy alternate physical path is present in the current observed topology.',
    };
  }
  const pathRelationships = path
    .map(step => snapshot.relationships.find(candidate => candidate.id === step.relationshipId))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  return {
    failedRelationshipId: relationshipId,
    sourceNodeId,
    targetNodeId,
    state: 'healthy_path_observed',
    pathNodeIds: [sourceNodeId, ...path.map(step => step.nodeId)],
    pathRelationshipIds: path.map(step => step.relationshipId),
    evidenceIds: [...new Set(pathRelationships.flatMap(candidate => candidate.evidenceIds))],
    summary: 'A healthy alternate physical path remains observed between the failed link endpoints.',
  };
}

function classifyImpact(
  scenario: IncidentScenario,
  topCandidate: RootCauseCandidate,
  alternatePaths: AlternatePathFinding[],
): ImpactAssessment[] {
  const observedNodes = new Map<string, IncidentObservation[]>();
  for (const observation of scenario.observations) {
    if (observation.target.kind !== 'node') continue;
    const observations = observedNodes.get(observation.target.id) ?? [];
    observations.push(observation);
    observedNodes.set(observation.target.id, observations);
  }

  const impact = new Map<string, ImpactAssessment>();
  for (const [entityId, observations] of observedNodes) {
    const confirmsImpact = observations.some(observation =>
      ['unreachable', 'service_unavailable'].includes(observation.symptomKind),
    );
    impact.set(entityId, {
      entityId,
      classification: confirmsImpact ? 'confirmed_affected' : 'at_risk',
      reasons: [confirmsImpact
        ? 'A direct unavailability observation confirms impact from the selected observation point.'
        : 'A direct degradation observation is present, but service impact is not confirmed.'],
      evidenceIds: [...new Set(observations.flatMap(observation => observation.evidenceIds))],
    });
  }

  if (topCandidate.target.kind === 'node') {
    const descendants = dependencyDescendants(scenario.snapshot, topCandidate.target.id);
    for (const [entityId, distance] of descendants) {
      if (impact.has(entityId)) continue;
      const node = scenario.snapshot.nodes.find(candidate => candidate.id === entityId);
      if (!node) continue;
      if (['stale', 'expired', 'never_observed'].includes(node.assessment.freshness)) {
        impact.set(entityId, {
          entityId,
          classification: 'unknown',
          reasons: ['Current impact cannot be determined because the entity evidence is not current.'],
          evidenceIds: node.assessment.evidenceIds,
        });
      } else if (node.assessment.operationalHealth === 'healthy') {
        impact.set(entityId, {
          entityId,
          classification: 'at_risk',
          reasons: [`The entity is ${distance} explicit dependency ${distance === 1 ? 'step' : 'steps'} downstream, but remains observed healthy.`],
          evidenceIds: node.assessment.evidenceIds,
        });
      } else {
        impact.set(entityId, {
          entityId,
          classification: 'likely_affected',
          reasons: ['The entity is downstream of the probable source and is not currently assessed healthy.'],
          evidenceIds: node.assessment.evidenceIds,
        });
      }
    }
  } else {
    const alternate = alternatePaths.find(path => path.failedRelationshipId === topCandidate.target.id);
    if (alternate?.state === 'healthy_path_observed') {
      for (const entityId of [alternate.sourceNodeId, alternate.targetNodeId]) {
        impact.set(entityId, {
          entityId,
          classification: 'unaffected_alternate_path',
          reasons: ['A healthy alternate physical path is observed between the failed link endpoints.'],
          evidenceIds: alternate.evidenceIds,
        });
      }
    }
  }
  return [...impact.values()].sort((left, right) => left.entityId.localeCompare(right.entityId));
}

function safeChecks(scenario: IncidentScenario, target: IncidentTarget): SafeCheck[] {
  const name = targetName(scenario.snapshot, target);
  const checks: SafeCheck[] = [
    {
      id: `check:${scenario.incident.id}:evidence`,
      category: 'passive_verification',
      title: 'Verify the latest passive observations',
      rationale: `Confirm that the evidence associated with ${name} is still current and consistent across collectors.`,
      target,
    },
    {
      id: `check:${scenario.incident.id}:network`,
      category: 'safe_network_check',
      title: target.kind === 'relationship' ? 'Inspect both link endpoints' : 'Inspect upstream reachability and interfaces',
      rationale: 'Compare interface state, counters, neighbour evidence, and reachability from an authorised management path.',
      target,
    },
  ];
  const node = target.kind === 'node'
    ? scenario.snapshot.nodes.find(candidate => candidate.id === target.id)
    : undefined;
  if (node?.kind === 'device') {
    checks.push({
      id: `check:${scenario.incident.id}:physical`,
      category: 'physical_inspection',
      title: 'Request a local physical check if remote evidence remains inconclusive',
      rationale: 'Power, cabling, and hardware indicators are not directly established by topology evidence.',
      target,
    });
  }
  checks.push({
    id: `check:${scenario.incident.id}:authorisation`,
    category: 'requires_authorisation',
    title: 'Obtain change approval before remediation',
    rationale: 'NetSense analysis does not authorise configuration, failover, isolation, restart, or control actions.',
    target,
  });
  if (node?.tags.includes('ot')) {
    checks.push({
      id: `check:${scenario.incident.id}:ot-control`,
      category: 'not_supported',
      title: 'Do not issue an active control action from NetSense',
      rationale: 'Passive network symptoms are insufficient authority for an OT control action.',
      target,
    });
  }
  return checks;
}

function analysisLimitations(
  scenario: IncidentScenario,
  candidates: RootCauseCandidate[],
): string[] {
  const limitations = [
    'No people or user count is inferred because the scenario contains no configured population evidence.',
  ];
  if (scenario.snapshot.synthetic) {
    limitations.push('This is a deterministic synthetic scenario and does not represent a real installation.');
  }
  if (scenario.snapshot.nodes.some(node => node.assessment.managementState === 'passive_only')) {
    limitations.push('Some entities are passive-only; absence of an observation does not prove healthy operation.');
  }
  if (candidates[0]?.confidence !== 'high') {
    limitations.push('The leading candidate is not high confidence; alternative explanations must remain visible.');
  }
  return limitations;
}

export function analyseIncident(input: unknown): IncidentAnalysis {
  const scenario = incidentScenarioSchema.parse(input);
  assertIncidentScenarioInvariants(scenario);
  const candidates = scoreCandidates(scenario);
  const alternatePaths = scenario.candidateTargets.flatMap(target => {
    if (target.kind !== 'relationship') return [];
    const finding = alternatePathForRelationship(scenario.snapshot, target.id);
    return finding ? [finding] : [];
  });
  const result: IncidentAnalysis = {
    schemaVersion: '1.0.0',
    incidentId: scenario.incident.id,
    analysedAt: scenario.analysedAt,
    probableCauseCandidates: candidates,
    impact: classifyImpact(scenario, candidates[0], alternatePaths),
    alternatePaths,
    safeNextChecks: safeChecks(scenario, candidates[0].target),
    limitations: analysisLimitations(scenario, candidates),
  };
  return incidentAnalysisSchema.parse(result);
}
