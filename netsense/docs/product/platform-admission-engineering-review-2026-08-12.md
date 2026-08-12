# NetSense Platform Admission Engineering Review — 2026-08-12

**Scope:** RFC-010 request-body admission, authenticated topology-ingestion
rate control, dependency-aware readiness, runtime configuration, API contract,
documentation, and regression verification.

## Outcome

Accepted as the single-instance application hardening boundary required before
the first Go probe integration. Oversized requests, excessive authenticated
snapshot attempts, unavailable databases, missing relations, disabled/weak RLS,
missing policies, and insufficient runtime privileges now fail explicitly and
without dependency disclosure.

This is not production ingress protection or a capacity claim. A multi-instance
deployment still requires a cluster-wide edge limiter, connection/time limits,
measured snapshot budgets, and load acceptance. RFC-011 subsequently implements
the repository-level passive probe foundation; automatic discovery and its
target-network acceptance remain unproven.

## Golden-rule review

### 1. Correctness

Mutating request bodies are counted before FastAPI JSON decoding. A valid
`Content-Length` over the configured maximum is rejected immediately; bodies
without a declared size are accumulated only up to the same hard ceiling.
Exact-boundary requests continue, while one byte over returns `413` and never
reaches persistence.

The ingestion limiter is keyed by authenticated tenant, site, and collector.
It admits the configured number of attempts, denies the remainder with a
positive `Retry-After`, resets after the window, isolates keys, and fails closed
when bounded key storage is full. Readiness succeeds only when PostgreSQL is
reachable within its timeout and the current runtime identity can see every
required table with forced RLS, a policy, exact table privileges, and the
incident-action sequence privilege.

### 2. Cyclomatic complexity

The public limiter operation has one linear fixed-window decision path. Body
admission separates declared-length, streaming accumulation, replay, and
problem rendering into focused helpers. Readiness is one bounded query and one
failure conversion. No unsupported numerical complexity score is claimed.

### 3. Cognitive complexity

Application composition makes all three policies explicit: body ceiling,
rate-limiter port, and readiness-probe port. Endpoint code asks for an admitted
probe principal and remains focused on domain ingestion. Deployment defaults
are named and validated in one settings module.

### 4. Readability

Names describe operational intent (`RateLimitKey`, `RateLimitDecision`,
`RequestBodyLimitMiddleware`, `PostgresReadinessProbe`) rather than framework
mechanics. Responses use stable product codes: `PAYLOAD_TOO_LARGE` and
`RATE_LIMITED`.

### 5. Maintainability

The limiter and readiness probe are protocols, so a later shared limiter or
deployment-specific readiness policy can replace runtime adapters without
changing routes. Configuration bounds and documented defaults are colocated.
RFC-010 records why local and distributed admission are separate.

### 6. Coupling and cohesion

Request bytes are handled at the ASGI boundary, authenticated rate policy in
admission, schema/security capability in readiness, and domain ordering in the
ingestion repository. No rate state is coupled to topology persistence or RLS
transactions.

### 7. Duplication

Problem documents reuse `ApiProblem`; authentication and role enforcement
reuse the existing principal boundary. Test and local adapters are explicit
instead of duplicating application setup. The readiness SQL repeats privilege
names once through a generated internal `VALUES` clause and the deployment
grant documentation remains the human-owned operational source.

### 8. Naming and conventions

The code follows the existing Python 3.12 async package, Ruff, protocol,
FastAPI composition, RFC 7807, and pytest conventions. Environment variables
retain the `NETSENSE_` namespace and reject invalid values at startup.

### 9. Error handling

Invalid limits and windows fail startup. Oversize bodies return a bounded 413
problem with trace and no request content. Rate exhaustion returns a bounded
429 with integer retry guidance. Readiness catches dependency failures and
timeouts but allows task cancellation to propagate, returning only
`unavailable` through the HTTP route. Liveness remains independent.

### 10. Security

The body ceiling prevents unbounded application parsing memory. Rate keys come
only from verified token scope and a validated site path, so request-supplied
tenant or collector identities cannot allocate arbitrary buckets. Readiness
checks forced RLS and runtime privileges rather than merely checking table
existence, and reflects no database error details.

The body must be read before application authentication, so hostile bandwidth,
connections, and aggregate memory still require upstream controls. The local
limiter is not a cross-worker or cross-instance quota and is never described as
one.

### 11. Test coverage

The platform passes 72 tests against isolated PostgreSQL 15 with 90.73%
branch-aware coverage against the 85% floor. New tests cover fixed-window
capacity/reset/isolation/concurrency/key exhaustion, invalid configuration,
exact and oversize bodies, chunked bodies, repository non-application,
rate-response safety, readiness success/failure/timeout, liveness independence,
and real restricted-role PostgreSQL readiness.

Atlas regressions pass 76 unit tests and 16 Playwright workflows including
accessibility and Daylight coverage. Contract generation, frontend lint, and
the production build pass.

### 12. Architectural consistency

The slice protects the existing Probe → Platform → PostgreSQL → Atlas path
without adding a broker or discovery behavior. It improves S1 transport safety
while preserving the service charter's distinction between an integration
capability and live network truth.

### 13. Scalability implications

Limiter state is capped at 10,000 active keys per process. Expired-key cleanup
is linear only when admitting a new key; this is bounded but should be replaced
or profiled for high-churn multi-tenant ingress. The 32 MiB body ceiling bounds
bytes but JSON decoding creates additional objects, so production concurrency
must be load-tested. Twelve attempts per minute is a safety default, not a
measured service capacity.

The Atlas build continues to warn about an approximately 851 kB main chunk and
1.595 MB ELK worker. That pre-existing performance debt is unrelated to this
platform slice and remains open.

### 14. Unnecessary complexity

No new dependency, database table, queue, cache, shared quota service, or
deployment framework was added. A fixed window is less smooth than a token
bucket but easier to reason about for the low-frequency full-snapshot boundary.
The design can evolve after real probe cadence and payload measurements exist.

## Gate record

| Gate | Result |
| --- | --- |
| RFC and implementation-truth review | Pass |
| Ruff format and lint | Pass |
| Platform unit/integration suite | Pass; 72/72 |
| Branch-aware coverage | Pass; 90.73%, floor 85% |
| Restricted-role PostgreSQL readiness | Pass |
| Migration downgrade and clean re-upgrade | Pass before RFC-010 implementation |
| Generated contract consistency | Pass |
| Atlas lint and unit tests | Pass; 76/76 |
| Atlas browser/accessibility workflows | Pass; 16/16 |
| Atlas production build | Pass with documented chunk warning |
| Python vulnerability audit for this slice | Not run; no dependency changed and no claim made |

## Subsequent slice

RFC-011 defines and builds the smallest Go probe vertical slice: secure configured
identity, passive interface observation, strict header-only evidence
normalisation, stable local state, durable sequence/idempotency state, bounded
offline spool, and full-snapshot delivery to this API. The first acceptance
target is an authorised small LAN with measured discovery precision, coverage,
payload size, loss behavior, restart recovery, and evidence-to-Atlas fidelity.
Its repository gates pass; authorised target-network and target-hardware
acceptance remain the next required proof.
