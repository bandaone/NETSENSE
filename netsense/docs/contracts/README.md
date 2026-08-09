# NetSense contract boundary

Status: consumed by the authenticated platform API kernel; no production
persistence, topology stream, ingestion path, or probe is implemented

The JSON Schemas in this directory are generated from the same strict Zod
schemas used at the dashboard repository boundaries. They are the portable
contract for Python and TypeScript consumers and the future Go and
database-ingestion consumers.

## Authority and generation

- Domain semantics and runtime validation live in `dashboard/src/features`.
- `dashboard/scripts/generate-contracts.mjs` exports deterministic JSON Schema
  Draft 2020-12 documents.
- `openapi.yaml` references those generated documents instead of maintaining
  permissive duplicate object shapes.
- `platform/src/netsense_platform/contracts.py` validates API inputs and
  outputs against those same artifacts and then enforces cross-object graph
  and incident invariants.
- Generated JSON files must not be hand-edited.

Run:

```bash
cd dashboard
npm run contracts:generate
npm run contracts:check
```

`contracts:check` fails when a domain schema changed without regenerating the
portable contracts.

## Security and reliability invariants

- Tenant identity is explicit in topology snapshots, topology diffs, incident
  cases, and incident summaries.
- A resource outside the authenticated tenant scope is reported as not found;
  adapters must not disclose whether it exists elsewhere.
- Topology diffs are ordered by sequence and chained by snapshot ID.
- Duplicate or stale diffs are ignored idempotently.
- A sequence gap or base-snapshot mismatch requires a bounded full refresh.
- Unsupported schema versions and structurally incomplete operations fail
  before they reach application state.
- Incident mutations require an idempotency key and an expected-state
  precondition.

Cross-object graph, evidence-reference, coverage-total, and incident-scope
invariants are enforced after structural parsing because JSON Schema cannot
express all of them safely.
