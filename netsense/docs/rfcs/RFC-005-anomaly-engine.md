# RFC-005: Anomaly Engine

## Scope

This RFC covers anomaly detection, maintenance-window suppression, deduplication, severity adjustment, deterministic fault localization, and blast radius calculation.

## Related Requirements

- FR-FAULT-001
- FR-FAULT-002
- FR-FAULT-003
- FR-FAULT-004
- FR-FAULT-005
- FR-FAULT-006

## Summary

The anomaly engine compares observations against baseline limits and emits alerts with reliability-aware severity adjustments.

When multiple devices degrade at once, it ranks likely ancestor causes by descendant count and includes blast-radius context before failure is fully observed.
