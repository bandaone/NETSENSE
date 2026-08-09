# NetSense Atlas Engineering Review — 2026-08-09

> **Later R6 update:** The authenticated Python API kernel was implemented
> after this frontend review. Its separate acceptance record is
> `platform-engineering-review-2026-08-09.md`. Statements below about the
> platform being absent describe the frontend review boundary at that time.

**Review scope:** Observe, Investigate, Resolve, deterministic incident
reasoning, incident workflow, topology search/filtering, relationship
inspection, calibrated Operations Dark and Daylight environments, exact
contracts, repository boundaries, stream ordering, and supporting
documentation.

## Outcome

The frontend rollout is accepted as a tested synthetic reference
implementation. It is not accepted as a complete NetSense platform release:
there is no probe, platform service, database, authentication, server-side
tenant enforcement, durable incident storage, or live topology stream.

## Review findings

### 1. Correctness

- Topology and incident inputs are versioned and runtime validated.
- Cross-reference invariants reject missing nodes, relationships, evidence, and
  site mismatches.
- Incident conclusions are calculated outside presentation components.
- Direct observations, downstream risk, stale/unknown impact, and healthy
  alternate paths remain separate.
- A failed redundant link produces no confirmed downstream outage.
- Acknowledgement, notes, and resolution transitions validate exact inputs,
  reject invalid expected state, and replay duplicate idempotency keys without
  repeating an action.
- Tenant/site/incident scope is explicit at every repository operation. A
  mismatched scope returns the same non-disclosing not-found result as an
  unknown incident.
- Trusted actor identity and authoritative timestamps are injected by the
  repository execution context; the browser request cannot choose either.
- Topology diffs reject unsupported versions and cross-tenant scope, ignore
  replayed sequences, and request a full refresh on gaps or base-snapshot
  mismatch.

Result: acceptable for deterministic synthetic scenarios. Real collector data
will require integration, ordering, replay, and concurrency tests.

### 2. Cyclomatic and cognitive complexity

The domain analysis is decomposed into candidate scoring, path finding, impact
classification, checks, and limitation functions. Each branch represents an
explicit business rule. No numerical complexity tool is installed, so no
unsupported score is claimed.

`ResolveWorkspace.tsx` (approximately 584 lines) and
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

Questionable decision: `ResolveWorkspace` now consumes an incident repository,
but the component remains responsible for list/detail loading, reasoning-rail
presentation, and mutation orchestration. This is acceptable for one bounded
workspace, but the live adapter milestone should extract a tested controller
hook rather than add retry and cancellation branches directly to the JSX.

### 4. Coupling and cohesion

Topology domain, layout, projection, rendering, incident domain, and incident
presentation are separate. The incident subgraph consumes analysis output and
cannot invent impact. The renderer accepts only a small presentation overlay
and does not import incident-domain types.

Topology and incident data both cross small repository interfaces; the default
adapters deliberately select synthetic fixtures outside presentation code.
The remaining coupling is the module-level default repository and the shared
in-memory layout store. Production composition must inject live adapters and
persist layouts per authenticated user without changing domain modules.

### 5. Duplication

Endpoint resolution and graph traversal are centralised in
`topology/domain/graph.ts`. Repeated visual section markup remains in the two
workspace modules, but business rules are not duplicated in JSX.

### 6. Error handling and reliability

- Repository/schema/invariant errors fail before UI consumption.
- Layout failures render an explicit recoverable state.
- Empty search/filter results explain how to recover.
- Workflow transitions surface errors, validate trusted execution metadata,
  reject root-cause entities absent from the incident snapshot, and prevent
  invalid repeat operations.
- Idempotency keys are cryptographically generated and retained across a
  failed retry; reuse for a different operation is rejected.
- Stream sequence gaps and snapshot mismatches have a bounded full-refresh
  decision instead of attempting unsafe partial application.

