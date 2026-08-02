# RFC-002: Normalisation Engine

## Scope

This RFC covers the normalization pipeline, SNMP polling, syslog ingestion, ICMP synthetic probing, and passive parsing of protocol-specific device telemetry.

## Related Requirements

- FR-CAP-006
- FR-CAP-007
- FR-CAP-008
- FR-CAP-009
- FR-CAP-010
- FR-CAP-012
- FR-CAP-013
- FR-CAP-015
- FR-NORM-001
- FR-NORM-002
- FR-NORM-003
- FR-NORM-004
- FR-NORM-005

## Summary

The normalisation engine converts all source data into the shared Event struct, applies passive clock offset correction, and preserves confidence signals from the capture pipeline and baseline engine.

It also owns the managed-device collection paths used in phase 2: SNMP polling, syslog parsing, ICMP probing, and passive Modbus extraction.
