# Acceptance Criteria

This file captures high-level acceptance criteria that must be met for each
release. Customer-facing service release is additionally governed by the
[service delivery charter](../service-delivery-charter-v1.md). Passing a UI or
component test does not make a service generally available.

## Universal release criteria

- Implementation status is stated accurately as implemented, synthetic,
  experimental, or planned.
- Normal, boundary, invalid-input, failure, recovery, authorization, and
  tenant-isolation behaviour is tested where applicable.
- Important conclusions preserve evidence provenance, observation time,
  confidence, and limitations.
- Missing or stale evidence degrades to unknown or limited visibility rather
  than an unsupported health or impact claim.
- Accessible non-graph workflows remain available if topology layout or
  rendering fails.
- Applicable performance, storage, packet-loss, and recovery budgets pass in
  the supported deployment profile.
- Documentation, runbooks, migrations, rollback, and observability are updated
  with the behaviour.

## Subsystem criteria

- Core capture functionality: probe captures mirrored traffic and produces device list.
- Baseline accuracy: baselines converge and false positive rate below target after warm-up.
- Forensic capture: triggered PCAPs capture requested windows and are retrievable by authorized roles.
- Dashboard: topology renders, incidents listed, and replay works for captured incidents.

Each subsystem criterion must be expanded into a versioned test case before
release. The matching commercial service gate also requires validation on an
authorised real network; fixtures prove deterministic behaviour but not live
coverage or operational safety.
