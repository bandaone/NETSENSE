import { z } from 'zod';
import {
  TopologyNotFoundError,
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
const scopeEnvelopeSchema = z.object({
  tenantId: z.string(),
  organisation: z.object({ id: z.string() }).passthrough(),
  site: z.object({ id: z.string() }).passthrough(),
}).passthrough();

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
      throw new TopologyNotFoundError(request.scenarioId);
    }

    const scope = scopeEnvelopeSchema.safeParse(fixture);
    if (
      !scope.success ||
      scope.data.tenantId !== request.tenantId ||
      scope.data.organisation.id !== request.organisationId ||
      scope.data.site.id !== request.siteId
    ) {
      throw new TopologyNotFoundError(request.scenarioId);
    }
    return parseTopologySnapshot(fixture);
  }
}