Missing for live operation: HTTP retry policy, request cancellation,
authenticated WebSocket reconnect/refresh execution, durable idempotency,
server-side optimistic concurrency, offline policy, and immutable audit
history. The frontend models these decisions but cannot provide their durable
guarantees.

### 7. Security and authorization

- No UI control is represented as durable or authorised; workflow actions are
  visibly labelled session-only.
- The API contract requires bearer authentication, tenant-scoped
  resources, role metadata, idempotency keys, expected-state preconditions, and
  non-disclosing problem responses.
- The full and production-only dependency audits report zero known
  vulnerabilities after upgrading the Node-18-compatible Vite, Vitest,
  Playwright, and TypeScript ESLint toolchain.
- No real organisation/site data or tracked `node_modules` was found.

Release blocker for a live backend: frontend navigation and disabled buttons
are not authorization. API RBAC and PostgreSQL/TimescaleDB RLS must be tested
before persistent actions are enabled. Secrets, audit immutability, token
handling, CSRF/CORS policy, rate limits, and WebSocket authentication remain
unimplemented.

The coverage toolchain pins `test-exclude` 7.0.1 because its next patch pulls a
Node-20-only transitive dependency despite declaring Node 18 compatibility.
This is an explicit temporary override, not application runtime code. Remove
it during the Node 20 toolchain migration and re-run the full audit and gates.

### 8. Test coverage

- 68 unit tests pass across 17 files.
- Included domain/adapter coverage is 93.05% statements, 85.21% branches,
  91.05% functions, and 93.05% lines, with enforced 80% thresholds.
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

Exact Draft 2020-12 JSON Schemas are deterministically generated from the Zod
runtime schemas, and OpenAPI 3.1 references those portable artifacts. A drift
gate fails when runtime and checked-in contracts diverge. This removes the
former permissive nested-object definitions.

Questionable decision: TypeScript is currently the only executable consumer
of the generated contracts. Before platform implementation, Python and Go
consumers must validate shared conformance fixtures so language-specific
validator behavior cannot silently diverge.

### 10. Scalability and performance

The ELK calculation runs in a worker and layouts are reused per lens. Search
and deterministic graph analysis are appropriate for the current small
fixtures.

Measured production output:

- main JavaScript: approximately 847.72 kB minified / 256.93 kB gzip;
- ELK worker: approximately 1,595.33 kB;
- CSS: approximately 24.24 kB / 6.12 kB gzip.

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

Selection focus was separately reviewed in Daylight. Node and label visibility
is now calibrated independently from edge visibility: unrelated nodes retain
readable context while unrelated edges recede more strongly. This prevents the
selected-path treatment from erasing the surrounding network.

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
| Unit tests | 68/68 pass |
| Coverage thresholds | Pass; 93.05/85.21/91.05/93.05 |
| Playwright | 16/16 pass |
| Axe | Operations Dark and Daylight; zero automated violations |
| Environment persistence | Pass; explicit choice survives reload |
| Visual environment review | Pass at 1440×900; topology rendered in both |
| Target resolutions | 1366×768, 1440×900, 1920×1080 pass |
| Production build | Pass with documented chunk-size warning |
| Full dependency audit | Zero known vulnerabilities |
| Production dependency audit | Zero known vulnerabilities |
| Contract drift | Pass; 10 generated schemas referenced by OpenAPI |
| Contract syntax | JSON and OpenAPI YAML parse successfully |

## Required next priorities

1. Authenticated HTTP/WebSocket adapters plus Python and Go contract
   conformance fixtures; keep fixture adapters for deterministic demos.
2. Route/chunk splitting and 500/1,000-entity performance harness.
3. Layer 2, Layer 3, Flow, Change, and Discovery inputs before exposing those
   lenses.
4. Additional healthcare, education, industrial, and financial fixtures using
   the same components.
5. Authenticated platform/RLS workstream, followed by the passive probe
   workstream; neither should be simulated in the UI.
