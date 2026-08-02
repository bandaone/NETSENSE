# Non-Functional Requirements

This document captures the non-functional requirements for NetSense and groups them by quality attribute.

## NFR-PERF: Performance

**NFR-PERF-001a - Steady State Capture**
The probe SHALL capture and process 100 Mbps of mirrored traffic at under 30% CPU utilization on reference hardware (Raspberry Pi 5, 8 GB) during normal operation when no forensic capture is in progress.
Verification: Synthetic traffic generator benchmark on target hardware, 24-hour sustained run. Phase 1.

**NFR-PERF-001b - Triggered Capture Load**
During a triggered PCAP flush, CPU utilization is permitted to spike to 85% to prioritize AES-256-GCM encryption and LZ4 compression, provided that packet loss in the ring buffer remains below 0.1% and the capture goroutine is never blocked waiting for disk I/O.
Verification: Induced anomaly during sustained 100 Mbps capture. Measure CPU spike duration and packet loss count. Phase 3.

**NFR-PERF-002 - Event Processing Latency**
A packet arriving at the mirror port SHALL result in a normalized event written to the local SQLite buffer within 500ms at the 99th percentile under sustained 100 Mbps load. This measurement SHALL be taken at the probe's SQLite write, not at the cloud platform's TimescaleDB write. End-to-end latency to the cloud platform is subject to WAN conditions and is not bounded by this requirement.
Verification: Instrumented timing from gopacket timestamp to SQLite INSERT commit, measured during sustained load test. Phase 2.

**NFR-PERF-003 - Topology API Response**
GET /api/topology SHALL respond in under 50ms at the 99th percentile for networks up to 500 devices.
Verification: Load test with synthetic topology of 500 nodes and 1,200 edges. Phase 3.

**NFR-PERF-004 - Metrics Query Response**
GET /api/metrics/{ip} for 30 days of hourly data (720 data points) SHALL respond in under 100ms at the 99th percentile.
Verification: Query performance test against TimescaleDB continuous aggregates with production-scale data volume. Phase 4.

**NFR-PERF-005 - Alert WebSocket Latency**
An alert event SHALL be delivered to all connected WebSocket clients within 1 second of the anomaly engine firing. Measurement SHALL be taken from the anomaly engine's alert decision to the WebSocket write on the platform side.
Verification: Timing measurement from anomaly detection function return to WebSocket broadcast completion. Phase 3.

**NFR-PERF-006 - Dashboard Render Time**
The topology map SHALL render within 2 seconds for networks up to 500 devices on a modern browser (Chrome 120+, Firefox 120+, Edge 120+). Measurement SHALL be taken from Cytoscape.js initialization to the first interactive frame.
Verification: Browser performance profiling with React Profiler and Cytoscape.js render timing API. Phase 3.

**NFR-PERF-007 - Concurrent WebSocket Connections**
The platform SHALL support 100 concurrent WebSocket connections without increased alert delivery latency. The 99th percentile alert delivery latency SHALL not increase by more than 200ms when connection count increases from 1 to 100.
Verification: Load test with 100 simulated WebSocket clients receiving simultaneous alerts. Phase 4.

**NFR-PERF-008 - Platform Write Throughput**
TimescaleDB SHALL sustain the event write rate from 10 probes simultaneously without write queue growth. The metrics hypertable SHALL accept inserts from all probes without measurable queue depth increase over a 1-hour sustained test.
Verification: Load test with 10 simulated probes each generating events at the rate of a 100 Mbps capture. Phase 4.

**NFR-PERF-009 - Platform Scaling**
The cloud platform (Models 3 and 4) SHALL support concurrent data ingestion and processing from up to 10,000 monitored devices across multiple tenants while maintaining all API response times within their specified limits. The platform SHALL be horizontally scalable by adding additional API and processor instances behind a load balancer.
Verification: Staged load test scaling from 1,000 to 10,000 simulated devices across 100 probes and 20 tenants. Phase 5.

## NFR-REL: Reliability

