# NetSense Platform API Kernel Engineering Review — 2026-08-09

> **Later persistence update:** PostgreSQL persistence, forced tenant RLS,
> durable idempotency, append-only incident actions, and production composition
> were implemented after this API-kernel review. See
> `platform-persistence-engineering-review-2026-08-10.md`.

**Scope:** authenticated topology and incident HTTP boundary, portable contract
validation, tenant and role enforcement, repository ports, and the deterministic
in-memory development adapter.

## Outcome

Conditionally accepted as the first R6 platform slice. It is suitable as a
tested service boundary and production-repository specification. It is not a
production backend: there is no database, RLS, durable idempotency, immutable
audit log, event ingestion, rate limiting, readiness check, WebSocket stream,
or deployed runtime composition.

## Golden-rule review

### 1. Correctness

Seven authenticated API operations and minimal liveness are implemented from
the checked-in OpenAPI and generated schemas. Input and output validation is
exact. Tenant scope comes only from verified identity, server time and actor
identity are authoritative, and repository output is rechecked before release.
Acknowledgement, note, and resolution transitions enforce expected state and
idempotent replay. Concurrent duplicate acknowledgement produces one action.

### 2. Cyclomatic complexity

Routes delegate authentication, contract handling, scope checks, and state
transitions to focused modules. No complexity analyser is installed, so no
unsupported numerical score is claimed. The cross-object topology invariant
function is the largest decision surface and should be split by entity family
if additional graph semantics make it materially harder to review.

### 3. Cognitive complexity

Business rules use named checks and explicit exceptions rather than nested
generic handlers. Repository transitions are linear: scope, replay, state,
domain validation, mutation, response. The shared exception mapping is kept at
the application edge.

### 4. Readability

Names follow product language: tenant, site, topology snapshot, incident case,
expected state, evidence, acknowledgement, and resolution. The code does not
hide identity or time acquisition in global state.

### 5. Maintainability

`create_app` receives authentication, contracts, repositories, clock, and
trace generation. This makes behavior deterministic in tests and lets the
production composition replace infrastructure without rewriting routes.
There is deliberately no default application wired to unsafe in-memory state.

### 6. Coupling and cohesion

Authentication, contract validation, transport, repository protocol, and the
development adapter are separate. The application depends on repository
protocols rather than PostgreSQL details. JSON remains at the contract edge to
avoid inventing a second model hierarchy before persistence requirements are
known; typed persistence records may become justified in the database slice.

### 7. Duplication

Problem construction, scope checks, response validation, idempotency replay,
and incident summary projection are centralised. Request-specific routes stay
explicit instead of being collapsed into a generic mutation abstraction.

### 8. Naming and conventions

Python 3.12, package layout, Ruff formatting, and selected lint rules are
consistent across source and tests. Generated schemas remain authoritative and
are never copied into Python models by hand.

### 9. Error handling

Authentication, validation, authorization, absence, conflict, dependency
contract failure, and unexpected failure receive bounded RFC 7807 responses
with server-generated trace IDs. Cross-tenant and absent resources are
indistinguishable. Validation responses do not echo operator notes or raw
token claims. API responses are marked `no-store`.

### 10. Security

PyJWT verification permits RS256 only and checks issuer, audience, expiry,
issue-time, maximum eight-hour lifetime, subject, tenant, and role. Resolution
requires senior or admin. Interactive API documentation is disabled. The
service receives a public verification key and does not issue tokens.

Production blockers are explicit: database RLS, durable audit and idempotency,
secret-provider composition, CORS policy, request-size and rate limits,
readiness and dependency timeouts. An initial `pip-audit` identified four
advisory records in `ecdsa`, `pytest`, and `setuptools`; the vulnerable JOSE
dependency path was removed and the affected tools were upgraded. The
post-remediation advisory query was blocked by an approval-review timeout, so
no clean Python vulnerability result is claimed until CI repeats the scan.

### 11. Test coverage

Twenty-eight tests pass with branch-aware coverage of 88.22% against an
enforced 85% floor. They cover expected behavior, invalid and missing input,
expired/tampered/mis-scoped tokens, roles, cross-tenant indistinguishability,
contract failures, response-scope leakage, expected-state conflicts,
idempotency, and concurrent retries. Database transaction and RLS behavior
cannot be tested until that adapter exists.

### 12. Architectural consistency

The slice implements the existing contract-driven boundary and preserves the
frontend’s distinction between evidence and conclusion. Python consumes the
same generated Draft 2020-12 schemas as TypeScript. The remaining Go consumer
and shared cross-language fixture runner are still required.

### 13. Scalability implications

The stateless application boundary can be replicated once persistence and
idempotency are externalised. The in-memory adapter is process-local and
intentionally unsuitable for horizontal scale. Cursor pagination is rejected
until a stable database ordering exists; WebSocket fan-out and ingestion
backpressure have not been designed in this slice.

### 14. Unnecessary complexity

No ORM, task queue, cache, graph engine, service container, or extra model
framework was introduced prematurely. FastAPI, JSON Schema, JOSE, and small
repository protocols are sufficient for the verified behavior. PostgreSQL
abstractions should arrive with migrations and integration tests, not before.

## Gate record

| Gate | Result |
| --- | --- |
| Clean editable package build | Pass with exact locked build backend |
| Python dependency integrity | Pass; no broken requirements |
| Ruff format | Pass; 13 files |
| Ruff lint | Pass |
| Platform behavior suite | Pass; 28/28 |
| Branch-aware coverage | Pass; 88.22%, floor 85% |
| Python vulnerability audit | Initial findings remediated; verification query timed out |

## Required next slice

Add versioned PostgreSQL migrations and transaction-backed topology, incident,
idempotency, and append-only audit repositories. Enforce tenant RLS in the
database and test it with separate tenant roles and connection contexts before
exporting a production runnable application or connecting Atlas mutations.
