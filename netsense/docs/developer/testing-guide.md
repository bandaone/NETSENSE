# Testing Guide

## Test Levels
| Level | Command | Location | Runtime |
|-------|---------|----------|---------|
| Unit (TS) | `cd dashboard && npm run test:run` | `dashboard/src/**/*.test.ts` | <10s |
| Coverage (TS) | `cd dashboard && npm run test:coverage` | domain and adapter modules | <15s |
| E2E | `cd dashboard && npm run test:e2e` | `dashboard/e2e/` | ~1min |
| Accessibility | `cd dashboard && npm run test:a11y` | axe through Playwright | ~20s |
| Production build | `cd dashboard && npm run build` | TypeScript + Vite | <30s |

Go, Python, integration, and load-test commands will be added with those
workstreams. They are not currently runnable in this repository.

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

CI automation is not checked in yet. Local gates are mandatory until the CI
workflow exists; documentation must not describe them as remotely enforced.
