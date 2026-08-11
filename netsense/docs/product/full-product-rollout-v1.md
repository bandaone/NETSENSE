# NetSense Product Rollout v1

**Status:** Active engineering plan

**Branch:** `feat/observe-ui-foundation`

**Reviewed:** 2026-08-12

## Implemented product truth

The repository currently contains a production-built React/TypeScript Atlas
frontend, portable contracts, product documentation, an authenticated Python
platform with PostgreSQL persistence, ordered topology snapshot ingestion, and
an opt-in live Atlas HTTP topology adapter. The Go probe, TimescaleDB metric
migrations, deployment infrastructure, complete generated API client, and
cross-component test harness described by `docs/developer/repository-guide.md`
do not yet exist in this repository.

Atlas currently provides validated synthetic cross-industry topology and
incident cases; independent health, freshness, coverage, and management
dimensions; versioned ELK layouts; Operations, Physical, and Dependency
lenses; semantic label detail; an accessible table; search and composable
filtering; relationship evidence inspection; deterministic incident analysis;
alternate-path handling; session workflow state; and calibrated Operations
Dark and Daylight environments.

Exact portable topology, topology-diff, incident, mutation, and problem
schemas are generated from the runtime domain models. Topology and incident
fixture adapters implement explicit tenant-scoped repository boundaries.
Stream classification rejects cross-scope updates, ignores duplicates, and
requires a bounded refresh after sequence gaps or snapshot mismatches.

The platform API kernel now provides authenticated HTTP topology and incident
reads plus incident acknowledgement, notes, and resolution. It verifies RS256
JWT issuer, audience, lifetime, tenant, subject, and role claims; derives tenant
scope from the token; validates exact portable request and response contracts;
enforces non-disclosing resource scope; and applies idempotency and
expected-state rules through dependency-injected repository ports. Its
in-memory repository is for deterministic tests and local development only.

The production repository persists topology snapshots, incident cases and
analysis, idempotency responses, and append-only incident actions. A reversible
Alembic migration enables and forces RLS on every tenant-bearing table. The
adapter sets tenant context locally inside every transaction and uses row
locks so state validation, mutation, audit append, and idempotency recording
commit atomically. Production composition reads credentials and JWT material
from mounted files.

An authenticated principal with the dedicated `probe` role can submit an exact
non-synthetic topology snapshot through a sequence- and idempotency-protected
boundary. The platform binds tenant, site, and evidence collector scope;
rejects gaps, regressions, conflicting reuse, invalid timestamps, and
non-probe evidence; and commits the snapshot, cursor, and receipt atomically.
Operator roles cannot ingest and probe roles cannot read or mutate operational
resources. Atlas can opt into the live read API, validates the response again
in the browser, checks expected scope, provides bounded retry, and keeps
fixture mode explicit by default.

The following capabilities are not implemented yet: a production
identity-provider login flow, WebSocket service, topology-diff and event
ingestion/processing, TimescaleDB metric storage, passive probe, alert
delivery, packet forensics and its access audit, production deployment,
readiness/rate controls, and live Layer 2, Layer 3, Flow, Change, and Discovery
evidence inputs.

## Product boundaries

The current rollout completes Atlas as a trustworthy frontend reference
implementation and establishes an authenticated, database-isolated platform
boundary. It does not claim that collection, continuous live updates, alert
delivery, TimescaleDB metrics, or packet forensics exist. Those capabilities
require separate ingestion, probe, and deployment workstreams with their own
threat models, performance harnesses, and reviews.

The customer-facing services and their release gates are governed by the
[service delivery charter](service-delivery-charter-v1.md). None of the Network Truth Assessment,
Continuous Atlas Assurance, Managed Network Intelligence, Passive IT/OT
Visibility, or Incident Evidence and Replay services is generally available
until its live evidence and operational proof gates pass. Synthetic cases may
demonstrate product behaviour but may not be represented as customer
monitoring.

No presentation component may manufacture operational conclusions. Incident
views consume only validated scenario inputs and deterministic analysis
outputs. Fixture controls must be labelled as synthetic demonstration
controls. Mutations that are not persisted by a platform must say that they
are session-only.

## Core invariants

1. Stable identity never depends only on an IP address.
2. Operational health, observation freshness, monitoring coverage,
   management state, operational criticality, incident severity, and evidence
   confidence are independent dimensions.
3. Unknown or stale is not equivalent to unreachable.
4. A topology snapshot contains domain state, never renderer positions.
5. Layout state is versioned per site, scope, and lens; incident focus cannot
   overwrite stored layouts.
6. Every graph relationship resolves to existing nodes or interfaces and can
   be explained from evidence.
7. Confirmed impact requires an observation. Reachability alone can establish
   likely impact or risk, but not confirmation.
8. A healthy alternate path prevents a failed primary path from being treated
   as a confirmed downstream outage.
9. User-count claims require configured evidence; no count is inferred from a
   device or service name.
