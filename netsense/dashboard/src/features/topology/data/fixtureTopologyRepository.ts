import { z } from 'zod';
import {
  TopologyValidationError,
  UnsupportedTopologySchemaVersionError,
} from '../domain/errors';
import { assertTopologyInvariants } from '../domain/invariants';
import {
  TOPOLOGY_SCHEMA_VERSION,
  topologySnapshotSchema,
} from '../domain/schemas';
import type { TopologySnapshot } from '../domain/types';
import type { TopologyRepository, TopologySnapshotRequest } from './topologyRepository';

const SUPPORTED_VERSIONS = [TOPOLOGY_SCHEMA_VERSION] as const;
const versionEnvelopeSchema = z.object({ schemaVersion: z.string() }).passthrough();

export function parseTopologySnapshot(rawSnapshot: unknown): TopologySnapshot {
  const versionEnvelope = versionEnvelopeSchema.safeParse(rawSnapshot);
  if (!versionEnvelope.success) {
    throw new TopologyValidationError('Topology data is missing a schemaVersion.', versionEnvelope.error.issues);
  }

  if (versionEnvelope.data.schemaVersion !== TOPOLOGY_SCHEMA_VERSION) {
    throw new UnsupportedTopologySchemaVersionError(
      versionEnvelope.data.schemaVersion,
      SUPPORTED_VERSIONS,
    );
  }

  const parsed = topologySnapshotSchema.safeParse(rawSnapshot);
  if (!parsed.success) {
    throw new TopologyValidationError('Topology snapshot validation failed.', parsed.error.issues);
  }

  assertTopologyInvariants(parsed.data);
  return parsed.data;
}

export class FixtureTopologyRepository implements TopologyRepository {
  constructor(private readonly fixtures: ReadonlyMap<string, unknown>) {}

  async getSnapshot(request: TopologySnapshotRequest): Promise<TopologySnapshot> {
    const fixture = this.fixtures.get(request.scenarioId);
    if (!fixture) {
      throw new TopologyValidationError(`Unknown synthetic scenario: ${request.scenarioId}`);
    }

    const snapshot = parseTopologySnapshot(fixture);
    if (
      snapshot.organisation.id !== request.organisationId ||
      snapshot.site.id !== request.siteId
    ) {
      throw new TopologyValidationError('Requested scope does not match the fixture scope.');
    }
    return snapshot;
  }
}
