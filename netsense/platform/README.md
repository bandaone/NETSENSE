# NetSense platform API kernel

Status: authenticated service boundary, ordered topology snapshot ingestion,
and PostgreSQL persistence implemented and tested; no physical probe or
topology streaming yet.

This package turns the Atlas contracts into an authenticated FastAPI boundary
with a transaction-backed PostgreSQL adapter. TimescaleDB is deliberately not
required until metric ingestion has an approved contract and performance
harness.

## Implemented

- Cryptography-backed PyJWT RS256 verification with issuer, audience, expiry, issue-time, role,
  tenant, subject, and maximum eight-hour lifetime checks.
- Tenant scope derived only from the verified token.
- Engineer, senior, and admin role enforcement for incident mutations.
- Exact Draft 2020-12 validation using the generated Atlas JSON Schemas.
- Cross-object topology and incident invariant validation.
- Non-disclosing RFC 7807 problem responses with server-generated trace IDs.
- Tenant/site topology and incident repository ports.
- Probe-only, contract-validated, ordered and idempotent topology snapshot
  ingestion.
- Idempotent, expected-state incident acknowledgement, notes, and resolution.
- Server-derived actor identity and authoritative timestamps.
- Response-scope validation that blocks a leaking repository adapter.
- A concurrency-safe in-memory adapter for tests and local development only.
- Versioned Alembic migration for topology snapshots, incident cases,
  analysis, durable idempotency, and append-only incident actions.
- Forced PostgreSQL RLS on every tenant-bearing table.
- Row-locked, atomic workflow transitions and connection-pool-safe `SET LOCAL`
  tenant context.
- JSONB identity and scope constraints independent of application validation.
- Per-probe sequence cursors and ingestion receipts protected by forced RLS.
- File-backed production composition for database credentials and JWT public
  key material.

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
docker compose -f compose.test.yaml up -d --wait
NETSENSE_TEST_DATABASE_URL='postgresql+asyncpg://netsense_migrator:netsense_migrator_test_only@127.0.0.1:55432/netsense_test' \
NETSENSE_TEST_APP_DATABASE_URL='postgresql+asyncpg://netsense_app:netsense_app_test_only@127.0.0.1:55432/netsense_test' \
  .venv/bin/pytest
docker compose -f compose.test.yaml down
```

`pytest` enforces 85% branch-aware coverage. The current suite uses generated
RSA keys and never stores a signing secret in the repository.

## Database identities and migration

Run migrations with a schema-owner identity supplied through
`NETSENSE_DATABASE_URL`:

```bash
NETSENSE_DATABASE_URL='postgresql+asyncpg://migrator:secret@database/netsense' \
  .venv/bin/alembic upgrade head
```

The runtime identity must be separate, `NOSUPERUSER`, and `NOBYPASSRLS`. A DBA
sets its password through the deployment secret mechanism, then grants only:

```sql
GRANT USAGE ON SCHEMA public TO netsense_app;
GRANT SELECT ON topology_snapshots, topology_ingestion_state,
  topology_ingestion_receipts, incident_cases, incident_analyses,
  incident_actions, idempotency_records TO netsense_app;
GRANT INSERT ON topology_snapshots, topology_ingestion_state,
  topology_ingestion_receipts, incident_actions, idempotency_records
  TO netsense_app;
GRANT UPDATE ON topology_ingestion_state, incident_cases TO netsense_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO netsense_app;
```

## Runtime composition

Database credentials and JWT material are read from mounted files, not direct
environment values:

```bash
export NETSENSE_DATABASE_URL_FILE=/run/secrets/netsense_database_url
export NETSENSE_JWT_PUBLIC_KEY_FILE=/run/secrets/netsense_jwt_public_key
export NETSENSE_JWT_ISSUER=https://identity.example
export NETSENSE_JWT_AUDIENCE=netsense-platform
export NETSENSE_CONTRACTS_DIRECTORY=/app/docs/contracts
uvicorn netsense_platform.runtime:create_runtime_app_from_environment --factory
```

## Deliberate boundaries

- No login or token-issuing endpoint is included. A trusted identity provider
  must issue tokens; the platform receives only a public verification key.
- The in-memory adapter remains development-only; production composition uses
  `PostgresPlatformRepository`.
- Database migrations intentionally do not create login roles or embed
  credentials. Deployment automation must create and grant the runtime role.
- WebSocket topology streaming, cursor pagination, rate limiting, readiness
  checks, event and metric ingestion, TimescaleDB metric storage, and the
  physical probe remain follow-on slices. Snapshot ingestion is implemented;
  topology-diff ingestion is not.
- Append-only storage currently covers incident workflow actions, not the
  future PCAP access audit required by NFR-SEC-005.
- `pip-audit -r requirements-dev.lock` reported no known vulnerabilities on
  2026-08-10 after the PostgreSQL dependencies were added. CI must repeat this
  time-sensitive check for every dependency change.
