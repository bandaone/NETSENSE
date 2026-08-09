# Repository Guide

## Current implementation

The checked-in repository currently contains `dashboard/` and `docs/`. The
dashboard is React, TypeScript, Vite, Cytoscape, and ELK with Vitest and
Playwright verification. The remaining directories in the target structure
below are planned and must not be treated as implemented release artifacts.

## Target top-level structure
```
netsense/
├── probe/ # Go probe binary (single binary)
├── platform/ # Python platform (FastAPI, Celery, NetworkX)
├── dashboard/ # React + TypeScript Atlas dashboard (implemented)
├── infra/ # Docker Compose, nginx, WireGuard configs
├── docs/ # All documentation
├── tests/ # Cross-component integration and E2E tests
├── scripts/ # Build, seed, and automation scripts
└── .github/ # CI/CD workflows
```

## Key Directories Explained

### probe/
- `cmd/netsense-probe/main.go` — entrypoint
- `internal/capture/` — gopacket passive capture
- `internal/collectors/` — protocol plugins (SNMP, Modbus, etc.)
- `internal/normaliser/` — event normalisation
- `internal/baseline/` — Holt-Winters, KS test
- `internal/anomaly/` — anomaly detection
- `internal/pcap/` — ring buffer, compression, encryption
- `pkg/event/` — shared Event struct (the contract)

### platform/
- `processor/` — background tasks (topology, fault, memory)
- `api/` — FastAPI application (routers, models, schemas, websocket)
- `migrations/` — Alembic database migrations

### dashboard/
- `src/components/topology/` — Cytoscape.js wrapper
- `src/components/metrics/` — Recharts charts
- `src/components/replay/` — forensic replay animation
- `src/hooks/` — custom React hooks (useTopology, useReplay)
- `src/api/` — generated API client from OpenAPI spec

### docs/
- See `README.md` for full documentation index
- `adr/` — Architecture Decision Records
- `rfcs/` — Engineering Specifications
- `product/` — requirements, UX, testing
- `user/`, `operator/`, `developer/`, `runbooks/`
