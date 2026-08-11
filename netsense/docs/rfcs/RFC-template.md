# RFC-XXX: Feature Name

**Author:** Name
**Date:** YYYY-MM-DD
**Status:** Draft | Under Review | Accepted | Implemented | Superseded

## Summary
One paragraph.

## Service and Customer Outcome

- Service: S1 | S2 | S3 | S4 | S5
- Commercial proof gate: A | B | C | D
- Operator decision improved:
- Measurable customer outcome:

Reference `docs/product/service-delivery-charter-v1.md`. If no service outcome
applies, explain why this work belongs in the product before proceeding.

## Motivation and Evidence

Why is this needed? Reference architecture, research, incidents, customer
evidence, or measured engineering constraints. Distinguish evidence from
assumptions.

## Business Rules and Invariants

- Rules that must always hold
- Observed/configured/derived/inferred/predicted/unknown classification
- Behavior with missing, stale, contradictory, duplicate, and out-of-order data
- Cross-industry assumptions and configuration boundaries

## Detailed Design
- Data structures
- Algorithm
- API changes
- Database changes
- Frontend changes
- Configuration

## Security, Privacy, and Safety Boundaries

- Authentication and authorization
- Tenant and data isolation
- Secrets and sensitive evidence
- Audit requirements
- Network and OT safety

## Failure and Recovery Behaviour

- Invalid input and unsupported versions
- Dependency, network, database, and storage failure
- Partial, duplicate, and concurrent operations
- Retry, idempotency, backpressure, and recovery where applicable
- Operator-visible degraded behaviour

## Alternatives and Trade-offs

- Reasonable alternatives considered
- Why the chosen design best fits the existing architecture
- Complexity, coupling, scale, and operational costs accepted

## Non-Goals
What is explicitly out of scope.

## Implementation Plan
1. Step one (estimated effort)
2. Step two
3. Step three

## Testing Approach
- Unit tests
- Integration tests
- E2E tests
- Boundary and invalid-input tests
- Failure and recovery tests
- Authorization, isolation, and audit tests
- Performance or target-hardware tests where applicable
- Customer-outcome measurement

## Release and Implementation Truth

- What becomes implemented by this RFC
- What remains synthetic, experimental, or planned
- Which service gate, if any, becomes eligible to pass
- Evidence required before external claims are allowed

## Rollback Plan
How to disable if it breaks in production.

## Post-Implementation Engineering Review

Review correctness, cyclomatic and cognitive complexity, readability,
maintainability, coupling/cohesion, duplication, naming, error handling,
security, test coverage, architectural consistency, scale, and unnecessary
complexity. Record questionable decisions and follow-up work explicitly.

## Open Questions
- [ ] Question 1
- [ ] Question 2
