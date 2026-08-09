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

This starts the currently implemented Atlas dashboard. TimescaleDB, Redis,
WireGuard, the Go probe, and the Python platform are target-architecture
components and are not present yet.

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

The dashboard loads deterministic, validated synthetic fixtures. There is no
database seed command until the platform workstream is implemented.

### Project Structure
See `repository-guide.md`.

Before adding a subsystem, review `docs/product/full-product-rollout-v1.md` and
create a bounded RFC/ADR where the existing decisions do not cover it.
