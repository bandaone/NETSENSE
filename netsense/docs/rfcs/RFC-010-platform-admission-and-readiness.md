# RFC-010: Platform Admission Control and Readiness

**Author:** NetSense Engineering

**Date:** 2026-08-12

**Status:** Accepted for implementation

## Summary

Add bounded request-body admission, per-process topology-ingestion rate
control, and dependency-aware readiness before the first Go probe is allowed
to target the platform. Liveness continues to answer only whether the process
is running. Readiness answers whether this instance can safely serve current
platform traffic.

## Service and Customer Outcome

- Service: S1 — Network Truth Assessment
- Commercial proof gate: A — Live network truth
- Operator outcome: probe delivery fails predictably when the platform is
  overloaded, mis-migrated, or disconnected instead of consuming unbounded
  memory or accepting traffic into an unusable instance.
- Engineering outcome: the Go probe receives explicit `413`, `429`, and `503`
  signals around an otherwise stable snapshot contract.

## Business Rules and Invariants

1. Request bodies are bounded before JSON decoding or contract validation.
2. The production default permits a maximum 32 MiB request. This is an initial
   full-snapshot budget, not a target payload size; measured pilot snapshots
   must determine the eventual limit.
3. An authenticated probe is rate-scoped by tenant, site, and collector. One
   scope cannot consume another scope's local admission budget.
4. The initial application limit is 12 snapshot attempts per 60 seconds. Exact
   retries consume capacity because they still consume platform resources.
5. Rate rejection returns `429` with an integer `Retry-After` value and does
   not call the ingestion repository.
6. Per-process rate state is concurrency-safe and memory-bounded. It is not
   represented as a cluster-wide quota.
7. Production ingress must also enforce a distributed/edge request rate and a
   body limit no larger than the application limit.
8. `/health/live` reports process liveness without touching dependencies.
9. `/health/ready` reports ready only when the database is reachable within a
   bounded timeout and every relation required by the current platform slice
   is visible to the runtime identity.
10. Readiness failure returns `503` with only `{"status":"unavailable"}`;
    database errors, hostnames, credentials, table names, and tenant state are
    never reflected.
11. Health routes are unauthenticated because an orchestrator must call them,
    but responses contain no customer or dependency inventory.

## Design

The application receives three explicit policies from composition:

- a maximum request-body byte count enforced by ASGI middleware;
- an ingestion rate-limiter port;
- a readiness-probe port.

The development/test composition uses explicit deterministic adapters. The
production runtime uses a bounded in-memory fixed-window limiter and a
PostgreSQL readiness probe. A future multi-instance deployment must add an
edge or shared limiter; replacing the port does not change the endpoint.

The body guard checks a valid `Content-Length` immediately and also counts
actual ASGI body chunks, covering chunked or dishonest requests. An oversized
body receives a contract-shaped RFC 7807 response and never reaches repository
code.

## Failure and Recovery

- Oversized body: `413 PAYLOAD_TOO_LARGE`; reduce/split the future payload or
  reconcile platform configuration. Full-snapshot splitting is not invented
  by this RFC.
- Local rate exhausted: `429 RATE_LIMITED` with `Retry-After`; the probe keeps
  its durable sequence and retries with the same idempotency key.
- Database unavailable or schema incomplete: readiness returns `503`; ingress
  stops routing new traffic while liveness remains healthy for diagnosis.
- Limiter key capacity exhausted: new scopes fail closed until an expired
  window can be evicted.

## Security and Trade-offs

The body limit protects application parsing memory, while the upstream proxy
must protect socket and aggregate bandwidth. Application rate limiting occurs
after authentication so forged tenant/site/collector keys cannot allocate
limiter state. This means invalid unauthenticated traffic must also be bounded
at ingress.

A shared database limiter was rejected for this slice because it would make an
already unhealthy database the admission dependency and add a write per
attempt. An in-memory limiter is correct for one process and honest about its
scope. Cluster-wide enforcement belongs at ingress or in a deliberately
selected shared admission service.

## Testing

- Body boundary: exact limit, one byte over, declared oversize, chunked
  oversize, safe problem response, and repository non-invocation.
- Rate boundary: allowed capacity, rejection, retry time, window reset, key
  isolation, concurrency, and bounded key exhaustion.
- Readiness: ready database/schema, dependency failure, timeout behavior,
  minimal response, and liveness independence.
- Regression: authentication/RBAC, ingestion ordering/idempotency, PostgreSQL
  RLS/atomicity, contracts, and Atlas build/tests.

## Non-goals

- cluster-wide or customer-billing quotas;
- automatic snapshot fragmentation;
- topology diffs or streaming;
- probe backoff implementation;
- Kubernetes manifests, load balancer configuration, or deployment SLOs;
- database failover and load acceptance.

## Release Truth

This slice hardens the existing transport. It does not discover or monitor a
network. The Go probe and authorised pilot-network validation remain required
before Network Truth Assessment can be sold or described as automatic
discovery.
