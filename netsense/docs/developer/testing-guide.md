# Testing Guide

## Test Levels
| Level | Command | Location | Runtime |
|-------|---------|----------|---------|
| Unit (TS) | `cd dashboard && npm run test:run` | `dashboard/src/**/*.test.ts` | <10s |
| Coverage (TS) | `cd dashboard && npm run test:coverage` | domain and adapter modules | <15s |
| Contract parity | `cd dashboard && npm run contracts:check` | generated portable JSON Schemas | <5s |
| E2E | `cd dashboard && npm run test:e2e` | `dashboard/e2e/` | ~1min |
| Accessibility | `cd dashboard && npm run test:a11y` | axe through Playwright | ~20s |
| Production build | `cd dashboard && npm run build` | TypeScript + Vite | <30s |
| Unit/API + coverage (Python) | `cd platform && .venv/bin/pytest` | `platform/tests/` | <30s |
| Format (Python) | `cd platform && .venv/bin/ruff format --check .` | platform source and tests | <5s |
| Lint (Python) | `cd platform && .venv/bin/ruff check .` | platform source and tests | <5s |
| Dependency integrity (Python) | `cd platform && .venv/bin/pip check` | locked environment | <5s |

Go, database integration, cross-component, and load-test commands will be
added with those workstreams. They are not currently runnable in this
repository.

## Writing Tests
- Go: use `testing` + `testify/assert`. Mock with `testify/mock`.
- Python: use `pytest` + `pytest-asyncio`. Mock with `unittest.mock`.
- TypeScript: use `vitest` + `@testing-library/react`.

## Running Specific Tests
```bash
# Frontend: single test
cd dashboard && npm test -- -t "finds a healthy alternate path"
```

## Coverage
`cd dashboard && npm run test:coverage`

The current frontend gate is 80% for statements, branches, functions, and
lines in the included domain/adapter modules.

`cd platform && .venv/bin/pytest` enforces 85% branch-aware coverage across the
Python API kernel. It includes request, authorization, contract, tenant-scope,
idempotency, concurrency, and non-disclosing failure cases. It does not yet
claim database RLS or integration coverage.

Contract changes require `npm run contracts:generate` followed by
`npm run contracts:check`. Generated schema files are not hand-edited.

CI automation is not checked in yet. Local gates are mandatory until the CI
workflow exists; documentation must not describe them as remotely enforced.
