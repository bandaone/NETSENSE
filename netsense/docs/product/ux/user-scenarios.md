# NetSense - User Scenarios

**Version:** 0.1.0
**Status:** Draft
**Last updated:** 2026-05-23

This document describes concrete situations that NetSense users will encounter. Each scenario traces to specific functional requirements and serves as source material for E2E tests and acceptance criteria.

---

## Scenario 1: The 2 AM Switch Failure

**Who:** Mutale (junior OT engineer, night shift)
**Where:** Mukuba Copper Processing Complex, an explicitly fictional industrial site
**When:** 02:17 on a Tuesday

### Situation
The distribution switch connecting the flotation circuit PLCs to the core switch fails silently. The switch is still powered (fans spinning) but its CPU has locked up - no packets are being forwarded. Four PLCs, two HMIs, and the flotation SCADA server are now unreachable.

### How It Unfolds Today (Without NetSense)
1. 02:20 - The control room operator calls Mutale: "The flotation screen is frozen."
2. 02:25 - Mutale arrives at the control room. She confirms the HMI is showing stale data.
3. 02:30 - She walks to the switch cabinet (200m away). All lights on the switch are green. Nothing looks wrong.
4. 02:35 - She calls Bwalya. It goes to voicemail - he's asleep.
5. 02:40 - She starts pinging devices from the engineering workstation. Some respond, some don't. No clear pattern.
6. 03:00 - She calls the switch vendor's support line. They suggest rebooting the switch.
7. 03:15 - She reboots the distribution switch. All devices come back online.
8. 03:20 - Production resumes. Total downtime: 60 minutes.
9. Next day - Bwalya asks what happened. Mutale says "the switch crashed." No further investigation. No record. The same switch fails again three weeks later.

### How It Unfolds With NetSense
1. 02:17:03 - The distribution switch stops forwarding packets. The passive capture plugin on the mirror port stops seeing traffic from the four PLCs, two HMIs, and SCADA server.
2. 02:17:05 - The anomaly engine detects that five devices have gone silent simultaneously. The baseline engine confirms this is not normal - these devices have never been silent at this time before.
3. 02:17:06 - The fault localization engine traverses the topology graph. It finds the common upstream ancestor: Distribution-Switch-03. Probable cause identified: "5 devices behind Distribution-Switch-03 are unreachable. Distribution-Switch-03 is the probable root cause."
4. 02:17:07 - Blast radius calculated: 7 devices total, 2 HMIs, 1 SCADA server affected. Flotation circuit has lost visibility.
5. 02:17:08 - Alert fires: CRITICAL severity. SMS sent to Mutale and Bwalya.
6. 02:17:30 - Mutale receives the SMS on her phone: "CRITICAL: Distribution-Switch-03 unreachable. 7 devices down. Flotation circuit affected. View: [short URL]"
7. 02:18:00 - Mutale opens the dashboard on the control room PC. She sees the topology centered on Distribution-Switch-03, ringed in red. The blast radius is highlighted - she can see exactly which PLCs and HMIs are affected.
8. 02:18:30 - She clicks the incident. The similar incident panel shows: "Similar incident on 2026-03-14: Distribution-Switch-03 CPU lockup. Resolved by hard reboot. Resolution notes: 'Switch firmware version 15.2(7)E5 - known CPU lockup bug. Upgrade to 15.2(7)E6 recommended.'"
9. 02:19:00 - Mutale follows the checklist. She walks to the switch cabinet, confirms the switch has power but no data activity (matching the known failure pattern), and performs a hard reboot.
10. 02:22:00 - Devices begin responding. The topology updates in real-time - nodes change from red to amber to green. The incident auto-resolves when all devices are stable for 2 minutes.
11. 02:25:00 - Mutale adds a resolution note: "Same as March 14 incident. Switch rebooted. Firmware upgrade still pending."
12. 02:26:00 - Production resumes. Total downtime: 9 minutes. The incident is logged with a triggered PCAP file showing the exact moment of failure. Bwalya sees it in the morning and schedules the firmware upgrade.

### Traced Requirements
- FR-CAP-001 (passive capture), FR-FAULT-001 (anomaly detection), FR-FAULT-005 (fault localization), FR-FAULT-006 (blast radius)
- FR-INC-003 (similar incident matching), FR-ALERT-002 (SMS), FR-UI-001 (Layer 3), FR-UI-003 (timeline)
- NFR-PERF-005 (alert latency <1s), NFR-USE-003 (alert comprehension <30s)

