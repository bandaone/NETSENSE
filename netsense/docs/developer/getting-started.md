# Developer Getting Started

## Prerequisites
- Go 1.22+
- Python 3.12+ with Poetry
- Node.js 20+ with npm
- Docker and Docker Compose
- libpcap (`apt install libpcap-dev` on Ubuntu)

## Quick Start

```bash
git clone https://github.com/netsense/netsense.git
cd netsense
make dev
```

This starts: TimescaleDB, Redis, and WireGuard (Docker), Probe (Go, hot-reload via `air`), Platform API (Python, hot-reload via `uvicorn --reload`), Frontend (React, hot-reload via Vite).

Open `http://localhost:5173` for the dashboard.

### Running Tests

```bash
make test                 # All unit tests
make integration-test     # Integration tests (requires Docker)
make test-probe           # Probe only
make test-platform        # Platform only
make test-frontend        # Frontend only
```

### Seeding Data

```bash
make seed                 # Populate with 50 devices, 14 days of metrics
```

### Project Structure
See `repository-guide.md`.

### First Task
Pick a "good first issue" from the issue tracker. Recommended: add a test for an uncovered function.

