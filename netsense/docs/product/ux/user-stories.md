# NetSense - User Stories

**Version:** 0.1.0
**Status:** Draft
**Last updated:** 2026-05-23

User stories are organized by epic. Each story maps to one or more functional requirements. Stories are written in the standard format: "As a [persona], I want [capability], so that [outcome]."

Priorities:
- **P0 (Must Have):** Required for Phase 1-3. System cannot demonstrate core value without this story.
- **P1 (Should Have):** Required for Phase 4. Full product experience depends on this story.
- **P2 (Nice to Have):** Phase 5 or deferred. Enhances the product but not blocking.

---

## Epic 1: Onboarding and Setup

**Goal:** A new customer gets from unboxing to a functioning dashboard in under 20 minutes.

| ID | Story | Persona | Priority | FR Trace |
|----|-------|---------|----------|----------|
| ONB-01 | As Bwalya, I want to plug in the probe, open a browser, and complete setup in under 10 minutes, so that I can start monitoring without calling a vendor. | Bwalya | P0 | FR-DEPLOY-002 |
| ONB-02 | As Mutale, I want the probe to work without SNMP credentials if I don't know them, so that I can get basic visibility even when the previous IT person didn't leave documentation. | Mutale | P0 | FR-DEPLOY-003 |
| ONB-03 | As Bwalya, I want the setup wizard to discover devices on my network immediately and show me what it found, so that I can confirm the probe is working before I finish setup. | Bwalya | P0 | FR-DEPLOY-002 |
| ONB-04 | As Mutale, I want all OT devices automatically placed on the exclusion list during setup, so that I don't accidentally configure active polling on a production PLC. | Mutale | P0 | FR-CAP-013, FR-DEPLOY-002 |
| ONB-05 | As Thabo, I want to pre-configure probes before shipping them to client sites, so that on-site setup is plug-and-play. | Thabo | P1 | FR-DEPLOY-002 |
| ONB-06 | As Bwalya, I want to update the probe firmware from a USB drive without internet, so that I can keep the system current in our air-gapped environment. | Bwalya | P1 | FR-DEPLOY-004 |
| ONB-07 | As Chanda, I want to add and remove user accounts for my team, so that only authorized people can access the monitoring system. | Chanda | P1 | FR-API-003 |

---

## Epic 2: Topology and Visibility

**Goal:** The dashboard shows every device on the network, how they're connected, and their current status - automatically, without manual entry.

| ID | Story | Persona | Priority | FR Trace |
|----|-------|---------|----------|----------|
| TOP-01 | As Bwalya, I want to see a map of my entire network - every switch, server, PLC, and HMI - automatically discovered, so that I don't have to maintain a manual inventory. | Bwalya | P0 | FR-TOP-001, FR-TOP-005 |
| TOP-02 | As Mutale, I want the topology map to show me which devices are up (green) and which are down (red) at a glance, so that I can assess network health in seconds. | Mutale | P0 | FR-UI-002 |
| TOP-03 | As Bwalya, I want to see how devices are connected - which switch port serves which device - confirmed by LLDP, so that I can trace a fault without walking to the cabinet. | Bwalya | P0 | FR-TOP-002 |
| TOP-04 | As Mutale, I want PLCs and SCADA servers to appear on the topology map even though they're never actively polled, so that I have visibility into the production network without touching it. | Mutale | P0 | FR-CAP-015, FR-TOP-003 |
| TOP-05 | As Bwalya, I want to freeze the topology layout and arrange nodes to match the physical network diagram, so that the dashboard matches my mental model. | Bwalya | P2 | FR-TOP-007 |
| TOP-06 | As Thabo, I want to see all 15 client sites on one screen with health indicators, so that I can triage without clicking into each site. | Thabo | P1 | FR-UI-008 |
| TOP-07 | As Bwalya, I want the topology to update in real time when a device goes down or a new device appears, so that I'm always looking at current state. | Bwalya | P1 | FR-TOP-006 |

---

## Epic 3: Alerting

**Goal:** The right person knows about a problem within seconds, with enough context to act.

