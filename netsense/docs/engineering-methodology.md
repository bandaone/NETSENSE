# Engineering Methodology

NetSense development follows a contract-first, documentation-driven approach. The team uses ADRs for architecture decisions, RFCs for feature design, and CI gates to enforce quality.

## Process

- **Service traceability:** Every feature RFC identifies the service outcome
  and commercial proof gate it advances from the service delivery charter.
  Work with no customer decision or service outcome does not enter the
  implementation backlog.
- **API contract-first:** Schemas and OpenAPI definitions are agreed before implementation.
- **ADRs:** Document significant architectural choices and tradeoffs.
- **RFCs:** Capture feature design, testing approach, and rollback strategy.
- **Implementation truth:** Specifications, demonstrations, experimental
  capability, and generally available behaviour remain explicitly distinct.
- **Branching:** Use trunk-based development with short-lived feature branches.
- **Commits:** Follow Conventional Commits for clarity and changelog automation.

## Quality Gates

- Linting: `gofmt`, `black`, `ESLint`.
- Type checking: `go vet`, `mypy`, TypeScript checks.
- Testing: unit, integration, and E2E coverage.
- Documentation: update relevant docs, ADRs, and runbooks for any behavior change.
- Product acceptance: verify the applicable customer outcome, evidence,
  failure, recovery, authorization, safety, and measurement criteria from the
  service charter.
- Code review: required for all PRs.

## Deployment

- `main` is always deployable.
- Versioning follows Semantic Versioning.
- Platform upgrades are performed before probe upgrades.
- Migrations are created via Alembic and tested on a copy of the production schema.
