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
The Python platform API kernel is separately testable but deliberately has no
production runtime composition until a durable repository is available.

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
.venv/bin/pytest
```

The dashboard and platform tests load deterministic, validated synthetic
fixtures. There is no database seed command until the persistence workstream
is implemented.

### Project Structure
See `repository-guide.md`.

Before adding a subsystem, review `docs/product/full-product-rollout-v1.md` and
create a bounded RFC/ADR where the existing decisions do not cover it.
