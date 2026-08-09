# Repository Guide

## Current implementation

The checked-in repository contains `dashboard/`, `platform/`, and `docs/`. The
dashboard is React, TypeScript, Vite, Cytoscape, and ELK with Vitest and
Playwright verification. The platform is an authenticated, tenant-scoped
FastAPI kernel with repository ports and a development-only in-memory adapter.
The remaining directories and the production persistence portions of the
target structure below are planned and must not be treated as implemented
release artifacts.

## Target top-level structure
```
netsense/
├── probe/ # Go probe binary (single binary)
├── platform/ # Python FastAPI kernel (implemented; production storage planned)
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
- `src/netsense_platform/application.py` — dependency-injected FastAPI routes
- `src/netsense_platform/auth.py` — RS256 JWT and role enforcement
- `src/netsense_platform/contracts.py` — generated-schema and graph invariants
- `src/netsense_platform/repositories.py` — topology and incident ports
- `src/netsense_platform/memory_repository.py` — test/development adapter only
- `tests/` — API, authentication, contract, isolation, and concurrency tests

The platform does not yet contain a production repository, database
migrations, background processors, WebSockets, or probe ingestion.

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
