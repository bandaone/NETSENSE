import { TopologyInvariantError } from './errors';
import type { TopologySnapshot } from './types';

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function assertTopologyInvariants(snapshot: TopologySnapshot): void {
  const violations: string[] = [];
  const nodeIds = new Set(snapshot.nodes.map(node => node.id));
  const interfaceIds = new Set(snapshot.interfaces.map(networkInterface => networkInterface.id));
  const evidenceIds = new Set(snapshot.evidence.map(evidence => evidence.id));
  const allIds = [
    ...snapshot.nodes.map(node => node.id),
    ...snapshot.interfaces.map(networkInterface => networkInterface.id),
    ...snapshot.relationships.map(relationship => relationship.id),
    ...snapshot.evidence.map(evidence => evidence.id),
  ];

  for (const duplicate of duplicateValues(allIds)) {
    violations.push(`Duplicate stable ID: ${duplicate}`);
  }

  if (snapshot.site.organisationId !== snapshot.organisation.id) {
    violations.push(`Site ${snapshot.site.id} does not reference organisation ${snapshot.organisation.id}.`);
  }

  for (const node of snapshot.nodes) {
    if (node.parentId && !nodeIds.has(node.parentId)) {
      violations.push(`Node ${node.id} references missing parent ${node.parentId}.`);
    }
    for (const evidenceId of [...node.evidenceIds, ...node.assessment.evidenceIds]) {
      if (!evidenceIds.has(evidenceId)) {
        violations.push(`Node ${node.id} references missing evidence ${evidenceId}.`);
      }
    }
  }

  for (const networkInterface of snapshot.interfaces) {
    if (!nodeIds.has(networkInterface.deviceId)) {
      violations.push(
        `Interface ${networkInterface.id} references missing device ${networkInterface.deviceId}.`,
      );
    }
    for (const evidenceId of networkInterface.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        violations.push(
          `Interface ${networkInterface.id} references missing evidence ${evidenceId}.`,
        );
      }
    }
  }

  const endpointExists = (nodeId?: string, interfaceId?: string): boolean =>
    (nodeId !== undefined && nodeIds.has(nodeId)) ||
    (interfaceId !== undefined && interfaceIds.has(interfaceId));

  for (const relationship of snapshot.relationships) {
    if (!endpointExists(relationship.source.nodeId, relationship.source.interfaceId)) {
      violations.push(`Relationship ${relationship.id} has a missing source endpoint.`);
    }
    if (!endpointExists(relationship.target.nodeId, relationship.target.interfaceId)) {
      violations.push(`Relationship ${relationship.id} has a missing target endpoint.`);
    }
    if (
      relationship.relationshipType === 'physical_adjacency' &&
      (!relationship.source.interfaceId || !relationship.target.interfaceId)
    ) {
      violations.push(`Physical relationship ${relationship.id} must terminate on interfaces.`);
    }
    for (const evidenceId of relationship.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        violations.push(
          `Relationship ${relationship.id} references missing evidence ${evidenceId}.`,
        );
      }
    }
  }

  if (snapshot.coverageSummary.totalEntities !== snapshot.nodes.length) {
    violations.push('Coverage totalEntities must equal the number of topology nodes.');
  }

  const coverageTotal =
    snapshot.coverageSummary.full +
    snapshot.coverageSummary.partial +
    snapshot.coverageSummary.none +
    snapshot.coverageSummary.unsupported;
  if (coverageTotal !== snapshot.coverageSummary.totalEntities) {
    violations.push('Coverage category counts must add up to totalEntities.');
  }

  if (violations.length > 0) throw new TopologyInvariantError(violations);
}
