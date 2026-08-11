# NetSense Topology Ingestion Engineering Review — 2026-08-12

**Scope:** authenticated full-snapshot topology ingestion, durable ordering and
idempotency, authoritative collector protection, Atlas live HTTP topology
loading, generated contracts, migrations, and cross-layer tests.

## Outcome

Conditionally accepted as the first live topology transport slice. The code
provides an explicit and test-backed route from an authenticated collector to a
tenant-isolated current snapshot, and from the read API to Atlas. It does not
yet discover a network, stream topology changes, or constitute a deployable
continuous-monitoring service.

The database-backed regression and migration rerun after the final readability
refactor is pending because the execution environment did not grant access to
start the isolated PostgreSQL container. The earlier pre-refactor integration
run passed; this review does not silently treat that earlier result as proof of
the final refactor.

## Golden-rule review

### 1. Correctness

An authenticated principal with the `probe` role can submit a non-synthetic,
contract-valid snapshot for its bound tenant, site, and collector. The platform
accepts the first sequence and only the immediate successor, returns the stored
receipt for an exact idempotent replay, classifies exact same-sequence content
as a duplicate, and rejects stale, gapped, conflicting, or time-regressing
input. Snapshot, cursor, and receipt changes share one transaction.

### 2. Cyclomatic complexity

Sequence classification is a small pure domain function shared by the memory
and PostgreSQL adapters. The PostgreSQL public ingestion method coordinates
validation, locking, replay, classification, persistence, and receipt creation;
database details are separated into focused helpers. No unsupported numerical
complexity score is claimed.

### 3. Cognitive complexity

The ingestion order is visible in the code: validate, establish tenant
transaction, lock site scope, replay by idempotency key, classify sequence,
persist accepted state, and record a receipt. Domain decisions do not depend on
SQLAlchemy object lifecycle or hidden middleware state.

### 4. Readability

Names use the product language: snapshot, site, collector, observation,
sequence, cursor, receipt, replay, and authoritative collector. Conflict codes
identify the failed invariant without reflecting database internals.

### 5. Maintainability

The portable schema remains generated from the TypeScript source of truth and
is validated again in Python and in the browser. Repository protocols preserve
the memory adapter for deterministic tests. RFC-009 fixes the boundary before
topology diffs or collector coordination are introduced.

### 6. Coupling and cohesion

Authentication and role policy, transport validation, ingestion invariants,
persistence, frontend HTTP adaptation, and UI loading state remain separate.
The frontend depends on a topology repository port rather than on `fetch`
throughout the component tree.

### 7. Duplication

Memory and PostgreSQL adapters share validation, fingerprinting, sequence
classification, timestamp parsing, and receipt construction. Persistence
mechanics remain adapter-specific. Generated JSON Schema and migration DDL are
intentionally materialised artifacts with different lifecycle owners.

### 8. Naming and conventions

The implementation follows the existing async repository architecture,
Python/TypeScript naming conventions, exact-contract validation, Ruff rules,
Vitest tests, and Alembic revision structure. Runtime mode is explicit rather
than inferred from hostnames.

### 9. Error handling

Missing or invalid headers, malformed contracts, scope mismatch, synthetic or
non-probe evidence, future clocks, observation regression, sequence conflict,
sequence gaps, snapshot identifier reuse, idempotency conflict, and collector
conflict have bounded responses. The frontend maps authentication,
authorisation, absence, invalid JSON, invalid contract, wrong scope, abort, and
generic dependency failure without displaying response bodies that could leak
server details.

### 10. Security

Only the dedicated probe role may ingest; probe identities cannot read or
mutate operator resources. Tenant scope comes from the verified token, while
site and collector bindings are checked before persistence. Both new tables
enable and force tenant RLS. The development live adapter reads a token only
from tab-scoped session storage and sends no cookies; this is not a substitute
for a production identity-provider session. Body-size and rate limits remain a
deployment blocker.

### 11. Test coverage

The final refactor passes Ruff plus 21 targeted API and ingestion tests. The
frontend previously passed 76 unit tests and 16 Playwright browser workflows,
including accessibility checks. PostgreSQL tests cover atomic persistence,
concurrent replay, gap rollback, current-snapshot reads, collector conflict,
RLS policy presence, and grants. The complete database-backed rerun remains
pending for the reason recorded in the outcome and must pass before this slice
is merged or represented as release-ready.

### 12. Architectural consistency

The slice implements the Platform/Probe/Atlas boundary in the service charter:
the probe is the only writer, PostgreSQL is the durable tenant authority, and
Atlas consumes validated read contracts. It does not introduce an
industry-specific entity model or place discovery logic in the presentation
layer.

### 13. Scalability implications

Site-scoped PostgreSQL advisory locking serialises authoritative snapshots for
correct ordering. Full snapshots are intentionally simple for the first live
slice but will become bandwidth- and write-heavy at scale. Payload limits,
retention, measured snapshot-size budgets, bounded diffs, and recovery from a
known snapshot are required before continuous assurance.

### 14. Unnecessary complexity

No queue, event bus, generic ingestion framework, cross-collector merger, or
WebSocket layer is added before its invariants exist. The one-authoritative-
collector rule is restrictive but explicit and safer than silently merging
contradictory graphs.

## Gate record

| Gate | Result |
| --- | --- |
| Generated contract consistency | Pass |
| Frontend lint and production build | Pass |
| Frontend unit tests | Pass; 76/76 |
| Browser and accessibility workflows | Pass; 16/16 |
| Platform Ruff lint | Pass |
| Targeted platform API and ingestion tests | Pass; 21/21 |
| Full platform regression after final refactor | Pending database execution access |
| PostgreSQL integration after final refactor | Pending database execution access |
| Migration downgrade/re-upgrade after final refactor | Pending database execution access |
| Python vulnerability audit for this slice | Not run; no claim made |

## Required next work

1. Clear the pending PostgreSQL regression and migration gates.
2. Add bounded request-body and per-collector/site rate controls with tests.
3. Add platform readiness that distinguishes process health from database and
   migration readiness.
4. Define authenticated topology-diff ingestion and recovery without weakening
   the full-snapshot authority model.
5. Build the passive probe capture, normalisation, stable-identity, and durable
   offline-buffer path on representative hardware.

Until steps one through five and the S1 gates pass, Atlas live mode is an
integration capability, not a claim of automatic network discovery.
