# Functional Requirements

This document captures the functional requirements for NetSense and groups them by subsystem. Each requirement keeps its RFC and ADR references so the product tree stays traceable.

## FR-CAP: Capture and Collection

**FR-CAP-001 - Passive Packet Capture**
The probe SHALL capture all IP packets arriving on the mirror port interface using gopacket with a kernel-level BPF filter that excludes broadcast and multicast traffic by default.
Phase: 1 | RFC: RFC-001 | ADR: ADR-001

**FR-CAP-002 - Configurable BPF Filter**
The probe SHALL allow the BPF filter to be configured to include or exclude specific protocols, VLANs, or IP ranges during setup.
Phase: 1 | RFC: RFC-001

**FR-CAP-003 - Broadcast Capture Toggle**
The probe SHALL support an optional configuration to include broadcast and multicast traffic in capture, disabled by default.
Phase: 1 | RFC: RFC-001

**FR-CAP-004 - Packet Layer Extraction**
The probe SHALL extract from every captured packet: source MAC, destination MAC, source IP, destination IP, protocol, source port, destination port, IP TTL, packet length, and kernel timestamp.
Phase: 1 | RFC: RFC-001

**FR-CAP-005 - TCP Handshake Tracking**
The probe SHALL track TCP three-way handshakes and measure connection establishment time for sessions visible on the mirror port.
Phase: 1 | RFC: RFC-001

**FR-CAP-006 - SNMP Polling**
The probe SHALL poll managed network devices via SNMPv2c and SNMPv3 on configurable schedules: 30-second default for status metrics, 5-minute default for performance metrics.
Phase: 2 | RFC: RFC-002 | ADR: ADR-001

**FR-CAP-007 - SNMP MIB Coverage**
The probe SHALL poll the following MIB objects per managed switch: sysDescr, sysUpTime, sysName, sysLocation, ifNumber, ifDescr, ifOperStatus, ifAdminStatus, ifInOctets, ifOutOctets, ifInErrors, ifOutErrors, ifInDiscards, ifOutDiscards, dot1dStpPortState, lldpRemSysName, lldpRemPortId.
Phase: 2 | RFC: RFC-002

**FR-CAP-008 - SNMPv3 Security**
The probe SHALL support SNMPv3 with SHA-256 authentication and AES-256 encryption. SNMPv2c SHALL be supported for legacy devices. SNMPv1 SHALL NOT be supported.
Phase: 2 | RFC: RFC-002

**FR-CAP-009 - Syslog Collection**
The probe SHALL listen on UDP port 514 and TCP port 514 for syslog messages and parse RFC 3164 and RFC 5424 formats.
Phase: 2 | RFC: RFC-002

**FR-CAP-010 - Syslog Vendor Parsing**
The probe SHALL parse structured fields from syslog messages for: Cisco IOS, Cisco NX-OS, Juniper Junos, HP/Aruba, Fortinet FortiGate, pfSense, and generic Linux syslog. Unrecognized formats SHALL be stored as raw text metrics.
Phase: 2 | RFC: RFC-002

**FR-CAP-011 - NetFlow/IPFIX Collection**
The probe SHALL receive NetFlow v5, NetFlow v9, and IPFIX flow records on UDP port 2055 (configurable).
Phase: 4 | RFC: RFC-003

**FR-CAP-012 - ICMP Synthetic Probing**
The probe SHALL send ICMP echo requests between network infrastructure devices on a configurable schedule and measure round-trip time and packet loss.
Phase: 2 | RFC: RFC-002

**FR-CAP-013 - ICMP Probing Exclusion**
The probe SHALL NOT send ICMP probes to any device on the exclusion list. ICMP probing to field devices SHALL require explicit configuration.
Phase: 2 | RFC: RFC-002 | ADR: ADR-003

**FR-CAP-014 - Modbus Active Polling**
The probe SHALL support active Modbus TCP polling of explicitly whitelisted PLCs using read-only function codes (FC01, FC02, FC03, FC04) only. Write function codes SHALL be architecturally impossible to call from the Modbus plugin.
Phase: 4 | RFC: RFC-003 | ADR: ADR-003

**FR-CAP-015 - Modbus Passive Parsing**
The probe SHALL parse Modbus TCP conversations from mirrored traffic for all observed devices, extracting function codes, unit IDs, response times, and exception codes without any active interaction with the device. This applies to devices on both the exclusion list and the whitelist. The parsed data SHALL populate the topology graph with PLC and SCADA device nodes.
Phase: 2 | RFC: RFC-002 | ADR: ADR-003