**NFR-REL-001 - Probe Uptime**
The probe software SHALL achieve 99.5% uptime excluding hardware failures and planned maintenance. This SHALL be measured as: (total_minutes - unplanned_outage_minutes) / total_minutes, where unplanned_outage_minutes is any period where the probe binary is not capturing packets and processing events.
Verification: 30-day continuous run on target hardware with automated health checks every 30 seconds. Phase 4.

**NFR-REL-002 - Graceful Plugin Failure**
A single collection plugin failure (goroutine panic or unexpected exit) SHALL NOT affect other plugins or the core engine. The failed plugin SHALL restart automatically within 10 seconds. Other plugins SHALL continue producing events without interruption.
Verification: Induced plugin panic test - inject a panic into the SNMP plugin and verify Modbus, syslog, and passive capture continue operating. Phase 2.

**NFR-REL-003 - Hardware Watchdog Recovery**
If the probe software hangs and stops feeding the hardware watchdog, the hardware SHALL hard-reset the system within 60 seconds. After reset, the probe SHALL resume operation and recover the last known configuration automatically.
Verification: Induced hang test - send SIGSTOP to the probe process and measure time to system reset. Phase 2.

**NFR-REL-004 - Offline Buffer Durability**
The probe SHALL buffer at least 72 hours of normalized events locally when the platform connection is interrupted, with zero event loss if the buffer does not overflow. When the connection is restored, all buffered events SHALL be uploaded to the platform in chronological order.
Verification: 72-hour disconnect test - block WireGuard tunnel, verify buffer contents, restore tunnel, verify all events appear in TimescaleDB. Phase 4.

**NFR-REL-005 - Database Backup Integrity**
Automated backups SHALL be restorable within 2 hours. A full restore drill SHALL succeed before first customer deployment. The restored database SHALL pass integrity checks: row counts within 1% of source, hypertable structure preserved, continuous aggregates queryable.
Verification: Full backup and restore drill with integrity validation script. Phase 5.

**NFR-REL-006 - Data Integrity After Power Loss**
The probe SHALL recover to a consistent state after unexpected power loss. The SQLite buffer SHALL use WAL journaling mode. The PCAP partition SHALL use a journaling filesystem (ext4 with data=ordered). No events acknowledged as written before power loss SHALL be missing after recovery.
Verification: Repeated power-loss test - cut power to probe during sustained capture at 100 Mbps, restore power, verify SQLite integrity and PCAP file consistency. Phase 3.

## NFR-SEC: Security

**NFR-SEC-001 - Authentication**
All API access SHALL require JWT authentication. JWTs SHALL expire after 8 hours. Failed authentication attempts SHALL return HTTP 401 with no information disclosure about whether the user exists. The JWT signing key SHALL be stored in the platform's secrets store and SHALL NOT appear in configuration files or environment variables visible to application code.
Verification: Automated security test suite - attempt access without token, with expired token, with tampered token, with token for wrong tenant. Phase 4.

**NFR-SEC-002 - Role-Based Access Control**
The three roles (engineer, senior, admin) SHALL be enforced at the API layer. Attempts to access endpoints outside the user's role SHALL return HTTP 403. Role escalation SHALL be impossible without admin intervention.
Verification: Automated RBAC test suite - for each endpoint, attempt access with each role and verify correct authorization behavior. Phase 4.

**NFR-SEC-003 - PCAP Encryption at Rest**
All PCAP files SHALL be encrypted with AES-256-GCM before being written to disk. The probe SHALL store only encrypted PCAPs. The encryption key SHALL be derived from the deployment's master secret using HKDF-SHA256 with a random per-file nonce. The nonce SHALL be stored in the file header and SHALL NOT be reused.
Verification: Filesystem inspection on probe - verify no plaintext packet data exists on disk. Attempt decryption with wrong key - verify failure. Phase 3.

**NFR-SEC-004 - PCAP Key Rotation**
PCAP encryption keys SHALL rotate every 90 days. Old PCAPs SHALL remain encrypted with the key that was active when they were created. A key registry SHALL track which key ID encrypts each PCAP. Key rotation SHALL be automatic and SHALL generate an audit log entry. After rotation, the old key SHALL be retained for at least 30 days (the PCAP retention window) before being securely deleted.
Verification: Induced key rotation, verify new PCAPs use new key, verify old PCAPs still decryptable with old key, verify audit log entries. Phase 4.

