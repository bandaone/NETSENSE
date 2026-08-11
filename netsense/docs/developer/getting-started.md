# Developer Getting Started

## Prerequisites
- Go 1.22+
- Python 3.12+ with Poetry
- Node.js 20+ with npm
- Docker and Docker Compose
- libpcap (`apt install libpcap-dev` on Ubuntu)

## Quick Start

```bash
cd dashboard
npm ci
npm run dev
```

This starts the implemented Atlas dashboard. TimescaleDB, Redis, WireGuard,
and the Go probe are target-architecture components and are not present yet.
The Python platform is separately runnable with its PostgreSQL adapter after
migration and restricted-role setup; see `../../platform/README.md`.

Open `http://localhost:5173` for the dashboard.

### Running Tests

```bash
npm run lint
npm run test:run
npm run test:coverage
npm run test:e2e
npm run test:a11y
npm run build
```

Verify the Python API kernel from its exact development lock:

```bash
cd platform
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.lock
.venv/bin/pip install --no-build-isolation --no-deps -e .
.venv/bin/pip check
.venv/bin/ruff format --check .
.venv/bin/ruff check .
docker compose -f compose.test.yaml up -d --wait
NETSENSE_TEST_DATABASE_URL='postgresql+asyncpg://netsense_migrator:netsense_migrator_test_only@127.0.0.1:55432/netsense_test' \
NETSENSE_TEST_APP_DATABASE_URL='postgresql+asyncpg://netsense_app:netsense_app_test_only@127.0.0.1:55432/netsense_test' \
  .venv/bin/pytest
docker compose -f compose.test.yaml down
```

The dashboard and platform tests load deterministic, validated synthetic
fixtures. PostgreSQL integration fixtures are test-only; there is no
production seed command or physical probe yet. The ordered live topology
snapshot path must receive only authorised, non-synthetic probe evidence.

### Project Structure
See `repository-guide.md`.

Before adding a subsystem, review `docs/product/full-product-rollout-v1.md` and
create a bounded RFC/ADR where the existing decisions do not cover it.
