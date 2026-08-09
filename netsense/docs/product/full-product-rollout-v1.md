# NetSense Product Rollout v1

**Status:** Active engineering plan

**Branch:** `feat/observe-ui-foundation`

**Reviewed:** 2026-08-09

## Implemented product truth

The repository currently contains a production-built React/TypeScript Atlas
frontend and its product documentation. The Go probe, Python platform,
TimescaleDB migrations, deployment infrastructure, generated API client, and
cross-component test harness described by `docs/developer/repository-guide.md`
do not yet exist in this repository.

Atlas currently provides a validated, synthetic, cross-industry topology
snapshot, independent health/freshness/coverage/management dimensions,
versioned ELK layouts, Operations/Physical/Dependency lenses, semantic label
detail, an accessible table representation, operational inspection, and a
calm Observe workspace.

The following documented capabilities are not implemented yet: deterministic
incident analysis, incident and change projections, relationship inspection,
search and composable filtering, session workflow state, sector switching,
live API/WebSocket adapters, and every probe/platform capability.

## Product boundaries

The current rollout completes Atlas as a trustworthy frontend reference
implementation. It does not claim that collection, persistence,
authentication, tenant isolation, alert delivery, or packet forensics exist.
Those capabilities require separate probe and platform workstreams with their
own threat models, migration plans, performance harnesses, and deployment
reviews.

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
| Future API | Use expiring authentication, role checks, tenant context, database RLS, idempotency keys, and structured non-disclosing errors. |
| Future WebSocket | Authenticate the connection, validate every diff, reject stale sequence numbers, and recover through a bounded snapshot refresh. |
| Future probe | Remain passive by default, isolate collectors, bound local storage, encrypt forensics before disk writes, and never expose OT write paths. |

## Rollout sequence

### R1 — Contract and reasoning foundation

- Define versioned incident inputs and outputs.
- Implement deterministic dependency traversal, candidate ranking, alternate
  path detection, impact classification, confidence explanation, and safe
  checks.
- Add healthy, dependency-failure, redundant-link, stale-evidence, and
  ambiguous synthetic scenarios.
- Complete canonical JSON/OpenAPI contracts before a live adapter is added.

### R2 — Investigate

- Add real search and composable filters.
- Add focused topology without mutating stored positions.
- Add relationship selection and evidence inspection.
- Add dependency chains and shared-failure-domain comparison.
- Preserve keyboard and table workflows.

### R3 — Resolve

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

### R6 — Platform and probe

- Start only after the contracts and threat model are reviewed.
- Deliver the Python platform, PostgreSQL/TimescaleDB migrations, tenant RLS,
  authentication/RBAC, event ingestion, topology query/diff streaming, and
  incident persistence as independently testable slices.
- Deliver the Go probe capture/normalisation/buffer path before optional active
  collectors. Hardware and 100 Mbps requirements require target-device tests;
  they cannot be proven in browser CI.

## Current engineering risks

- The canonical OpenAPI and event/topology/alert schemas are empty, despite the
  contract-first policy.
- The repository guide and quick-start describe nonexistent directories and
  commands, which can cause false release confidence.
- The current main application chunk is approximately 771 kB minified and the
  ELK worker approximately 1.6 MB; route and worker loading need measurement
  and code splitting before scale hardening.
- Existing fixtures prove only healthy presentation. Incident language must
  remain absent until R1 analysis tests pass.
- Browser-local workflow state is not durable, shareable, or auditable across
  users. The UI must label this limitation until R6.

## Release gates

Each bounded slice must pass dependency integrity, TypeScript strict build,
ESLint with zero warnings, unit tests, coverage, Playwright workflows, axe,
and the production build. A separate post-implementation review records
correctness, complexity, readability, cohesion, duplication, error handling,
security, test coverage, architectural consistency, scale impact, and known
debt.
