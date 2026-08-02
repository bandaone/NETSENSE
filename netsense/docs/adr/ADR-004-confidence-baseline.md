# ADR-004: Confidence-Weighted Baselines

**Date:** 2026-05-21
**Status:** Accepted
**Author:** Dennis

## Context
Traditional anomaly detection silences new devices for 14 days until sufficient data exists. In operational networks, new devices need monitoring immediately. A compromise is needed between early alerting and false positive control.

## Decision
Baselines start with wide control limits (±5σ) and low confidence (0.10). Confidence grows to 1.00 over 14 days as control limits narrow to ±2σ. Alerts fire from day zero with a `LOW_BASELINE_CONFIDENCE` tag. Missing data is handled by interpolation (<6h), pause (6-24h), or re-initialization (>24h).

## Consequences
- **Easier:** Immediate visibility into new devices. Engineers understand the system's uncertainty.
- **Harder:** More alerts in the first two weeks (flagged as low confidence). Requires engineers to interpret confidence tags.
- **Risks:** Confidence schedule (±5σ to ±2σ) is arbitrary and may need tuning per deployment. Instrument false positive rates and adjust.

## Alternatives Considered
- **14-day silence:** Rejected — leaves new devices unmonitored during critical early period.
- **Global thresholds:** Rejected — produces excessive false alerts due to device-specific normal ranges.

## References
- FR-BAS-001 through FR-BAS-007
- RFC-004

