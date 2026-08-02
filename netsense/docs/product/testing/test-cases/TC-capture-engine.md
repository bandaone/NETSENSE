# TC-Capture-Engine

This test-case matrix covers the FR-CAP capture and collection requirements.

| Requirement | Description | RFC | ADR | Test Cases | Phase | Status | Criticality |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FR-CAP-001 | Passive packet capture via gopacket with kernel BPF filter | RFC-001 | ADR-001 | TC-capture-001 | 1 | Not Started | High |
| FR-CAP-002 | Configurable BPF filter (protocols, VLANs, IP ranges) | RFC-001 | None | TC-capture-002 | 1 | Not Started | Medium |
| FR-CAP-003 | Broadcast capture toggle (disabled by default) | RFC-001 | None | TC-capture-003 | 1 | Not Started | Medium |
| FR-CAP-004 | Packet layer extraction (MAC, IP, ports, protocol, TTL, length, timestamp) | RFC-001 | None | TC-capture-004 | 1 | Not Started | High |
| FR-CAP-005 | TCP handshake tracking and connection time measurement | RFC-001 | None | TC-capture-005 | 1 | Not Started | Medium |
| FR-CAP-006 | SNMP polling (v2c, v3) on configurable schedules | RFC-002 | ADR-001 | TC-capture-006 | 2 | Not Started | High |
| FR-CAP-007 | SNMP MIB coverage (sysDescr, ifOperStatus, LLDP, etc.) | RFC-002 | None | TC-capture-007 | 2 | Not Started | High |
| FR-CAP-008 | SNMPv3 security (SHA-256 auth, AES-256 encryption) | RFC-002 | None | TC-capture-008 | 2 | Not Started | High |
| FR-CAP-009 | Syslog collection (UDP 514, TCP 514, RFC 3164/5424) | RFC-002 | None | TC-capture-009 | 2 | Not Started | Medium |
| FR-CAP-010 | Syslog vendor parsing (Cisco, Juniper, Aruba, Fortinet, etc.) | RFC-002 | None | TC-capture-010 | 2 | Not Started | Medium |
| FR-CAP-011 | NetFlow/IPFIX collection (v5, v9, IPFIX on UDP 2055) | RFC-003 | None | TC-capture-011 | 4 | Not Started | Medium |
| FR-CAP-012 | ICMP synthetic probing between infrastructure devices | RFC-002 | None | TC-capture-012 | 2 | Not Started | Medium |
| FR-CAP-013 | ICMP probing exclusion for exclusion list devices | RFC-002 | ADR-003 | TC-capture-013 | 2 | Not Started | High |
| FR-CAP-014 | Modbus active polling (read-only FC01-FC04, whitelist only) | RFC-003 | ADR-003 | TC-capture-014 | 4 | Not Started | High |
| FR-CAP-015 | Modbus passive parsing from mirrored traffic | RFC-002 | ADR-003 | TC-capture-015 | 2 | Not Started | High |
| FR-CAP-016 | OPC-UA subscription (address space browse, node selection) | RFC-003 | ADR-003 | TC-capture-016 | 4 | Not Started | Medium |
| FR-CAP-017 | Plugin architecture - Collector interface for all protocols | RFC-001 | ADR-001 | TC-capture-017 | 1 | Not Started | High |
| FR-CAP-018 | Plugin failure isolation - panic recovery, restart with backoff | RFC-001 | None | TC-capture-018 | 2 | Not Started | High |
