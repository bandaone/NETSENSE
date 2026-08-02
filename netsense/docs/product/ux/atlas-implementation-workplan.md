# NetSense Atlas Implementation Workplan

**Status:** Accepted for bounded implementation

**Branch:** `feat/atlas-domain-foundation`

**Baseline commit:** `199e96e81428e18bb6fae144b8dbd87e3f8193b6`

## Synthetic-data notice

All organisations, sites, network addresses, assets, incidents, operational
processes, people, and relationships used by Atlas fixtures are synthetic and
do not represent a real installation.

## Baseline

- Dependency tree: passed (`npm ls --depth=0`).
- TypeScript: passed (`npx tsc --noEmit`).
- ESLint: failed with 27 pre-existing errors: 25 in `TopologyMap.tsx`, one in
  `AlertFeedSidebar.tsx`, and one in the dashboard screen.
- Frontend tests: not configured.
- Topology diff contract: empty.
- Git recovery: established from the accepted pre-implementation workspace.

## Governing decisions

1. Facts, configuration, deterministic derivation, inference, prediction, and
   unknown information remain distinguishable.
2. Health, observation freshness, monitoring coverage, and management state
   are independent dimensions.
3. Stable entity identity does not depend on IP addresses.
4. Topology snapshots contain no renderer positions.
5. Layout profiles are versioned per site, scope, and lens.
6. Operational criticality uses the semantics recorded by ADR-007.
7. The default Atlas fixture is a healthy, explicitly fictional industrial
   site.
8. Unsupported incident conclusions remain outside the typed Atlas path until
   the tested analysis engine is delivered.

## Bounded task: typed healthy-snapshot vertical slice

### Deliver

- versioned domain contracts and runtime validation;
- graph-reference invariants;
- repository boundary and typed unsupported-version error;
- deterministic healthy Mukuba fixture;
- independent layout profile store;
- Cytoscape projection adapter;
- current dashboard connected to the validated healthy fixture;
- honest healthy empty states and derived summary counts;
- isolated legacy incident demonstration;
- unit tests and green TypeScript, ESLint, test, coverage, and build gates.

### Explicitly deferred

- incident reasoning and blast-radius analysis;
- ELK/fCoSE layout decision;
- topology diff streaming;
- semantic zoom;
- physical, Layer 2, Layer 3, dependency, and flow lens implementations;
- Playwright and axe, which arrive with the workspace interaction milestone.

## Layout stability contract

- Status-only updates cause zero displacement.
- Returning to a lens restores that lens's saved profile.
- A small topology diff does not trigger a global relayout.
- New entities are placed near relevant established anchors.
- Incident focus uses temporary view state and cannot overwrite stored layouts.
- Exiting incident focus restores the exact previous profile.
- Shared structural anchors remain recognisable across lenses where practical.

## Required gates

```text
npm ls --depth=0
npx tsc --noEmit
npm run lint
npm run test:run
npm run test:coverage
npm run build
```

No gate is reported as passing unless it completes successfully.
