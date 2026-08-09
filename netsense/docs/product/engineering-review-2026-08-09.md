# NetSense Atlas Engineering Review — 2026-08-09

**Review scope:** Observe, Investigate, Resolve, deterministic incident
reasoning, incident workflow, topology search/filtering, relationship
inspection, calibrated Operations Dark and Daylight environments, proposed
contracts, and supporting documentation.

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
modules. Cytoscape style construction is now isolated in `atlasStyles.ts`, but
`TopologyMap.tsx` still owns renderer lifecycle, semantic zoom, selection,
tooltips, and controls. This is P1 maintainability debt, not a reason to add
abstractions to the pure domain layer.

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

- 53 unit tests pass across 15 files.
- Included domain/adapter coverage is 91.01% statements, 82.64% branches,
  89.01% functions, and 91.01% lines, with enforced 80% thresholds.
- 16 Playwright flows pass, including environment persistence, search,
  relationship inspection, workflow transitions, alternate paths, axe, and all
  three target workstation resolutions.
- The dedicated axe coverage reports zero automated violations in Operations
  Dark and Daylight across Observe, Investigate, and Resolve.

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

- main JavaScript: approximately 834.72 kB minified / 253.36 kB gzip;
- ELK worker: approximately 1,595.33 kB;
- CSS: approximately 24.09 kB / 6.09 kB gzip.

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

### 12. Operating-environment review

Operations Dark and Daylight are two bounded operating environments, not an
extensible theme marketplace. Both use the same semantic tokens, topology
positions, entity shapes, status symbols, evidence line styles, information
density, and controls. The Cytoscape renderer reads the selected computed
tokens and updates its existing style sheet in place; the graph is not rebuilt
or repositioned.

Visual review at 1440×900 confirms the intended distinction: Operations Dark
uses neutral low-luminance graphite without decorative glow, while Daylight
uses a low-glare paper canvas with independently strengthened text, borders,
status colours, and relationship edges. It is not a mathematical colour
inversion.

Storage is failure-tolerant and contains no sensitive data. Invalid or blocked
local storage returns to the deliberate Operations Dark default. The small
pre-mount script prevents a theme flash, but duplicates the storage key and
requires explicit treatment in a future strict Content Security Policy (nonce,
hash, or external bootstrap). The renderer also carries Operations Dark fallback
values in TypeScript so a missing stylesheet cannot make the topology
invisible; this duplication is acceptable for resilience but should gain a
token-parity test if palette ownership grows.

## Gate record

| Gate | Result |
| --- | --- |
| Dependency tree | Pass |
| TypeScript strict build | Pass |
| ESLint, zero warnings | Pass |
| Unit tests | 53/53 pass |
| Coverage thresholds | Pass; 91.01/82.64/89.01/91.01 |
| Playwright | 16/16 pass |
| Axe | Operations Dark and Daylight; zero automated violations |
| Environment persistence | Pass; explicit choice survives reload |
| Visual environment review | Pass at 1440×900; topology rendered in both |
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
