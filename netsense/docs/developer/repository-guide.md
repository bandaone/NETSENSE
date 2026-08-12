# Repository Guide

## Current implementation

The checked-in repository contains `probe/`, `dashboard/`, `platform/`, and
`docs/`. The dashboard is React, TypeScript, Vite, Cytoscape, and ELK with Vitest and
Playwright verification. The platform is an authenticated, tenant-scoped
FastAPI kernel with repository ports and a development-only in-memory adapter.
It now also contains a PostgreSQL adapter, reversible Alembic migrations,
forced-RLS policies, ordered topology snapshot ingestion, production
composition, bounded admission, dependency-aware readiness, and real database
integration tests. Atlas has an opt-in authenticated HTTP topology adapter.
The Go probe implements the first passive header observation, conservative
snapshot construction, durable spool, and authenticated ordered-delivery
slice. Target-host performance and discovery acceptance remain unproven. The
remaining directories are planned and must not be treated as implemented
release artifacts.

## Target top-level structure
```
netsense/
├── probe/ # Go passive probe foundation (implemented; target acceptance open)
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
- `internal/config/` — strict file-backed identity and operating limits
- `internal/capture/` — build-tagged gopacket/libpcap capture and header decoder
- `internal/observation/` — payload-free packet-header fact
- `internal/topology/` — time-bounded identity/flow correlation and snapshots
- `internal/spool/` — atomic ordered JSON spool and durable sequence state
- `internal/platform/` — authenticated bounded delivery and receipt validation
- `internal/agent/` — cancellation, snapshot cadence, retry, and reconciliation

Protocol collectors, baseline/anomaly engines, event normalisation, encrypted
PCAP storage, enrolment, and OTA management are target architecture, not
present directories.

### platform/
- `src/netsense_platform/application.py` — dependency-injected FastAPI routes
- `src/netsense_platform/auth.py` — RS256 JWT and role enforcement
- `src/netsense_platform/contracts.py` — generated-schema and graph invariants
- `src/netsense_platform/repositories.py` — topology read/ingestion and incident ports
- `src/netsense_platform/topology_ingestion.py` — live snapshot scope, evidence, and time rules
- `src/netsense_platform/admission.py` — bounded process-local probe/site rate policy
- `src/netsense_platform/request_limits.py` — pre-decoding body-size boundary
- `src/netsense_platform/readiness.py` — database, RLS, and privilege readiness
- `src/netsense_platform/postgres_repository.py` — transactional production adapter
- `src/netsense_platform/database.py` — engine and transaction-local tenant context
- `src/netsense_platform/runtime.py` — file-backed production composition
- `src/netsense_platform/memory_repository.py` — test/development adapter only
- `migrations/` — reversible Alembic schema and forced-RLS policies
- `tests/` — API, authentication, contract, database isolation, transaction, and concurrency tests

The platform does not yet contain background processors, event/metric or
topology-diff ingestion, WebSockets, or TimescaleDB metrics. Complete topology
snapshot ingestion is implemented and its contract is exercised by the Go
probe golden fixture; a live deployed end-to-end run remains an acceptance gate.

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
