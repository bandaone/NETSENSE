import { z } from 'zod';
import {
  TopologyDiffScopeError,
  TopologyDiffValidationError,
  UnsupportedTopologyDiffSchemaVersionError,
} from '../domain/errors';
import {
  TOPOLOGY_DIFF_SCHEMA_VERSION,
  topologyDiffSchema,
} from '../domain/diffSchemas';
import type { TopologyDiff } from '../domain/types';

const SUPPORTED_VERSIONS = [TOPOLOGY_DIFF_SCHEMA_VERSION] as const;
const versionEnvelopeSchema = z.object({ schemaVersion: z.string() }).passthrough();

export interface TopologyStreamCursor {
  tenantId: string;
  siteId: string;
  snapshotId: string;
  sequence: number;
}

export type TopologyDiffDecision =
  | { kind: 'apply'; nextCursor: TopologyStreamCursor }
  | { kind: 'ignore_duplicate'; sequence: number }
  | {
    kind: 'refresh_required';
    reason: 'sequence_gap' | 'snapshot_mismatch';
    expectedSequence: number;
  };

export function parseTopologyDiff(rawDiff: unknown): TopologyDiff {
  const versionEnvelope = versionEnvelopeSchema.safeParse(rawDiff);
  if (!versionEnvelope.success) {
    throw new TopologyDiffValidationError(
      'Topology update is missing a schemaVersion.',
      versionEnvelope.error.issues,
    );
  }
  if (versionEnvelope.data.schemaVersion !== TOPOLOGY_DIFF_SCHEMA_VERSION) {
    throw new UnsupportedTopologyDiffSchemaVersionError(
      versionEnvelope.data.schemaVersion,
      SUPPORTED_VERSIONS,
    );
  }
  const parsed = topologyDiffSchema.safeParse(rawDiff);
  if (!parsed.success) {
    throw new TopologyDiffValidationError('Topology update validation failed.', parsed.error.issues);
  }
  return parsed.data;
}

export function classifyTopologyDiff(
  cursor: TopologyStreamCursor,
  diff: TopologyDiff,
): TopologyDiffDecision {
  if (diff.tenantId !== cursor.tenantId || diff.siteId !== cursor.siteId) {
    throw new TopologyDiffScopeError();
  }
  if (diff.sequence <= cursor.sequence) {
    return { kind: 'ignore_duplicate', sequence: diff.sequence };
  }

  const expectedSequence = cursor.sequence + 1;
  if (diff.sequence !== expectedSequence) {
    return { kind: 'refresh_required', reason: 'sequence_gap', expectedSequence };
  }
  if (diff.baseSnapshotId !== cursor.snapshotId) {
    return { kind: 'refresh_required', reason: 'snapshot_mismatch', expectedSequence };
  }

  return {
    kind: 'apply',
    nextCursor: {
      tenantId: cursor.tenantId,
      siteId: cursor.siteId,
      snapshotId: diff.resultSnapshotId,
      sequence: diff.sequence,
    },
  };
}