| ID | Story | Persona | Priority | FR Trace |
|----|-------|---------|----------|----------|
| ALT-01 | As Mutale, I want to receive an SMS when a critical device goes down, so that I know about it even when I'm away from the control room. | Mutale | P0 | FR-ALERT-002 |
| ALT-02 | As Bwalya, I want the alert to tell me what's wrong, which device, how severe, and what's affected - in plain language - so that I can decide what to do in 30 seconds. | Bwalya | P0 | FR-ALERT-001, NFR-USE-003 |
| ALT-03 | As Mutale, I don't want to receive 40 alerts for one fault. I want one alert that updates if things get worse, so that my phone doesn't become useless from alert noise. | Mutale | P1 | FR-FAULT-003, FR-ALERT-004 |
| ALT-04 | As Bwalya, I want alerts suppressed automatically when I've scheduled maintenance, so that I don't get woken up for planned work. | Bwalya | P0 | FR-FAULT-002 |
| ALT-05 | As Chanda, I want to receive critical alerts if no engineer acknowledges them within 10 minutes, so that I can escalate before a small problem becomes a production stoppage. | Chanda | P1 | FR-ALERT-003 |
| ALT-06 | As Bwalya, I want the alert to include similar past incidents and how they were resolved, so that I don't have to figure out the same problem twice. | Bwalya | P1 | FR-INC-003 |
| ALT-07 | As Mutale, I want an alert to tell me if the observation reliability is low, so that I don't waste time chasing a problem that might be a monitoring artifact. | Mutale | P1 | FR-FAULT-004 |

---

## Epic 4: Incident Response and Forensics

**Goal:** When something breaks, the engineer has everything they need to diagnose and resolve it - including packet-level evidence.

| ID | Story | Persona | Priority | FR Trace |
|----|-------|---------|----------|----------|
| INC-01 | As Mutale, I want the dashboard to show me a step-by-step checklist based on how this problem was fixed before, so that I can resolve incidents without calling Bwalya at 2 AM. | Mutale | P0 | FR-UI-001 (Layer 3) |
| INC-02 | As Bwalya, I want to see the 4-hour metric chart with the normal range shaded, so that I can see exactly when and how far the metric deviated. | Bwalya | P0 | FR-UI-004 |
| INC-03 | As Bwalya, I want to download the actual packets from the 5 minutes around the incident, so that I can prove to a vendor that the problem is in their equipment. | Bwalya | P1 | FR-PCAP-005 |
| INC-04 | As Bwalya, I want to watch an animated replay of the incident showing which devices failed and in what order, so that I understand the cascade. | Bwalya | P1 | FR-REPLAY-002 |
| INC-05 | As Bwalya, I want to share a replay with the SCADA vendor via a link that expires, so that they can see the evidence without getting access to our whole monitoring system. | Bwalya | P1 | FR-REPLAY-004 |
| INC-06 | As Mutale, I want to add resolution notes after I fix something, so that next time this happens, the next engineer has my notes. | Mutale | P1 | FR-INC-005 |
| INC-07 | As Bwalya, I want to rewind the topology to yesterday at 14:30 when the operator said "the system was slow," so that I can investigate historical issues. | Bwalya | P1 | FR-UI-003 |
| INC-08 | As Bwalya, I want the system to tell me which device is the most likely root cause when multiple things fail, so that I go to the right place first. | Bwalya | P0 | FR-FAULT-005 |

---

## Epic 5: Baselines and Anomalies

**Goal:** The system learns what's normal and alerts on deviations - without drowning the engineer in false positives.

| ID | Story | Persona | Priority | FR Trace |
|----|-------|---------|----------|----------|
| BAS-01 | As Bwalya, I want the system to learn that the SCADA server is always busier on Monday morning than Friday afternoon, so that a Monday morning spike doesn't trigger a false alert. | Bwalya | P0 | FR-BAS-001 |
| BAS-02 | As Bwalya, I want a new device added to the network to start alerting immediately if something is seriously wrong, but with a note that the baseline is still learning, so that I get early warning without false confidence. | Bwalya | P0 | FR-BAS-002, FR-BAS-003 |
| BAS-03 | As Mutale, I want the system to notice when a PLC's response time is gradually increasing over weeks, so that I can investigate before it fails. | Mutale | P0 | FR-BAS-001, FR-PRED-001 |
| BAS-04 | As Bwalya, I want the system to detect when a device's behavior has permanently changed (like after a firmware upgrade) and adapt its baseline, rather than alarming forever. | Bwalya | P0 | FR-BAS-004, FR-BAS-005 |
| BAS-05 | As Mutale, I don't want alerts for interpolated data when a device was temporarily unreachable. I want the system to handle gaps gracefully. | Mutale | P0 | FR-BAS-007 |

