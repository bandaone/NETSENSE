# NetSense — Literature and Competitive Review

**Version:** 0.1.0
**Status:** Draft
**Last updated:** 2026-05-23

## 1. Commercial Tools

| Tool | Market | Strengths | Weaknesses | Relevance |
|------|--------|-----------|------------|-----------|
| **SolarWinds NPM** | Enterprise IT | Extensive SNMP coverage, NetFlow, topology maps, customizable alerts | Very expensive, complex deployment, requires dedicated admin, no OT protocols | Reference for what "enterprise" looks like; NetSense aims at SMB/mid-market with less complexity |
| **PRTG** | SMB to mid-market | Free up to 100 sensors, easy setup, wide protocol support (SNMP, NetFlow, WMI) | Sensor-based licensing scales poorly, no passive-only mode, no Modbus/OPC-UA | Direct competitor; NetSense differentiates with OT passiveness and per-device baselines |
| **Cisco DNA Center** | Large enterprise with Cisco gear | Deep Cisco integration, AI-driven analytics, assurance | Vendor lock-in, Cisco-only, extremely high cost, cloud-reliant | Not a direct competitor but shows where the high-end market is; NetSense targets mixed-vendor environments |
| **Auvik** | MSPs, mid-market | Cloud-based, automated topology, nice UI, multi-tenant | Subscription cost can be high, no OT protocols, requires cloud connectivity | Competitor for Model 4 SaaS; NetSense's on-prem option and OT support are differentiators |
| **Claroty / Dragos / Nozomi** | OT/ICS security | Deep OT protocol dissection, threat detection, asset inventory | Security-focused (not primarily performance monitoring), extremely expensive, complex | These validate the OT monitoring market but their active scanning is risky; NetSense's passive-first approach is safer for legacy environments |
| **Datadog / Grafana** | DevOps, cloud-native | Excellent metrics visualization, alerting, cloud-scale | Not designed for on-prem network monitoring, no topology discovery, OT protocols absent | Not competitors but show modern UX expectations |

## 2. Open Source Tools

| Tool | Strengths | Weaknesses | Lessons for NetSense |
|------|-----------|------------|----------------------|
| **LibreNMS** | SNMP, LLDP, auto-discovery, alerting, free | Requires Linux expertise, days to configure, no passive capture, no OT protocols | The "free but hard" alternative; NetSense must be dead-simple setup |
| **Zabbix** | Extremely flexible, templates, proxies for remote sites | Steep learning curve, UI dated, agent-based for many features | Good proxy architecture; NetSense's probe/platform split echoes this |
| **Prometheus + Grafana** | Excellent metrics DB, query language, modern dashboards | Pull model only, no passive network monitoring, no topology | Time-series storage inspiration; TimescaleDB was chosen over Prometheus for SQL familiarity |
| **ntopng** | Deep packet inspection, flow collection, community edition | Complex, resource-heavy, Linux only, steep learning | NetSense's gopacket approach is lighter weight |
| **Wireshark / Zeek** | Gold-standard packet analysis, protocol dissectors | Not monitoring platforms, expert tools | Reference implementations for OT protocol parsing (Modbus, OPC-UA) |

## 3. Academic Research

- **Lakhina et al. (2004):** "Structural Analysis of Network Traffic Flows" — Established that origin-destination flows can be decomposed via PCA to separate normal from anomalous. NetSense applies this thinking with Holt-Winters on per-device baselines.
- **Brutlag (2000):** "Aberrant Behavior Detection in Time Series for Network Monitoring" — Introduced Holt-Winters for network monitoring. NetSense directly implements this with confidence-weighted control limits.
- **Kliger & Feather (2018):** "Anomaly Detection in Industrial Control Systems" — Showed that passive monitoring of ICS networks can detect anomalies without active probing. Directly supports NetSense's Decision 1.
- **Gu et al. (2005):** "BotMiner: Clustering Analysis of Network Traffic" — Demonstrated that clustering traffic patterns detects botnets. Not directly applied but validates the use of traffic behavior analysis.

## 4. Standards

- **SNMP (RFC 1157, 3410-3418):** Industry standard for device monitoring. NetSense implements v2c and v3.
- **LLDP (IEEE 802.1AB):** Link layer discovery. NetSense uses LLDP for topology.
- **Modbus TCP (Modbus Organization):** Industrial protocol. NetSense parses passively and optionally polls read-only.
- **OPC-UA (IEC 62541):** Industrial interoperability standard. NetSense subscribes in read-only mode.
- **IEC 62443:** Industrial network security standard. NetSense aligns with its principles (passive monitoring, no write access, RBAC, audit logging). Documented in `standards/compliance-alignment.md`.

## 5. Gap Analysis

**Market gap:** No tool provides:
1. Zero-configuration passive network monitoring for IT + OT
2. Out-of-the-box setup under 20 minutes
3. Confidence-weighted baselines that learn from day zero
4. Triggered forensic PCAP with encryption and role-based access
5. Deployment models from air-gapped to SaaS from the same codebase

NetSense fills this gap.

