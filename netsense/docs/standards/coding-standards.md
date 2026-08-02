# Coding Standards

NetSense follows consistent code quality practices across Go, Python, and TypeScript.

## Go

- Use `gofmt` on all Go files.
- Prefer small, testable functions.
- Use `context.Context` for cancellation and deadlines.
- Wrap errors with `%w`.
- Write table-driven tests for edge cases.

## Python

- Format code with `black`.
- Use type annotations where practical.
- Keep FastAPI handlers thin.
- Use `pytest` for unit and integration tests.

## TypeScript

- Use ESLint and Prettier.
- Prefer typed API client usage.
- Test UI components with `@testing-library/react`.
- Keep hooks focused and reusable.

