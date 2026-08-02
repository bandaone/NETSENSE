# Repository Guide

## Top-Level Structure
```
netsense/
├── probe/ # Go probe binary (single binary)
├── platform/ # Python platform (FastAPI, Celery, NetworkX)
├── frontend/ # React + TypeScript dashboard
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

### frontend/
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

