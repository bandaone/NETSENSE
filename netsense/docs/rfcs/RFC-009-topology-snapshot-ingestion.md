# RFC-009: Ordered Topology Snapshot Ingestion

**Author:** NetSense Engineering

**Date:** 2026-08-11

**Status:** Accepted for implementation

## Summary

Add a bounded, authenticated HTTP boundary through which a NetSense Probe can
submit a complete topology snapshot. The platform validates the portable
topology contract and graph invariants, binds the snapshot to the token tenant,
site, and probe identity, persists it atomically, and records an ordered
per-probe ingestion cursor and idempotency receipt.

Complete snapshots are the first ingestion primitive. Incremental topology
diff ingestion and WebSocket fan-out remain follow-on work after snapshot
ordering, storage, and recovery behaviour are proven.

## Service and Customer Outcome

- Service: S1 — Network Truth Assessment
- Commercial proof gate: A — Live network truth
- Operator decision improved: determine what is present, how it is connected,
  and whether the supporting evidence is current and attributable.
- Measurable customer outcome: Atlas can load a live, tenant-isolated snapshot
  produced by an authorised probe without fixture substitution.

## Motivation and Evidence

The platform currently reads pre-seeded snapshots but has no authorised write
path for collected topology. The dashboard therefore cannot receive live
network evidence. Existing exact JSON Schemas, graph invariants, forced RLS,
and repository ports provide the required foundation without introducing a
message broker or new storage technology.

## Business Rules and Invariants

1. Tenant identity comes only from the verified token and must match the
   snapshot.
2. Site identity in the path must match the snapshot site.
3. Only a principal with the dedicated `probe` role may ingest.
4. Every evidence record in this boundary must identify the authenticated
   probe subject as its collector. Manual/import/configuration evidence needs a
   different future boundary.
5. Ingested snapshots must be non-synthetic.
6. One authoritative snapshot producer is allowed per site until an approved
   cross-probe topology merger exists. A different collector fails closed
   rather than replacing a partial site view.
7. Sequence is positive and strictly advances by one after the first accepted
   sequence for a tenant, site, and probe.
8. An exact retry is idempotent. Reusing an idempotency key for different
   content, reusing a sequence with different content, sequence regression,
   or a sequence gap is a conflict.
9. Observation time may remain equal but must not regress. Generated time must
   not precede observation time or exceed the authoritative platform clock by
   more than five minutes.
10. Snapshot persistence, cursor advancement, and idempotency receipt commit in
   one transaction.
11. Operator roles cannot ingest, and probe roles cannot read topology or
    mutate incidents.

## Detailed Design

`POST /api/v1/sites/{siteId}/topology/snapshots` accepts a
`TopologySnapshot` body and requires `X-Topology-Sequence` and
`Idempotency-Key` headers. The response is an exact
`TopologyIngestionReceipt` with accepted/duplicate status and a server-derived
acceptance time.

The repository stores:

- immutable topology snapshot rows;
- one locked cursor per tenant/site/probe containing the last sequence,
  snapshot, observation time, and content fingerprint;
- idempotency receipts scoped by tenant/probe/key.

The first valid positive sequence establishes a cursor. This supports a probe
that retained its durable sequence before platform registration while still
making every later gap observable.

## Security, Privacy, and Safety Boundaries

- RS256 authentication and token lifetime validation remain unchanged.
- `probe` is a least-privilege role used only for ingestion.
- The API never accepts tenant or collector authority from headers or routes.
- Forced RLS and JSON scope constraints protect all new tenant tables.
- Problem responses do not echo snapshot contents, database errors, or
  identities outside the authenticated scope.
- This boundary stores observations; it sends no traffic to monitored devices.

## Failure and Recovery Behaviour

- Invalid schemas, graph references, scope, evidence collector, and timestamps
  fail before persistence.
- Duplicate delivery returns the recorded or newly generated duplicate
  receipt without inserting another snapshot.
- Gaps and stale sequences return explicit non-disclosing conflicts so the
  probe can stop and reconcile rather than silently corrupt order.
- Database failure rolls back snapshot, cursor, and receipt together.
- A new idempotency key for the exact current sequence/content is accepted as
  a duplicate and recorded atomically.

## Alternatives and Trade-offs

- **Diff-first ingestion:** smaller payloads, but recovery and base-snapshot
  correctness would be harder to prove before a live source of truth exists.
- **Unordered last-write-wins snapshots:** simpler, but permits delayed probes
  to replace current evidence.
- **Message broker first:** useful at scale, but adds an unproven operational
  dependency before throughput measurements justify it.

Complete ordered snapshots reuse current contracts and storage while leaving a
clean later path to diff ingestion.

## Non-Goals

- packet capture and probe implementation;
- metric/event ingestion;
- topology diff ingestion or WebSocket streaming;
- cross-probe topology merging and authoritative-collector handover;
- probe provisioning or token issuance;
- retention and snapshot compaction;
- manual/configuration evidence ingestion;
- rate limiting and readiness, which remain the next platform hardening slice.

## Implementation Plan

1. Add the receipt contract and OpenAPI operation.
2. Add the probe role, application boundary, repository command, and in-memory
   behaviour.
3. Add tenant-isolated PostgreSQL cursor and idempotency persistence.
4. Add the migration and runtime grants documentation.
5. Add API, repository, contract, authorization, concurrency, and rollback
   tests.
6. Add the live Atlas HTTP repository and explicit fixture/live composition.

## Testing Approach

- Unit: scope, collector, synthetic, timestamp, sequence, and idempotency rules.
- API: authentication, role separation, safe problems, receipt contract, and
  exact retry behaviour.
- PostgreSQL: RLS, atomicity, concurrent duplicates, gap rollback, and JSON
  scope constraints.
- Frontend: URL/header construction, authentication absence, safe HTTP
  failures, scope rejection, schema rejection, and abort propagation.
- Regression: existing incident workflow, fixture mode, build, lint, contract
  generation, and database tests.

## Release and Implementation Truth

This RFC implements a live topology snapshot boundary and an Atlas HTTP
adapter. It does not implement the physical probe, continuous streaming,
metrics, alerts, or complete Network Truth Assessment service. Gate A remains
open until a real probe and authorised-network validation pass.

## Rollback Plan

Disable the ingestion route at deployment, return Atlas to explicit fixture
mode, and downgrade migration `20260811_0002`. Previously accepted snapshots
must be exported before downgrade if retention is required.

## Post-Implementation Engineering Review

Record the separate review in the product review document after all applicable
quality gates run.

## Open Questions

- [ ] Set retention and compaction from measured snapshot volume.
- [ ] Decide whether probe provisioning requires a separate JWT issuer or
      audience before external pilot deployment.
