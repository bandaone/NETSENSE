import { IncidentInvariantError } from './errors';
import type { IncidentScenario, IncidentTarget } from './types';

function targetExists(scenario: IncidentScenario, target: IncidentTarget): boolean {
  if (target.kind === 'node') return scenario.snapshot.nodes.some(node => node.id === target.id);
  return scenario.snapshot.relationships.some(relationship => relationship.id === target.id);
}

export function assertIncidentScenarioInvariants(scenario: IncidentScenario): void {
  const violations: string[] = [];
  const evidenceIds = new Set(scenario.snapshot.evidence.map(record => record.id));
  const observationIds = new Set<string>();

  if (scenario.incident.siteId !== scenario.snapshot.site.id) {
    violations.push('Incident site must match the topology snapshot site.');
  }
  if (scenario.incident.tenantId !== scenario.snapshot.tenantId) {
    violations.push('Incident tenant must match the topology snapshot tenant.');
  }

  for (const observation of scenario.observations) {
    if (observationIds.has(observation.id)) {
      violations.push(`Duplicate observation ID: ${observation.id}`);
    }
    observationIds.add(observation.id);
    if (!targetExists(scenario, observation.target)) {
      violations.push(`Observation ${observation.id} references a missing target.`);
    }
    for (const evidenceId of observation.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        violations.push(`Observation ${observation.id} references missing evidence ${evidenceId}.`);
      }
    }
  }

  for (const target of scenario.candidateTargets) {
    if (!targetExists(scenario, target)) {
      violations.push(`Candidate ${target.kind}:${target.id} does not exist in the snapshot.`);
    }
  }

  if (violations.length > 0) throw new IncidentInvariantError(violations);
}