**FR-CAP-016 - OPC-UA Subscription**
The probe SHALL connect to OPC-UA servers on whitelisted devices using the subscription model. The probe SHALL browse the address space on first connection and present discovered nodes for engineer selection before subscribing.
Phase: 4 | RFC: RFC-003 | ADR: ADR-003

**FR-CAP-017 - Collection Plugin Architecture**
Every collection protocol SHALL be implemented as a plugin conforming to the Collector interface. New protocols SHALL be addable without modifying the core engine.
Phase: 1 | RFC: RFC-001 | ADR: ADR-001

**FR-CAP-018 - Plugin Failure Isolation**
If a collection plugin goroutine panics or exits unexpectedly, the collection manager SHALL detect the failure, log it, and restart the plugin with exponential backoff. Other plugins SHALL continue operating normally.
Phase: 2 | RFC: RFC-001

## FR-NORM: Normalisation

**FR-NORM-001 - Standard Event Format**
All collected data from all sources SHALL be converted to a standard Event struct containing: timestamp, device IP, device MAC, metric name, value, source, protocol, observation reliability, baseline confidence, tags, and raw reference.
Phase: 1 | RFC: RFC-002

**FR-NORM-002 - Passive Time Synchronisation**
The normalisation engine SHALL estimate clock offsets for each device from observed request-response pairs and correct event timestamps before storage.
Phase: 3 | RFC: RFC-002 | ADR: ADR-006

**FR-NORM-003 - Clock Unsync Tag**
Events from devices where the clock offset estimate uncertainty exceeds 50ms SHALL be tagged `clock_unsynced` and stored with their raw timestamps.
Phase: 3 | RFC: RFC-002 | ADR: ADR-006

**FR-NORM-004 - Baseline Confidence Tagging**
Every event SHALL carry a `baseline_confidence` field (0.0 to 1.0) representing the baseline engine's confidence for that device-metric pair.
Phase: 3 | RFC: RFC-002 | ADR: ADR-004

**FR-NORM-005 - Observation Reliability Tagging**
Every event SHALL carry an `obs_reliability` field (0.0 to 1.0) from the passive capture plugin's observation reliability tracker.
Phase: 3 | RFC: RFC-002

## FR-TOP: Topology

**FR-TOP-001 - Topology Graph Construction**
The system SHALL construct and maintain a directed graph of all observed devices (nodes) and their connections (edges) from LLDP, CDP, passive traffic analysis, and NetFlow data.
Phase: 2 | RFC: RFC-003

**FR-TOP-002 - Link Classification**
Each topology edge SHALL be classified as: `physical_confirmed` (LLDP or CDP confirmed), `physical_inferred` (passive traffic analysis), or `logical` (VLAN/routing relationships).
Phase: 2 | RFC: RFC-003

**FR-TOP-003 - Device Classification**
Each topology node SHALL carry a `device_type` attribute: switch, router, firewall, server, workstation, plc, hmi, scada, historian, or unknown. The `device_type` for PLCs discovered via passive Modbus parsing SHALL be `plc`. The `device_type` for SCADA servers discovered via passive traffic analysis on common SCADA ports SHALL be `scada`.
Phase: 2 | RFC: RFC-003

**FR-TOP-004 - Device Criticality**
Each device SHALL have a configurable `operationalCriticality` rating from 1
(low) to 5 (mission-critical), defaulting to 3 (important). Operational
criticality SHALL remain independent of operational health, incident severity,
evidence confidence, observation freshness, monitoring coverage, and management
state.
Phase: 2 | RFC: RFC-003 | ADR: ADR-007

**FR-TOP-005 - Topology Visualization**
The dashboard SHALL render the topology as an interactive force-directed graph using Cytoscape.js, with node size proportional to criticality and node color indicating status.
Phase: 2 | RFC: RFC-003

**FR-TOP-006 - Topology WebSocket Updates**
Topology changes SHALL be streamed to the dashboard via WebSocket as diff events (node_status_change, node_added, node_removed, edge_added, edge_removed) rather than full topology re-fetches.
Phase: 3 | RFC: RFC-003

**FR-TOP-007 - Topology Freeze**
The engineer SHALL be able to freeze the topology layout to prevent the force-directed algorithm from moving nodes. Node positions SHALL be saved per user.
Phase: 3 | RFC: RFC-003

## FR-BAS: Baseline

