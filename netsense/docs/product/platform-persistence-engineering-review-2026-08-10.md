# NetSense Platform Persistence Engineering Review — 2026-08-10

**Scope:** PostgreSQL relational migration, forced tenant RLS, topology and
incident repository, durable idempotency, append-only workflow actions,
file-backed runtime composition, and real database integration tests.

## Outcome

Conditionally accepted as the durable platform foundation. It is suitable for
the current topology read and incident workflow contracts. It is not a complete
production deployment: ingestion, readiness, rate limiting, backup/restore
exercises, failover, load acceptance, WebSockets, TimescaleDB metrics, and the
probe remain outside this slice.

## Golden-rule review

### 1. Correctness

The repository implements the existing topology and incident ports without
changing API semantics. Each method begins a transaction, sets the verified
tenant through transaction-local PostgreSQL configuration, and relies on
forced RLS. Mutations lock the incident row before replay and state checks, then
write state, append an action, and persist the idempotency response in one
commit. Duplicate concurrent acknowledgement creates one action.

### 2. Cyclomatic complexity

Public repository methods are small and mutation branching is centralised in
one three-operation function. No numerical complexity analyser is installed,
so no unsupported score is claimed. If workflow types grow beyond the current
three, operation-specific strategy functions would become clearer than adding
more branches.

### 3. Cognitive complexity

The transaction sequence is explicit: establish scope, lock, check replay,
check state, validate payload, apply transition, append audit, persist replay.
SQLAlchemy Core is used without ORM lifecycle behavior or hidden unit-of-work
state.

### 4. Readability

Database columns and code retain the product terms `tenant`, `site`, `incident`,
`snapshot`, `analysis`, `expected state`, and `idempotency`. Relational query
columns are separate from validated JSON contract payloads.

### 5. Maintainability

One reversible Alembic revision owns the first relational schema. The migration
is self-contained and runtime table declarations are used only for query
construction. Credentials and JWT material enter production composition from
mounted files. Migration and runtime identities remain separate.

### 6. Coupling and cohesion

Engine creation and scoped transactions, schema declarations, repository
behavior, runtime composition, contracts, and workflow helpers have distinct
responsibilities. The API still depends on repository protocols, so the memory
adapter remains useful for deterministic tests.

### 7. Duplication

Fingerprinting, visible-text validation, and graph-entity checks are shared by
memory and PostgreSQL adapters. Migration definitions intentionally do not
import mutable runtime metadata, preserving historical reproducibility at the
cost of a small, explicit schema declaration duplication.

### 8. Naming and conventions

The implementation follows the existing Python 3.12 package layout, Ruff
formatting, async repository protocols, exact dependency lock, and generated
contract boundary. Migration revision and constraint names are stable and
descriptive.

### 9. Error handling

Absent and out-of-scope rows both produce the repository’s non-disclosing miss.
Expected-state and idempotency conflicts retain their established codes.
Validation failures roll back without an action or idempotency record.
Unexpected database errors are handled by the API’s bounded internal-error
response and are not reflected to clients.

### 10. Security

All five tenant-bearing tables enable and force RLS. Runtime SQL intentionally
does not add tenant predicates as a substitute for RLS. Tenant context uses
bound `set_config` parameters with transaction-local scope, preventing pool
leakage. JSONB constraints independently reject missing, mismatched, or stale
identity/scope fields. The runtime role is `NOSUPERUSER NOBYPASSRLS` and has no
schema-changing rights. Incident-action update and delete are rejected by an
append-only trigger even when attempted by the schema owner through normal SQL.

Database credentials and the JWT public key are loaded from mounted files.
Migrations never create login secrets. A compromised runtime database identity
could still set arbitrary PostgreSQL configuration directly; API identity
verification and database credentials therefore remain security-critical.

### 11. Test coverage

Forty-two tests pass with branch-aware coverage of 89.60% against an enforced 85%
floor. PostgreSQL 15 integration tests cover tenant-local ID collisions,
no-context invisibility, policy presence and force flags, atomic workflows,
idempotent replay, conflicting key reuse, concurrent retries, rollback,
append-only enforcement, and missing/mismatched JSON scope.

The migration was separately upgraded, downgraded to base, verified to remove
all five owned tables, and upgraded again before the final suite.

### 12. Architectural consistency

PostgreSQL remains the relational authority selected by ADR-002 while
TimescaleDB is deferred until metric ingestion exists. JSONB stores the exact
portable domain contracts; indexed relational columns support stable query and
workflow semantics. RLS satisfies FR-DEPLOY-007 and FR-API-006 at the persistent
boundary rather than relying on frontend or API filtering.

### 13. Scalability implications

The stateless API uses an async pooled engine and externalises workflow state,
locks, audit, and idempotency. Site/time and site/state/time indexes support the
current access paths. No 10,000-device, connection saturation, long-transaction,
replication, or failover test has run, so NFR scale acceptance is not claimed.

### 14. Unnecessary complexity

The slice adds SQLAlchemy Core, asyncpg, and Alembic because pooling,
transactions, PostgreSQL JSONB, and versioned migrations require them. It does
not add an ORM, cache, task queue, generic DAO, TimescaleDB extension, or event
framework before those needs exist.

## Gate record

| Gate | Result |
| --- | --- |
| Migration upgrade | Pass on PostgreSQL 15 |
| Migration downgrade | Pass; all five owned tables removed |
| Clean re-upgrade | Pass |
| Forced-RLS policies | Pass; one policy on every tenant table |
| Runtime dependency integrity | Pass; no broken requirements |
| Ruff format and lint | Pass |
| Platform behavior and integration | Pass; 42/42 |
| Branch-aware coverage | Pass; 89.60%, floor 85% |
| Frontend regression gates | Pass; 68/68 unit and 16/16 browser workflows |
| Python vulnerability audit | Pass; no known vulnerabilities on 2026-08-10 |

## Required next slice

Define an authenticated, idempotent ingestion contract that can persist
contract-valid topology snapshots and incident inputs without granting the API
runtime role broad write access. Then connect Atlas through a live HTTP adapter
while retaining fixture composition for deterministic demonstrations. Add
readiness and rate controls before deployment acceptance.