---

## Epic 6: OT Safety

**Goal:** The system provides visibility into industrial networks without ever risking production.

| ID | Story | Persona | Priority | FR Trace |
|----|-------|---------|----------|----------|
| OTS-01 | As Mutale, I want to be absolutely certain that the monitoring system cannot write to any PLC, so that I can deploy it without fear. | Mutale | P0 | FR-CAP-014, NFR-SEC-007 |
| OTS-02 | As Bwalya, I want to see a warning before I add any device to the active polling whitelist, reminding me that even read-only Modbus can crash legacy controllers. | Bwalya | P0 | FR-UI-009 |
| OTS-03 | As Mutale, I want the system to automatically pause polling if a newly whitelisted device starts returning errors, so that a misconfiguration doesn't persist. | Mutale | P0 | FR-UI-009 (item 3) |
| OTS-04 | As Bwalya, I want to see Modbus devices on the topology map even though they're never actively polled, so that I have OT visibility without OT risk. | Bwalya | P0 | FR-CAP-015 |

---

## Epic 7: Reporting and Management

**Goal:** Managers can demonstrate the value of network monitoring and justify investment.

| ID | Story | Persona | Priority | FR Trace |
|----|-------|---------|----------|----------|
| REP-01 | As Chanda, I want a monthly report showing total incidents, MTTR, and most common root causes, so that I can show the COO what the IT team achieved. | Chanda | P1 | FR-INC-006 |
| REP-02 | As Chanda, I want to see whether incidents are being resolved faster over time, so that I can assess whether the monitoring investment is paying off. | Chanda | P2 | FR-INC-006 |
| REP-03 | As Thabo, I want to generate a health report for each client automatically each month, so that I can demonstrate value without manual effort. | Thabo | P1 | FR-INC-006 |
| REP-04 | As Chanda, I want to export any chart or incident list as PDF or CSV, so that I can include it in board presentations. | Chanda | P2 | FR-UI-005 (export) |

---

## Epic 8: Predictive Intelligence (Phase 5)

**Goal:** The system warns about problems before they happen.

| ID | Story | Persona | Priority | FR Trace |
|----|-------|---------|----------|----------|
| PRD-01 | As Bwalya, I want to see a list of devices that are trending toward failure, sorted by urgency, so that I can schedule maintenance before things break. | Bwalya | P2 | FR-PRED-004 |
| PRD-02 | As Chanda, I want to use failure predictions to justify proactive hardware replacement in the budget, so that I'm not always reacting to emergencies. | Chanda | P2 | FR-PRED-002 |

---

## Story-to-Persona Coverage Matrix

| Persona | ONB | TOP | ALT | INC | BAS | OTS | REP | PRD | Total |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|-------|
| Mutale | 3 | 2 | 3 | 2 | 3 | 3 | 0 | 0 | 16 |
| Bwalya | 3 | 5 | 3 | 6 | 4 | 2 | 0 | 1 | 24 |
| Chanda | 1 | 0 | 1 | 0 | 0 | 0 | 4 | 1 | 7 |
| Thabo | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 3 |

---

## Story-to-Phase Mapping

| Phase | Stories | Count |
|-------|---------|-------|
| Phase 1 (Foundation) | ONB-01, ONB-02, ONB-03, ONB-04, TOP-01 | 5 |
| Phase 2 (Device Intelligence) | ONB-05, TOP-02, TOP-03, TOP-04, ALT-01, ALT-02, ALT-04, ALT-05 | 8 |
| Phase 3 (Baseline Intelligence) | ALT-03, ALT-06, ALT-07, INC-01, INC-02, INC-08, BAS-01 through BAS-05 | 12 |
| Phase 4 (Memory & Forensics) | ONB-06, ONB-07, TOP-06, TOP-07, INC-03 through INC-07, OTS-01 through OTS-04, REP-01 through REP-04 | 18 |
| Phase 5 (Prediction) | TOP-05, PRD-01, PRD-02, REP-02 | 4 |