**FR-BAS-001 - Per-Device Baselines**
Every device-metric pair SHALL have its own independent baseline computed using Holt-Winters triple exponential smoothing with additive seasonality.
Phase: 3 | RFC: RFC-004 | ADR: ADR-004

**FR-BAS-002 - Confidence-Weighted Control Limits**
Baseline confidence SHALL grow from 0.10 to 1.00 over 14 days as data accumulates. Control limits SHALL narrow accordingly: +/-5 sigma at confidence 0.10, +/-4 sigma at 0.40, +/-3 sigma at 0.70, and +/-2 sigma at confidence 1.00.
Phase: 3 | RFC: RFC-004 | ADR: ADR-004

**FR-BAS-003 - Alerting from Day Zero**
Alerts SHALL fire from the first observation of a device. Alerts from baselines with confidence below 1.00 SHALL carry a LOW_BASELINE_CONFIDENCE tag and the specific confidence value.
Phase: 3 | RFC: RFC-004 | ADR: ADR-004

**FR-BAS-004 - Concept Drift Detection**
The system SHALL run a Kolmogorov-Smirnov test nightly on every device-metric pair, comparing the prediction error distribution of the last 7 days against the previous 7 days.
Phase: 3 | RFC: RFC-004

**FR-BAS-005 - Baseline Drift Handling**
When concept drift is detected (p < 0.05), the system SHALL log an information event, recompute the baseline from the last 21 days of data, and record the old and new parameters. This SHALL NOT generate an alert.
Phase: 3 | RFC: RFC-004

**FR-BAS-006 - Parameter Optimization**
Holt-Winters parameters (alpha, beta, gamma) SHALL be initialized to standard values and optimized per device-metric pair by minimizing prediction error over the first 14 days of data, then fixed until drift is detected.
Phase: 3 | RFC: RFC-004

**FR-BAS-007 - Missing Data Handling**
The baseline engine SHALL handle gaps in metric data without corrupting the baseline state.
Phase: 3 | RFC: RFC-004 | ADR: ADR-004
1. Gaps shorter than 6 hours: The baseline engine SHALL use the last-known-good value for Holt-Winters parameter updates, SHALL mark the interpolated points as `interpolated` in the metric tags, and SHALL pause the Holt-Winters trend (beta) updates while preserving the level (alpha) and seasonal (gamma) parameters.
2. Gaps between 6 and 24 hours: The baseline engine SHALL pause all Holt-Winters parameter updates for the affected device-metric pair. When data resumes, the engine SHALL warm-restart from the last saved state without re-optimization.
3. Gaps exceeding 24 hours: The baseline engine SHALL flag the baseline as requiring re-initialization. The device-metric pair SHALL restart from confidence 0.40 (not 0.10) with the previously optimized alpha/beta/gamma parameters preserved, recognizing that the device behavior is likely unchanged but the gap is too large to interpolate.
4. The system SHALL NOT generate anomaly alerts for interpolated values.
5. When data resumes after a gap exceeding 1 hour, the first 5 minutes of new data SHALL be used exclusively for baseline re-stabilization and SHALL NOT trigger anomaly alerts.

## FR-FAULT: Fault Detection and Localization

**FR-FAULT-001 - Anomaly Detection**
An anomaly SHALL fire when a metric reading falls outside the upper or lower control limits of its baseline.
Phase: 3 | RFC: RFC-005

**FR-FAULT-002 - Maintenance Window Suppression**
Anomalies for devices in an active maintenance window SHALL be logged silently with a suppression flag and SHALL NOT generate alerts.
Phase: 3 | RFC: RFC-005

**FR-FAULT-003 - Alert Deduplication**
If the same anomaly fires within 15 minutes of a previous alert for the same device-metric pair, the existing incident SHALL be updated rather than a new alert created.
Phase: 3 | RFC: RFC-005

**FR-FAULT-004 - Observation Reliability Severity Adjustment**
If the observation reliability for an alerting device is below 80%, the alert severity SHALL be downgraded by one level and the reliability score SHALL be included in the alert text.
Phase: 3 | RFC: RFC-005

**FR-FAULT-005 - Deterministic Fault Localization**
When two or more devices enter degraded or down status within a 30-second window, the system SHALL find all ancestor nodes of the degrading devices and return them ranked by the count of currently-degrading descendants.
Phase: 3 | RFC: RFC-005

**FR-FAULT-006 - Blast Radius Calculation**
When any device shows early warning signs (metrics trending outside normal band before threshold breach), the system SHALL calculate and report: total downstream devices, device types affected, estimated users affected, and services at risk. This information SHALL be included in the alert before any device fails.
Phase: 3 | RFC: RFC-005

