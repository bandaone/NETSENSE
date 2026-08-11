# NetSense Atlas Dashboard

The implemented NetSense frontend is an evidence-led network operations
workspace with Observe, Investigate, and Resolve workflows. It supports
validated synthetic fixtures and an opt-in authenticated platform HTTP adapter
behind the same repository boundary. No production probe or identity-provider
login flow exists yet.

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

## Live topology development mode

Fixture mode remains the safe default. To read a topology snapshot from the
platform in local development, provide non-secret scope configuration:

```bash
export VITE_NETSENSE_DATA_MODE=live
export VITE_NETSENSE_TENANT_ID=tenant:unza
export VITE_NETSENSE_ORGANISATION_ID=tenant:unza
export VITE_NETSENSE_SITE_ID=site:great-east-road
export VITE_NETSENSE_API_PROXY_TARGET=http://127.0.0.1:8000
npm run dev
```

The platform accepts bearer authentication and does not issue tokens. Until
the approved identity-provider flow is implemented, a short-lived development
token can be placed in tab-scoped session storage under
`netsense.atlas.accessToken`. Never put an access token in a `VITE_` variable,
source file, URL, or persistent local storage. Production deployment must
provide same-origin `/api` routing and replace this interim session bridge with
the reviewed identity integration.

The header provides two calibrated display environments: Operations Dark for
low-light monitoring and Daylight for bright offices, field use, and demos.
The choice persists in the browser and preserves identical topology semantics.

## Architecture

- `src/features/topology/domain` owns versioned topology semantics and graph
  invariants.
- `src/features/topology/data` owns explicit fixture/live composition, bearer
  transport, response validation, and authenticated-scope checks.
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