### E2E Test Mapping
This scenario becomes the primary E2E test for Phase 3: "Critical switch failure - alert to resolution." The test injects synthetic packet loss for five devices behind a known switch and verifies the full pipeline from detection to SMS.

---

## Scenario 2: The Maintenance Window

**Who:** Bwalya (senior engineer, day shift)
**Where:** Same mine, engineering office
**When:** Thursday morning, planned maintenance

### Situation
Bwalya needs to replace a failing fiber SFP module on the core switch. This will cause a brief link flap on the uplink to the administrative network. He knows this will trigger alerts if he doesn't suppress them. He needs to open a maintenance window, perform the work, and verify everything returns to normal.

### How It Unfolds Today (Without NetSense)
1. Bwalya tells the IT team "I'm replacing an SFP at 10:00. Ignore any alerts."
2. 10:00 - He replaces the SFP. The link flaps. The administrative network loses connectivity for 30 seconds.
3. The IT helpdesk receives 12 calls from office staff: "The internet is down."
4. The IT manager calls Bwalya: "What's happening?"
5. Bwalya explains it was planned. The manager asks "Why wasn't I told?"
6. No record of the maintenance exists. When the same link flaps unexpectedly next month, there's no way to distinguish it from the planned event.

### How It Unfolds With NetSense
1. 09:00 - Bwalya logs into NetSense. He navigates to the core switch device page. He clicks "Open Maintenance Window."
2. He selects: affected device = Core-Switch-01. Reason: "Replace failing SFP module on uplink port 24." End time: 11:00 (2-hour window for a 5-minute job).
3. The maintenance window is created. The core switch's status changes to "maintenance" (gray on the topology map). A notification appears in the alert feed: "Core-Switch-01 in maintenance until 11:00."
4. 10:00 - Bwalya replaces the SFP. The link flaps. Packets are dropped on the uplink for 28 seconds.
5. The anomaly engine detects the link flap and device unreachability. It checks the maintenance window table. Core-Switch-01 is in maintenance. The anomaly is logged silently with a `suppressed_by_maintenance` flag. No alert is sent.
6. 10:05 - Bwalya confirms all links are stable. He checks the topology map - all devices green.
7. 11:00 - The maintenance window expires automatically. The core switch returns to normal status.
8. Next month, when the link flaps unexpectedly, the anomaly engine fires a real alert. The incident memory engine finds the maintenance-logged event from this month and notes: "Similar flap occurred during planned maintenance on [date]. This flap is unscheduled - investigate."

### Traced Requirements
- FR-FAULT-002 (maintenance suppression), FR-UI-001 (Layer 2 behavior during maintenance)
- NFR-USE-001 (setup time - maintenance window creation must be fast)

---

## Scenario 3: The Gradual PLC Degradation

**Who:** Bwalya (reviewing trends)
**Where:** Engineering office
**When:** Friday afternoon, routine review

### Situation
A PLC controlling the reagent dosing pumps has been responding slightly slower each week for the past month. Today it's still within normal limits - 180ms response time, well under the 500ms timeout. But the trend is unmistakable. In approximately 40 days, at the current rate, it will start timing out.

### How It Unfolds Today (Without NetSense)
1. No one notices. The PLC is working fine.
2. 40 days later, the PLC starts timing out intermittently. Operators notice inconsistent dosing.
3. The PLC vendor is called. They diagnose a failing Ethernet module. Replacement takes 2 weeks to arrive from Germany.
4. Production runs at reduced efficiency for 2 weeks. Total cost: $150,000 in lost recovery.

### How It Unfolds With NetSense (Phase 5 Predictive)
1. Bwalya opens the predictive view on a Friday afternoon. He scans the list of devices with active trend predictions, sorted by urgency.
2. He sees: "Reagent-PLC-02 - Modbus response time increasing. Predicted to reach warning threshold (300ms) in approximately 40 days (+-12 days). Confidence: 87%."
3. He clicks the device. The metric chart shows the response time trend with the Kalman filter's extrapolation extending 60 days forward. The trend is clear and the confidence interval is narrowing as more data accumulates.
4. He opens a maintenance window for next Tuesday and orders a replacement Ethernet module. It arrives in 5 days. He replaces it before any timeout occurs.
5. Production never notices. The predictive view saved $150,000.

### Traced Requirements
- FR-PRED-001 (Kalman filter), FR-PRED-002 (RUL estimate), FR-PRED-004 (predictive view)
- This scenario validates the entire Phase 5 predictive pipeline

---

## Scenario 4: The Vendor Dispute