**FR-FAULT-007 - Root Cause Override Capture**
The incident resolution form SHALL include a field for the engineer to record the actual root cause device IP if it differs from the system's probable cause. This field SHALL be stored in the incident record and used as ground truth for the Bayesian causality engine in Phase 5.
Phase: 4 | RFC: RFC-006

## FR-INC: Incident Management

**FR-INC-001 - Incident Creation**
A valid anomaly SHALL create an incident record in PostgreSQL containing: start time, affected devices, severity, probable cause, and automatic detection flag.
Phase: 4 | RFC: RFC-006

**FR-INC-002 - Incident Signature**
Every incident SHALL have a signature vector stored as JSONB containing: affected device types, anomalous metrics, time of day bucket, day of week, topology depth from core, protocol, and severity.
Phase: 4 | RFC: RFC-006

**FR-INC-003 - Similar Incident Matching**
When a new incident fires, the system SHALL compute cosine similarity between the new incident's signature and all historical incident signatures for the same tenant, returning the top 3 most similar incidents with their resolution notes.
Phase: 4 | RFC: RFC-006

**FR-INC-004 - Incident Acknowledgment**
An engineer SHALL be able to acknowledge an incident, recording their identity and the acknowledgment timestamp.
Phase: 4 | RFC: RFC-006

**FR-INC-005 - Incident Resolution**
A senior engineer SHALL be able to mark an incident resolved with resolution notes. Resolution notes SHALL be editable after resolution.
Phase: 4 | RFC: RFC-006

**FR-INC-006 - Incident Log Search**
The incident log SHALL be searchable and filterable by: status, severity, device IP, date range, and text search across resolution notes.
Phase: 4 | RFC: RFC-006

## FR-PCAP: Forensic Capture

**FR-PCAP-001 - Triggered Capture**
When the anomaly engine fires, the probe SHALL capture a 5-minute window of packet data centered on the anomaly event. The capture SHALL be achieved by preserving the contents of the 150-second ring buffer (covering the 2.5 minutes before the alert) and continuing capture for a further 150 seconds after the alert.
Phase: 3 | RFC: RFC-007

**FR-PCAP-002 - PCAP Compression**
Triggered PCAP files SHALL be compressed with LZ4 before storage.
Phase: 3 | RFC: RFC-007

**FR-PCAP-003 - PCAP Encryption**
All PCAP files SHALL be encrypted at rest using AES-256-GCM with a key derived from the deployment's master secret.
Phase: 3 | RFC: RFC-007 | ADR: ADR-005

**FR-PCAP-004 - PCAP Retention**
PCAP files SHALL be retained for 30 days by default, configurable per deployment. Deletion SHALL be automatic and logged.
Phase: 3 | RFC: RFC-007

## FR-ALERT: Alert Delivery

**FR-ALERT-006 - Offline Alert Fallback**
If the platform connection drops, the local probe SHALL fallback to local SMTP and a locally connected GSM modem, if equipped via USB, to fire SMS alerts independently of the site's WAN connection.
Phase: 4 | Source: User request

## FR-DEPLOY: Deployment Resilience

**FR-DEPLOY-005 - Local Operation During Disconnection**
When disconnected from the internet or cloud platform, the probe SHALL continue local capture, collection, normalisation, alert evaluation, and incident buffering without interruption.
Phase: 4 | Source: User request

**FR-DEPLOY-007 - Row-Level Security**
For multi-tenant SaaS deployments (Model 4), the PostgreSQL and TimescaleDB databases SHALL enforce Row-Level Security (RLS) policies on all tables containing a `tenant_id`. The FastAPI application SHALL set the PostgreSQL session variable for the tenant ID before executing any query, ensuring cross-tenant data access is blocked at the database engine layer.
Phase: 4 | Source: User request

## FR-API: Tenant-Scoped API

**FR-API-006 - Tenant-Scoped API Enforcement**
All API responses and mutations SHALL remain scoped to the requesting tenant, with database access constrained by RLS rather than application-side `WHERE tenant_id = ...` filters alone.
Phase: 4 | Source: User request

## FR-UI: Critical Incident Visualization

**FR-UI-001 - Three-Layer Adaptive Interface**
The dashboard SHALL use a three-layer adaptive interface, and Layer 3 Critical Incident mode SHALL render the blast radius from FR-FAULT-006 by fading unaffected nodes and highlighting the affected downstream path in amber or another high-contrast warning color.
Phase: 4 | Source: User request
