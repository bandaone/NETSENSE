# RFC-006: Incident Memory

## Scope

This RFC covers incident creation, signature storage, similarity matching, acknowledgement, resolution, and human-provided root-cause overrides.

## Related Requirements

- FR-FAULT-007
- FR-INC-001
- FR-INC-002
- FR-INC-003
- FR-INC-004
- FR-INC-005
- FR-INC-006

## Summary

The incident memory stores anomaly outcomes in PostgreSQL, maintains a structured signature for similarity comparisons, and supports the operational workflow for acknowledgement and resolution.

It also preserves the engineer's ground-truth root cause when the probable cause differs from the observed reality so the Phase 5 causality work has clean training data.
