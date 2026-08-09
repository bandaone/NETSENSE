# NetSense Atlas Engineering Review — 2026-08-09

**Review scope:** Observe, Investigate, Resolve, deterministic incident
reasoning, incident workflow, topology search/filtering, relationship
inspection, proposed contracts, and supporting documentation.

## Outcome

The frontend rollout is accepted as a tested synthetic reference
implementation. It is not accepted as a complete NetSense platform release:
there is no probe, platform service, database, authentication, tenant
enforcement, durable incident storage, or live topology stream.

## Review findings

### 1. Correctness

- Topology and incident inputs are versioned and runtime validated.
- Cross-reference invariants reject missing nodes, relationships, evidence, and
  site mismatches.
- Incident conclusions are calculated outside presentation components.
- Direct observations, downstream risk, stale/unknown impact, and healthy
  alternate paths remain separate.
- A failed redundant link produces no confirmed downstream outage.
- Acknowledgement and resolution transitions reject duplicates, invalid state,
  and resolution without substantive notes.

Result: acceptable for deterministic synthetic scenarios. Real collector data
will require integration, ordering, replay, and concurrency tests.

### 2. Cyclomatic and cognitive complexity

The domain analysis is decomposed into candidate scoring, path finding, impact
classification, checks, and limitation functions. Each branch represents an
explicit business rule. No numerical complexity tool is installed, so no
unsupported score is claimed.

`ResolveWorkspace.tsx` (approximately 437 lines) and
`InvestigateWorkspace.tsx` (approximately 342 lines) are larger than desirable.
Their internal components remain cohesive, but the next UI expansion should
extract the reasoning rail sections and search rail into separately tested
modules. `TopologyMap.tsx` also remains large because renderer lifecycle,
semantic zoom, selection, tooltips, and controls share one adapter component.
This is P1 maintainability debt, not a reason to add abstractions to the pure
domain layer.

### 3. Readability, naming, and maintainability

- Domain terms match the product language: `operationalHealth`, `freshness`,
  `coverage`, `managementState`, `probableCauseCandidates`, and explicit impact
  classes.
- Graph direction is documented in code through named utilities rather than
  hidden inside components.
- Workspace mode moved to a neutral feature type, preventing layout code from
  depending on a screen module.
- Fixtures remain explicitly synthetic and deterministic.

Questionable decision: `ResolveWorkspace` currently selects fixture scenarios
directly. This keeps the demonstration explicit and small, but the live-data
milestone must introduce an incident repository/data boundary before any API
integration; components must not gain fetch logic.

### 4. Coupling and cohesion

Topology domain, layout, projection, rendering, incident domain, and incident
presentation are separate. The incident subgraph consumes analysis output and
cannot invent impact. The renderer accepts only a small presentation overlay
and does not import incident-domain types.

The remaining coupling is intentional fixture selection in Resolve and the
shared use of the in-memory layout store. Both must be replaced by injected
repositories for live data and per-user durable layout storage.

### 5. Duplication

Endpoint resolution and graph traversal are centralised in
`topology/domain/graph.ts`. Repeated visual section markup remains in the two
workspace modules, but business rules are not duplicated in JSX.

### 6. Error handling and reliability

- Repository/schema/invariant errors fail before UI consumption.
- Layout failures render an explicit recoverable state.
- Empty search/filter results explain how to recover.
- Workflow transitions surface errors and prevent invalid repeat operations.

Missing for live operation: retry policy, request cancellation, WebSocket
sequence recovery, idempotency persistence, optimistic-concurrency conflict
handling, offline mutation queues, and server-derived audit history.

### 7. Security and authorization

- No UI control is represented as durable or authorised; workflow actions are
  visibly labelled session-only.
- The proposed API contract requires bearer authentication, tenant-scoped
  resources, role metadata, idempotency keys, expected-state preconditions, and
  non-disclosing problem responses.
- The production dependency audit reports zero vulnerabilities.
- No real organisation/site data or tracked `node_modules` was found.

Release blocker for a live backend: frontend navigation and disabled buttons
are not authorization. API RBAC and PostgreSQL/TimescaleDB RLS must be tested
before persistent actions are enabled. Secrets, audit immutability, token
handling, CSRF/CORS policy, rate limits, and WebSocket authentication remain
unimplemented.

### 8. Test coverage

- 46 unit tests pass across 13 files.
- Included domain/adapter coverage is 90.13% statements, 82.18% branches,
  89.65% functions, and 90.13% lines, with enforced 80% thresholds.
- 14 Playwright flows pass, including search, relationship inspection,
  workflow transitions, alternate paths, axe, and all three target workstation
  resolutions.
- The dedicated axe gate reports zero automated violations.

Known gap: automated axe cannot prove full WCAG conformance. Screen-reader
behaviour, focus order during dynamic filtering, zoom/reflow, and human colour
perception still need manual testing. Visual regression is not yet automated.

### 9. Architectural consistency

The implementation follows the typed-domain → projection → layout → renderer
flow and keeps renderer positions outside topology snapshots. Documentation now
distinguishes implemented frontend from target probe/platform architecture.

Questionable decision: the OpenAPI snapshot and incident-analysis schemas keep
some nested arrays as generic objects while the Zod contracts are exact. This
avoids duplicating several hundred schema lines during the frontend slice, but
it is too permissive for generated clients. Before platform implementation,
generate or hand-author one canonical exact schema and test parity across
Python, Go, and TypeScript.

### 10. Scalability and performance

The ELK calculation runs in a worker and layouts are reused per lens. Search
and deterministic graph analysis are appropriate for the current small
fixtures.

Measured production output:

- main JavaScript: approximately 827.11 kB minified / 251.55 kB gzip;
- ELK worker: approximately 1,595.33 kB;
- CSS: approximately 21.24 kB / 5.30 kB gzip.

The Vite chunk warning is valid. Before the 1,000-entity hardening milestone,
route-split Observe/Investigate/Resolve, load Cytoscape/ELK only for map views,
virtualise long result/impact lists, benchmark projection and render time, and
add a synthetic scale harness. The current build is runnable but not yet
performance-accepted for the documented 500-device/2-second NFR.

### 11. Unnecessary complexity

No new state library, router, server-state library, component framework, or
graph library was added. Browser history and local React state are sufficient
for the current synthetic workspaces. A router and server-state cache should
be introduced only when nested routes, deep links, request caching, and live
mutations make their benefits measurable.

## Gate record

| Gate | Result |
| --- | --- |
| Dependency tree | Pass |
| TypeScript strict build | Pass |
| ESLint, zero warnings | Pass |
| Unit tests | 46/46 pass |
| Coverage thresholds | Pass; 90.13/82.18/89.65/90.13 |
| Playwright | 14/14 pass |
| Axe | 2/2 suites; zero automated violations |
| Target resolutions | 1366×768, 1440×900, 1920×1080 pass |
| Production build | Pass with documented chunk-size warning |
| Production dependency audit | Zero vulnerabilities |
| Contract syntax | JSON and YAML parse successfully |

## Required next priorities

1. Exact, generated multi-language API contract and incident repository
   boundary.
2. Route/chunk splitting and 500/1,000-entity performance harness.
3. Layer 2, Layer 3, Flow, Change, and Discovery inputs before exposing those
   lenses.
4. Additional healthcare, education, industrial, and financial fixtures using
   the same components.
5. Authenticated platform/RLS workstream, followed by the passive probe
   workstream; neither should be simulated in the UI.
