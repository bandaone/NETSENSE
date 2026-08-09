# NetSense platform API kernel

Status: implemented and tested service boundary; no production persistence or
probe ingestion yet.

This slice turns the Atlas contracts into an authenticated FastAPI boundary.
It deliberately stops before PostgreSQL/TimescaleDB so tenant RLS and durable
transactions are not claimed without a real database integration harness.

## Implemented

- Cryptography-backed PyJWT RS256 verification with issuer, audience, expiry, issue-time, role,
  tenant, subject, and maximum eight-hour lifetime checks.
- Tenant scope derived only from the verified token.
- Engineer, senior, and admin role enforcement for incident mutations.
- Exact Draft 2020-12 validation using the generated Atlas JSON Schemas.
- Cross-object topology and incident invariant validation.
- Non-disclosing RFC 7807 problem responses with server-generated trace IDs.
- Tenant/site topology and incident repository ports.
- Idempotent, expected-state incident acknowledgement, notes, and resolution.
- Server-derived actor identity and authoritative timestamps.
- Response-scope validation that blocks a leaking repository adapter.
- A concurrency-safe in-memory adapter for tests and local development only.

The unauthenticated `/health/live` route intentionally reports only process
liveness and exposes no dependency, tenant, build, or configuration details.
All `/api/v1` routes require authentication. Interactive API documentation is
disabled in this kernel.

## Local verification

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.lock
.venv/bin/pip install --no-build-isolation --no-deps -e .
.venv/bin/pip check
.venv/bin/ruff format --check .
.venv/bin/ruff check .
.venv/bin/pytest
```

`pytest` enforces 85% branch-aware coverage. The current suite uses generated
RSA keys and never stores a signing secret in the repository.

## Deliberate boundaries

- No login or token-issuing endpoint is included. A trusted identity provider
  must issue tokens; the platform receives only a public verification key.
- No default runnable application is exported because there is no production
  repository adapter yet. Runtime composition must inject authentication,
  contracts, repositories, a clock, and trace generation into `create_app`.
- The in-memory adapter is not durable, horizontally scalable, or a substitute
  for PostgreSQL transactions and RLS.
- WebSocket topology streaming, cursor pagination, rate limiting, readiness
  checks, immutable audit storage, and database migrations remain follow-on
  slices.
- The initial `pip-audit` run found advisories in `ecdsa`, `pytest`, and
  `setuptools`. This slice removed the `python-jose`/`ecdsa` path and upgraded
  the affected test and build tools. The post-remediation advisory query could
  not complete because its external approval review timed out, so a clean
  vulnerability result is not claimed; CI must run
  `pip-audit -r requirements-dev.lock` again.
