# Requirements Traceability

This matrix links the functional requirement groups to the RFCs, ADRs, and test cases already present in the docs tree.

| Requirement Group | RFCs | ADRs | Primary Test Case |
| --- | --- | --- | --- |
| FR-CAP: Capture and Collection | RFC-001, RFC-002, RFC-003 | ADR-001, ADR-003 | TC-capture-engine |
| FR-NORM: Normalisation | RFC-002 | ADR-004, ADR-006 | TC-normalisation |
| FR-TOP: Topology | RFC-003 | None | TC-topology-graph |
| FR-BAS: Baseline | RFC-004 | ADR-004 | TC-baseline-engine |
| FR-FAULT: Fault Detection and Localization | RFC-005, RFC-006 | None | TC-anomaly-engine, TC-fault-localization |
| FR-INC: Incident Management | RFC-006 | None | TC-incident-memory |
| FR-PCAP: Forensic Capture | RFC-007 | ADR-005 | TC-pcap-forensics |
| FR-ALERT: Alert Delivery | Cross-cutting | None | TC-anomaly-engine |
| FR-DEPLOY: Deployment Resilience | Cross-cutting | None | TC-api |
| FR-API: Tenant-Scoped API | Cross-cutting | None | TC-api |
| FR-UI: Critical Incident Visualization | Cross-cutting | None | TC-dashboard |

## Notes

- RFC-008 is reserved in the doc tree for future predictor work and is not referenced by the pasted requirement set.
- The product testing directory already contains matching case names for the major subsystem flows.
