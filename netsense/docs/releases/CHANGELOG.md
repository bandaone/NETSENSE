# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Atlas Observe, Investigate, and Resolve workspaces with responsive navigation.
- Deterministic incident analysis with candidate factors, impact classes,
  alternate-path detection, limitations, and safe next checks.
- Real topology search, composable filters, node and relationship evidence inspection.
- Guarded session-only acknowledgement, notes, and resolution workflow.
- Calibrated Operations Dark and Daylight environments with theme-aware Atlas rendering.
- Tenant-scoped topology and incident repository boundaries, including
  idempotent expected-state workflow mutations.
- Generated exact JSON Schemas for topology snapshots and diffs, incident
  cases and analysis, mutation inputs, pagination, and problem responses.
- Ordered topology-stream classification for apply, duplicate, gap,
  snapshot-mismatch, and cross-scope cases.
- Versioned event, alert, generated topology/incident, and contract-ready
  platform API definitions.
- Authenticated FastAPI kernel with RS256 JWT validation, token-derived tenant
  scope, role-gated incident workflows, exact response validation, safe RFC
  7807 failures, and dependency-injected repository ports.
- Concurrency-safe development repository with expected-state mutations and
  idempotent replay, plus 28 branch-aware platform tests above the 85% gate.
- Tenant and site identity in incident-analysis responses so the API can reject
  a validly shaped but mis-scoped repository result before disclosure.
- Cryptography-backed PyJWT verification replacing the advisory-affected
  `python-jose`/`ecdsa` dependency path, with patched test and build tooling.
- Reversible Alembic migration for topology snapshots, incident cases,
  analyses, durable idempotency, and append-only workflow actions.
- Transaction-backed PostgreSQL repository with row locking, atomic mutation
  and audit writes, pooled transaction-local tenant context, and forced RLS on
  every tenant-bearing table.
- File-backed production runtime composition that keeps database credentials
  and JWT key material out of direct environment values.
- Real PostgreSQL 15 integration coverage for cross-tenant collisions,
  policy enforcement, concurrency, rollback, JSON scope constraints, and audit
  immutability.
- Authenticated, probe-only topology snapshot ingestion with strict tenant,
  site, collector, sequence, observation-time, and idempotency enforcement.
- Atomic topology snapshot, cursor, and receipt persistence with authoritative
  collector protection and forced RLS on the new ingestion tables.
- Opt-in live Atlas HTTP topology loading with response-contract and scope
  validation, cancellation, bounded user retry, and an explicit live/fixture
  source indicator.
- RFC-009 and cross-layer tests defining the first full-snapshot ingestion
  boundary; topology diffs, collector handover, and payload/rate controls remain
  separate release gates.
- Expanded Python dependency audit with no known vulnerabilities reported on
  2026-08-10.
- Verified product rollout boundary separating implemented frontend from planned platform/probe work.
- Complete documentation tree (architecture, requirements, UX, testing, ADRs, RFCs)
- Functional requirements (75 FRs) and non-functional requirements (20 NFRs)
- Requirements traceability matrix
- User personas (Mutale, Bwalya, Chanda, Thabo)
- User scenarios, stories, and journey maps
- Test plan, acceptance criteria, and 83 test cases
- Hardware design (IT-100, OT-100, Pi-5)
- Engineering methodology and development process

## [0.1.0] — 2026-05-23
### Added
- Initial project specification and architecture design
- Repository structure definition
- Phase 0 documentation complete

[0.1.0]: https://github.com/netsense/netsense/releases/tag/v0.1.0
