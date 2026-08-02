# ADR-006: Passive Time Synchronisation

**Date:** 2026-05-21
**Status:** Accepted
**Author:** Dennis

## Context
Devices on a network may have misaligned hardware clocks. Accurate event ordering is critical for fault localization and forensic replay. NTP is not universally configured in OT environments.

## Decision
The normalisation engine estimates clock offsets from observed request-response pairs and corrects timestamps. Events with offset uncertainty >50ms are tagged `clock_unsynced`.

## Consequences
- **Easier:** Correct event ordering without requiring NTP on all devices.
- **Harder:** Accuracy limited for protocols with variable processing time (Modbus from busy PLCs). Clock_unsynced tag reduces confidence.
- **Risks:** Poor accuracy on high-latency or jittery networks.

## Alternatives Considered
- **NTP enforcement:** Rejected — not feasible in many OT environments.
- **No correction:** Rejected — leads to incorrect fault localization.

## References
- FR-NORM-002, FR-NORM-003
- RFC-002