10. Active OT actions are never recommended from passive network evidence.
11. Unsupported schema versions and invalid graph references fail at the
    repository boundary.
12. Tenant and role enforcement belong at both API and database boundaries;
    frontend visibility is not authorization.

## Failure and security model

| Boundary | Required behaviour |
| --- | --- |
| Fixture/live repository | Validate schema and graph invariants before data reaches UI state. |
| Layout worker | Show a recoverable map error; preserve the accessible table and prior stored layout. |
| Analysis engine | Return explicit limitations and unknown classifications when evidence is incomplete. |
| Session actions | Prevent duplicate acknowledgement/resolution transitions and retain an ordered local audit trail. |
| Platform API and database | Verify expiring tokens, derive tenant context from identity, enforce roles and idempotency, validate responses, use transaction-local tenant context with forced RLS, and return structured non-disclosing errors. |
| Future WebSocket | Authenticate the connection, validate every diff, reject stale sequence numbers, and recover through a bounded snapshot refresh. |
| Future probe | Remain passive by default, isolate collectors, bound local storage, encrypt forensics before disk writes, and never expose OT write paths. |

## Rollout sequence

### R1 — Contract and reasoning foundation — frontend complete

- Define versioned incident inputs and outputs.
- Implement deterministic dependency traversal, candidate ranking, alternate
  path detection, impact classification, confidence explanation, and safe
  checks.
- Add healthy, dependency-failure, redundant-link, stale-evidence, and
  ambiguous synthetic scenarios.
- Complete canonical JSON/OpenAPI contracts before a live adapter is added.

### R2 — Investigate — frontend complete

- Add real search and composable filters.
- Add focused topology without mutating stored positions.
- Add relationship selection and evidence inspection.
- Add dependency chains and shared-failure-domain comparison.
- Preserve keyboard and table workflows.

### R3 — Resolve — frontend complete with session-only actions

- Add a tested incident subgraph, evidence timeline, ranked candidates,
  classified impact, alternate paths, limitations, and safe next checks.
- Add functioning acknowledgement, notes, and resolution transitions with an
  explicit session-only persistence label until the platform API exists.

### R4 — Network lenses and scale

- Add Layer 2, Layer 3, Flow, Incident, and Change projections only where the
  fixture contract contains the required semantics.
- Add discovery handling, semantic aggregation, a 1,000-entity harness, and
  measured interaction/layout budgets.
- Split heavy renderer/layout code so the initial application route does not
  load the ELK worker or Cytoscape unnecessarily.

### R5 — Sector proof and hardening

- Prove enterprise, healthcare, education, industrial, and financial
  terminology through configuration over the same components.
- Complete responsive, keyboard, axe, visual regression, performance, error,
  and reduced-motion verification.

### R6 — Platform and probe — snapshot ingestion foundation in progress

- Start only after the contracts and threat model are reviewed.
- The first Python slice delivers authentication/RBAC, tenant-scoped HTTP
  topology queries, incident reads and mutations, contract conformance, and
  repository ports with an isolated behavior suite.
- The PostgreSQL slice now delivers reversible relational migrations, forced
  tenant RLS, transactional incident/idempotency storage, append-only workflow
  actions, and file-backed runtime composition.
- The snapshot-ingestion slice now delivers a dedicated probe role, exact live
  topology submission, per-probe ordering, idempotent receipts, atomic durable
  storage, and an opt-in live Atlas HTTP topology adapter.
- Next deliver readiness and rate controls, then authenticated topology-diff
  ingestion/streaming as independently testable slices.
- Deliver the Go probe capture/normalisation/buffer path before optional active
  collectors. Hardware and 100 Mbps requirements require target-device tests;
  they cannot be proven in browser CI.

## Current engineering risks

- Python now validates the same generated portable schemas as TypeScript. Go
  conformance and shared cross-language fixture execution remain unproven.
- The current main application chunk is approximately 848 kB minified and the
  ELK worker approximately 1.6 MB; route and worker loading need measurement
  and code splitting before scale hardening.
- Browser-local incident workflow state is still not connected to the platform
  and remains non-durable from the user’s perspective. The UI must keep its
  session-only label until incident adapters use the durable API.
- PostgreSQL behavior is verified on an isolated PostgreSQL 15 instance, but
  production deployment, backup/restore, failover, connection saturation, and
  target-scale load tests remain unproven.
- Snapshot ingestion currently accepts complete snapshots and one authoritative
  collector per site. Safe collector handover/merging, retention/compaction,
  request-body limits, and rate controls must precede a production rollout.
- The live Atlas adapter uses a tab-scoped development token bridge. A
  production identity-provider login, token refresh, and session termination
  flow remain required; no build-time or persistent browser token storage is
  permitted.

## Release gates

Each bounded slice must pass its applicable dependency integrity, strict
build/type, lint, unit, coverage, integration, accessibility, and production
build gates. A separate post-implementation review records correctness,
complexity, readability, cohesion, duplication, error handling, security,
test coverage, architectural consistency, scale impact, and known debt.
