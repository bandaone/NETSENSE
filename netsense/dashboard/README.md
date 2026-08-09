# NetSense Atlas Dashboard

The implemented NetSense frontend is an evidence-led network operations
workspace with Observe, Investigate, and Resolve workflows. It uses validated
synthetic fixtures behind repository boundaries; it is not connected to a
production probe or platform API yet.

## Run

```bash
npm ci
npm run dev
```

## Quality gates

```bash
npm run lint
npm run test:run
npm run test:coverage
npm run contracts:check
npm run test:e2e
npm run test:a11y
npm run build
```

The local preview routes are `/observe`, `/investigate`, and `/resolve`.

The header provides two calibrated display environments: Operations Dark for
low-light monitoring and Daylight for bright offices, field use, and demos.
The choice persists in the browser and preserves identical topology semantics.

## Architecture

- `src/features/topology/domain` owns versioned topology semantics and graph
  invariants.
- `src/features/topology/layout` owns renderer-independent stored positions.
- `src/features/topology/rendering` translates semantic map grammar and the
  active operating-environment tokens into Cytoscape styles.
- `src/features/theme` owns explicit environment selection and safe local
  persistence.
- `src/features/incidents/domain` owns deterministic reasoning and workflow
  rules.
- `src/features/incidents/data` owns the tenant-scoped incident repository
  boundary; components do not import scenario fixtures.
- `src/features/**/data/fixtures` contains explicitly synthetic scenarios.
- components render domain outputs; they do not manufacture incident claims.

See `../docs/product/full-product-rollout-v1.md` for the verified product
boundary and rollout plan.

Portable JSON Schemas are generated from the runtime domain schemas with
`npm run contracts:generate`; CI and release work should use
`npm run contracts:check` to reject contract drift.
