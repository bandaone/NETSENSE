# Development Workflow

## Branching Strategy
We use **trunk-based development**. `main` is always deployable.

- Create a short-lived feature branch: `feature/probe-gopacket-capture`
- Commit using [Conventional Commits](https://www.conventionalcommits.org/)
- Open a Pull Request (even if working solo) for code review
- Squash-merge to `main` after CI passes and review approved

## Commit Convention
`<type>(<scope>): <description> [optional body] [optional footer]`

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`

Example:

```
feat(probe/capture): implement gopacket mirror port capture loop
```

Uses gopacket with BPF filter to capture IP unicast traffic. Ring buffer allocated at startup. Handles 100 Mbps on ARM64. Closes #12

## Pull Request Process
1. Create PR from feature branch to `main`
2. Ensure CI passes (lint, type-check, unit tests, coverage)
3. Request review (or self-review with comment)
4. Merge only when all checks green

## Quality Gates
- Linter passes (golangci-lint, ruff, ESLint)
- Type checker passes (go vet, mypy, TypeScript)
- Unit tests pass with coverage >80%
- No new ADR violations
- Migration included if model changed
- Documentation updated if behavior changed

## Environment
- `make dev` starts full local stack
- `make test` runs all unit tests
- `make integration-test` runs integration tests

