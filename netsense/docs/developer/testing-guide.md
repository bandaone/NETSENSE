# Testing Guide

## Test Levels
| Level | Command | Location | Runtime |
|-------|---------|----------|---------|
| Unit (Go) | `cd probe && go test ./...` | `probe/**/*_test.go` | <10s |
| Unit (Python) | `cd platform && poetry run pytest` | `platform/tests/unit/` | <30s |
| Unit (TS) | `cd frontend && npm test` | `*.test.ts(x)` | <10s |
| Integration | `make integration-test` | `tests/integration/` | ~5min |
| E2E | `make e2e-test` | `tests/e2e/` | ~10min |
| Load | `make load-test` | `tests/load/` | variable |

## Writing Tests
- Go: use `testing` + `testify/assert`. Mock with `testify/mock`.
- Python: use `pytest` + `pytest-asyncio`. Mock with `unittest.mock`.
- TypeScript: use `vitest` + `@testing-library/react`.

## Running Specific Tests
```bash
# Go: single test
cd probe && go test -run TestHoltWinters_Predict ./internal/baseline/

# Python: single file
cd platform && poetry run pytest tests/unit/test_fault_localizer.py

# Frontend: single test
cd frontend && npm test -- -t "topology node changes color"
```

## Coverage
`make coverage`        # generates HTML reports for all components

Minimum: 80% for Go and Python, 70% for TypeScript.

CI Integration
All tests run automatically on every PR and push to main. Coverage thresholds are enforced.

