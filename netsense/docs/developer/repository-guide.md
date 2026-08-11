# Repository Guide

## Current implementation

The checked-in repository contains `dashboard/`, `platform/`, and `docs/`. The
dashboard is React, TypeScript, Vite, Cytoscape, and ELK with Vitest and
Playwright verification. The platform is an authenticated, tenant-scoped
FastAPI kernel with repository ports and a development-only in-memory adapter.
It now also contains a PostgreSQL adapter, reversible Alembic migrations,
forced-RLS policies, ordered topology snapshot ingestion, production
composition, and real database integration tests. Atlas has an opt-in
authenticated HTTP topology adapter. The remaining directories are planned
and must not be treated as implemented release artifacts.

## Target top-level structure
```
netsense/
├── probe/ # Go probe binary (single binary)
├── platform/ # Python FastAPI + PostgreSQL platform foundation (implemented)
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
- `src/netsense_platform/repositories.py` — topology read/ingestion and incident ports
- `src/netsense_platform/topology_ingestion.py` — live snapshot scope, evidence, and time rules
- `src/netsense_platform/postgres_repository.py` — transactional production adapter
- `src/netsense_platform/database.py` — engine and transaction-local tenant context
- `src/netsense_platform/runtime.py` — file-backed production composition
- `src/netsense_platform/memory_repository.py` — test/development adapter only
- `migrations/` — reversible Alembic schema and forced-RLS policies
- `tests/` — API, authentication, contract, database isolation, transaction, and concurrency tests

The platform does not yet contain background processors, event/metric or
topology-diff ingestion, WebSockets, TimescaleDB metrics, or physical probe
integration. Complete topology snapshot ingestion is implemented.

### dashboard/
- `src/components/topology/` — topology map and evidence inspectors
- `src/features/topology/domain/` — validated renderer-independent semantics
- `src/features/topology/data/` — fixture and authenticated HTTP adapters
- `src/features/topology/layout/` — stable versioned ELK layout
- `src/features/incidents/` — deterministic incident reasoning and workflows

### docs/
- See `README.md` for full documentation index
- `adr/` — Architecture Decision Records
- `rfcs/` — Engineering Specifications
- `product/` — requirements, UX, testing
- `user/`, `operator/`, `developer/`, `runbooks/`