**Who:** Bwalya (senior engineer)
**Where:** Meeting room with SCADA vendor
**When:** Post-incident review

### Situation
The SCADA server went offline for 4 minutes yesterday. The SCADA vendor claims it was a network problem. Bwalya believes it was a SCADA application crash - the server was still pingable, but the SCADA service stopped responding on its application port.

### How It Unfolds Today (Without NetSense)
1. Bwalya has ping logs showing the server was reachable. The vendor says "ping doesn't prove the network was stable - there could have been micro-outages."
2. Bwalya has no packet-level evidence. The dispute is unresolved.
3. The vendor's contract protects them from penalties without proof. The mine absorbs the cost.

### How It Unfolds With NetSense
1. Bwalya opens the incident from yesterday. He clicks "Forensic Replay."
2. He plays the 5-minute window around the incident. At second 127, the SCADA server stops sending application-layer responses on port 5040. But ICMP replies continue - the server is still on the network, just not running the SCADA service.
3. The causality animation shows: SCADA-Server-01 application port 5040 -> no response. All other metrics normal.
4. Bwalya clicks "Share Replay." He generates a time-limited link and sends it to the vendor.
5. The vendor opens the link. They see the exact same replay. The evidence is incontrovertible: the server was network-reachable but the application had stopped. It was a SCADA software crash.
6. The vendor accepts responsibility. The incident is closed with a clear root cause.

### Traced Requirements
- FR-REPLAY-001 (replay dataset), FR-REPLAY-002 (animation), FR-REPLAY-004 (sharing)
- FR-PCAP-005 (access control - vendor sees only this incident, not the whole dashboard)
- NFR-SEC-005 (audit log - the share link generation is logged)

---

## Scenario 5: First Day With NetSense

**Who:** Thabo (MSP technician)
**Where:** A client site - a logistics company in Kitwe with 50 devices
**When:** Monday morning, new client onboarding

### Situation
Thabo has just sold NetSense monitoring to a new client. He arrives at their office with a pre-configured IT-100 probe. The client has a Cisco SG350 switch, a Windows server running their logistics software, 30 workstations, and a firewall. They have no monitoring today.

### How It Unfolds
1. 09:00 - Thabo unpacks the probe. He mounts it in the wall-mount rack next to the switch.
2. 09:05 - He connects the mirror port cable to port 24 on the switch (which he configured for SPAN the night before remotely).
3. 09:07 - He connects the management port to the LAN and power to the UPS.
4. 09:08 - The probe boots. The PWR LED goes solid green. The COL LED starts pulsing - it's already seeing traffic.
5. 09:10 - Thabo opens his laptop, connects to the probe's setup wizard at http://netsense.local.
6. 09:11 - Step 1: Interface selection. The wizard shows eth0 (management - has DHCP IP) and eth1 (mirror - no IP, receiving 85 Mbps of traffic). He confirms the selection.
7. 09:12 - Step 2: SNMP configuration. The client doesn't know their SNMP credentials. Thabo selects "Skip - use passive-only mode." A notification appears: "SNMP not configured. Device health metrics will be limited. You can configure SNMP later."
8. 09:13 - Step 3: Device exclusion list. The list is empty - this is an IT-only environment, no OT devices. Thabo confirms.
9. 09:14 - Step 4: Platform connection. Thabo enters his cloud platform's WireGuard endpoint and the pre-shared key he generated when he added this client to his MSP dashboard.
10. 09:15 - Step 5: Alert delivery. Thabo enters his SMTP server and his Africa's Talking API key. He sends a test alert. His phone buzzes: "NetSense test alert - alerts are configured correctly."
11. 09:16 - Wizard complete. The probe begins uploading events to Thabo's cloud platform.
12. 09:20 - Thabo opens his MSP dashboard. He sees the new site - "Kitwe Logistics" - with a topology map already showing 35 devices discovered from passive traffic analysis. The topology is incomplete (no switch health data without SNMP) but already useful.
13. 09:25 - Thabo drives to his next client. Total onboarding time: 25 minutes.
14. Next week - Thabo gets the SNMP credentials from the client's previous IT provider. He enters them remotely through the dashboard. The topology updates immediately with switch health metrics, interface status, and LLDP-confirmed links.

### Traced Requirements
- FR-DEPLOY-002 (setup wizard), FR-DEPLOY-003 (passive-only fallback)
- NFR-USE-001 (setup time <20 min for engineer unfamiliar with product - Thabo is familiar, so <15 min)
- FR-UI-002 (topology map populated from passive traffic)
