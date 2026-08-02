# ADR-003: OT Device Exclusion as Default-Deny

**Date:** 2026-05-21
**Status:** Accepted
**Author:** Dennis

## Context
Industrial environments contain legacy field devices (PLCs, RTUs) that can crash or reset when receiving even read-only network requests. A monitoring tool that causes production downtime is unacceptable.

## Decision
All OT field devices (PLCs, RTUs, HMIs below the SCADA layer) are placed on the exclusion list by default. Active polling (Modbus, OPC-UA, ICMP) is disabled for these devices unless explicitly whitelisted by a senior engineer through a confirmation dialog warning of the risks. Passive monitoring (traffic parsing from mirror port) remains active.

## Consequences
- **Easier:** Safe deployment in OT environments without risk of disrupting production.
- **Harder:** Some process values unavailable without whitelist configuration. Requires engineer action to enable active monitoring.
- **Risks:** Engineers may whitelist fragile devices despite warnings. Mitigated by the confirmation dialog (FR-UI-009) and automatic polling pause if errors occur.

## Alternatives Considered
- **Polling with conservative intervals:** Rejected — even low-rate polling has caused PLC resets on legacy firmware.
- **Default allow with warnings:** Rejected — too easy to misconfigure and cause production incidents.

## References
- FR-CAP-013, FR-CAP-014, FR-UI-009
- RFC-003

