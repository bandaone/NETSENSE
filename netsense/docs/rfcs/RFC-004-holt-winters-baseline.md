# RFC-004: Holt-Winters Baseline

## Scope

This RFC covers per-device baselines, confidence growth, drift detection, parameter optimization, and missing-data handling.

## Related Requirements

- FR-BAS-001
- FR-BAS-002
- FR-BAS-003
- FR-BAS-004
- FR-BAS-005
- FR-BAS-006
- FR-BAS-007

## Summary

The baseline engine computes one Holt-Winters model per device-metric pair, starts alerting from the first observation, and tightens control limits as confidence grows.

It also handles gaps in a stateful way: short gaps interpolate, medium gaps pause updates, and long gaps trigger a controlled reinitialization path without discarding the optimized parameters.