**NFR-SEC-005 - PCAP Access Audit**
Every PCAP interaction SHALL be logged to the append-only pcap_access_log table: metadata view, download, share link generation, and replay view. The log SHALL record: user identity, timestamp, client IP address, incident ID, action type, and share link expiry if applicable. The log SHALL be immutable - no user role, including admin, SHALL be able to modify or delete audit log entries.
Verification: Perform each access action, query the audit log, verify all fields recorded correctly, attempt to delete/modify log entry and verify rejection. Phase 4.

**NFR-SEC-006 - WireGuard Tunnel Encryption**
All probe-to-platform communication SHALL use WireGuard encrypted tunnels. WireGuard key pairs SHALL be generated per-probe and the private key SHALL never leave the probe. The platform's public key SHALL be distributed to probes during setup. Key rotation SHALL be supported and SHALL NOT interrupt active data flows.
Verification: Traffic capture on the network path between probe and platform - verify only WireGuard-encrypted UDP packets visible. Phase 4.

**NFR-SEC-007 - No Write Access to OT Devices**
The Modbus plugin SHALL be architecturally incapable of issuing write function codes (FC05, FC06, FC15, FC16). A static analysis tool or manual code review SHALL confirm no code path exists from the plugin's Collect method to any Modbus write function. The OPC-UA plugin SHALL be limited to read subscriptions and SHALL NOT call any write service.
Verification: Code review checklist item in the PR that adds the Modbus plugin. Automated grep for write function code constants in the plugin package. Phase 4.

**NFR-SEC-008 - Password Hashing**
User passwords SHALL be stored using bcrypt with a work factor of at least 12. Password hashes SHALL be the only stored representation of user credentials. Plaintext passwords SHALL never appear in logs, API responses, or database query results.
Verification: Database inspection - verify bcrypt hash format. Log inspection - verify no plaintext passwords. Configuration review - verify work factor. Phase 4.

**NFR-SEC-009 - Firmware Update Signature Verification**
Probe firmware updates (via USB or OTA) SHALL be cryptographically signed. The probe SHALL verify the signature against a trusted public key before applying any update. Unsigned or invalidly-signed updates SHALL be rejected and the rejection SHALL be logged.
Verification: Attempt update with unsigned package - verify rejection. Attempt update with package signed by wrong key - verify rejection. Attempt update with correctly signed package - verify acceptance. Phase 4.

## NFR-USE: Usability

**NFR-USE-001 - Setup Time**
A network engineer unfamiliar with NetSense SHALL complete physical installation and the setup wizard in under 20 minutes, from unboxing the probe to a functioning dashboard showing device inventory. This SHALL be measured in a timed test with a participant who has not previously used the product.
Verification: Timed setup test with at least 3 participants unfamiliar with NetSense. Average time must be under 20 minutes. Phase 4.

**NFR-USE-002 - Health Assessment Time**
An engineer viewing the Layer 1 dashboard (all devices healthy) SHALL be able to confirm the network is healthy in under 5 seconds. The dashboard SHALL present this information without requiring any interaction - the state SHALL be visible at a glance.
Verification: Timed test with dashboard in all-green state. Participant asked "Is the network healthy?" Time measured from dashboard appearance to correct verbal confirmation. Phase 4.

**NFR-USE-003 - Alert Comprehension**
An engineer receiving an alert email SHALL be able to understand: what is wrong, which device is affected, how severe it is, and what action to take next - within 30 seconds of opening the email.
Verification: User test with 5 sample alert emails covering different severity levels and alert types. Participant asked to explain each alert. Time and accuracy measured. Phase 3.

**NFR-USE-004 - Dashboard Accessibility**
The dashboard SHALL be usable on a 1366x768 screen (common laptop resolution) without horizontal scrolling. All critical information (topology, alert feed, device detail panel) SHALL be visible and interactable at this resolution.
Verification: Automated responsive design testing at 1366x768 viewport. Manual verification that no critical UI element is hidden or requires horizontal scroll. Phase 3.

