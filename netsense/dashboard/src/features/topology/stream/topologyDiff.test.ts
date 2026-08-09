import { describe, expect, it } from 'vitest';
import {
  TopologyDiffScopeError,
  TopologyDiffValidationError,
  UnsupportedTopologyDiffSchemaVersionError,
} from '../domain/errors';
import type { TopologyDiff } from '../domain/types';
import { classifyTopologyDiff, parseTopologyDiff, type TopologyStreamCursor } from './topologyDiff';

const cursor: TopologyStreamCursor = {
  tenantId: 'tenant:aster',
  siteId: 'site:central',
  snapshotId: 'snapshot:100',
  sequence: 40,
};

const diff: TopologyDiff = {
  schemaVersion: '1.0.0',
  diffId: 'diff:41',
  tenantId: cursor.tenantId,
  siteId: cursor.siteId,
  baseSnapshotId: cursor.snapshotId,
  resultSnapshotId: 'snapshot:101',
  sequence: 41,
  producedAt: '2026-08-09T11:00:00.000Z',
  operations: [{ op: 'node_removed', nodeId: 'device:retired' }],
};

describe('topology diff stream contract', () => {
  it('accepts exactly the next scoped update and advances the cursor', () => {
    expect(classifyTopologyDiff(cursor, parseTopologyDiff(diff))).toEqual({
      kind: 'apply',
      nextCursor: {
        ...cursor,
        snapshotId: diff.resultSnapshotId,
        sequence: diff.sequence,
      },
    });
  });

  it('ignores duplicate or stale sequence numbers idempotently', () => {
    expect(classifyTopologyDiff(cursor, { ...diff, sequence: 40 })).toEqual({
      kind: 'ignore_duplicate',
      sequence: 40,
    });
  });

  it('requires a bounded refresh after a gap or snapshot mismatch', () => {
    expect(classifyTopologyDiff(cursor, { ...diff, sequence: 43 })).toEqual({
      kind: 'refresh_required',
      reason: 'sequence_gap',
      expectedSequence: 41,
    });
    expect(classifyTopologyDiff(cursor, { ...diff, baseSnapshotId: 'snapshot:other' })).toEqual({
      kind: 'refresh_required',
      reason: 'snapshot_mismatch',
      expectedSequence: 41,
    });
  });

  it('rejects cross-scope updates before considering sequence state', () => {
    expect(() => classifyTopologyDiff(cursor, {
      ...diff,
      tenantId: 'tenant:other',
      sequence: 1,
    })).toThrow(TopologyDiffScopeError);
  });

  it('rejects unsupported, malformed, and permissive partial operations', () => {
    expect(() => parseTopologyDiff({ schemaVersion: '2.0.0' })).toThrow(
      UnsupportedTopologyDiffSchemaVersionError,
    );
    expect(() => parseTopologyDiff({})).toThrow(TopologyDiffValidationError);
    expect(() => parseTopologyDiff({
      ...diff,
      operations: [{ op: 'relationship_upserted', relationship: { id: 'partial' } }],
    })).toThrow(TopologyDiffValidationError);
  });
});