**NFR-USE-005 - Passive-Only Mode Clarity**
When the probe is operating in passive-only mode (no SNMP configured), the dashboard SHALL display a persistent, visible notification stating: "SNMP not configured - device health metrics unavailable. [Configure SNMP]" The notification SHALL include a direct link to the SNMP configuration page. The notification SHALL be dismissible but SHALL reappear on next login if SNMP remains unconfigured.
Verification: Dashboard test with passive-only probe. Verify notification appears, verify link works, verify notification reappears after dismiss + re-login. Phase 2.

## NFR-MAIN: Maintainability

**NFR-MAIN-001 - Test Coverage**
Unit test coverage SHALL exceed 80% of functions for the probe (Go) and platform (Python) codebases. Coverage SHALL be measured by go test -cover for Go and pytest --cov for Python. The CI pipeline SHALL reject PRs that reduce coverage below the threshold.
Verification: CI coverage report on every PR. Enforced from Phase 1.

**NFR-MAIN-002 - Database Migrations**
All relational database schema changes (PostgreSQL tables, indexes, constraints) SHALL be implemented as versioned Alembic migrations with upgrade and downgrade paths. Time-series hypertable migrations (TimescaleDB hypertables, continuous aggregates, retention policies) SHALL provide an upgrade path; downgrade paths for hypertables are explicitly exempt from the downgrade requirement to prevent accidental data destruction from dropping hypertables containing production data.
Verification: Migration history inspection. For relational changes, verify alembic downgrade -1 succeeds. For hypertable changes, verify alembic upgrade head succeeds. Enforced from Phase 1.

**NFR-MAIN-003 - Documentation Currency**
The OpenAPI specification (contracts/openapi.yaml), user manual, and deployment guide SHALL be updated in the same PR as any change that affects their content. A PR that changes API behavior, user-facing features, or deployment procedures without corresponding documentation updates SHALL be rejected at review.
Verification: PR review checklist item. Enforced from Phase 2.

**NFR-MAIN-004 - Protocol Plugin Addition**
Adding a new protocol plugin SHALL require changes only to: (1) a new plugin file in probe/internal/collectors/, (2) a registration line in the plugin registry, and (3) plugin-specific configuration in the probe config schema. Core engine files (normaliser/, buffer/, anomaly/) SHALL NOT require modification.
Verification: Implement a test protocol plugin (e.g., DNP3 stub) following only the documented procedure. Verify no core files changed. Phase 4.

**NFR-MAIN-005 - Dependency Count**
The probe binary SHALL have zero runtime dependencies beyond libpcap and the operating system. The binary SHALL be statically linked where possible. Running the probe binary on a fresh Ubuntu Server 24.04 installation with only libpcap installed SHALL succeed without additional package installation.
Verification: Binary execution test on fresh OS install with only apt install libpcap0.8. Phase 1.

**NFR-MAIN-006 - Code Quality Gates**
Every PR SHALL pass automated linting and type checking before merge:

Go: golangci-lint with project configuration. go vet with no warnings.

Python: ruff for linting. mypy with strict mode for all new code.

TypeScript: ESLint with project configuration. TypeScript compiler with strict: true.
The CI pipeline SHALL reject PRs that fail any of these checks.
Verification: CI pipeline configuration. Enforced from Phase 1.

## NFR-PRIV: Privacy

**NFR-PRIV-001 - PCAP Payload Minimization**
The system SHALL NOT inspect or log application-layer payload contents of captured packets. Packet payload SHALL be stored only in triggered PCAP files, which are encrypted at rest. The normalisation engine SHALL extract only protocol headers (Ethernet, IP, TCP/UDP, and protocol-specific headers for Modbus, OPC-UA, syslog) for metric generation.
Verification: Code review of normalisation engine - verify no application-layer payload parsing beyond specified protocol headers. Phase 3.

**NFR-PRIV-002 - Data Retention Enforcement**
All data SHALL be automatically deleted according to the configured retention policies. Raw metrics SHALL be retained for 30 days. Per-minute aggregates SHALL be retained for 1 year. Per-hour aggregates SHALL be retained indefinitely. PCAP files SHALL be retained for 30 days. Deletion SHALL be automatic and irreversible. Retention periods SHALL be configurable per tenant.
Verification: Query database for data older than retention period - verify no records exist. Verify retention policy configuration mechanism. Phase 4.
