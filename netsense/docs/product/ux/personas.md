# NetSense - User Personas

**Version:** 0.1.0
**Status:** Draft
**Last updated:** 2026-05-23

---

## Persona 1: Mutale - Junior OT Engineer

### Background
Mutale is 24 years old. She graduated two years ago with a diploma in electrical engineering from Northern Technical College. In this synthetic scenario she works at Mukuba Copper Processing Complex, maintaining the process control network that connects PLCs, HMIs, and SCADA servers across the plant. She is the only person on her shift responsible for the control network. Her senior, Bwalya, is on day shift. Mutale works nights and weekends alone.

### Technical Context
- Manages approximately 80 devices: 40 PLCs (Siemens S7-1200/1500, Allen-Bradley ControlLogix), 10 HMIs, 5 SCADA servers, 15 managed switches (Cisco IE-2000), 10 engineering workstations
- The network is air-gapped from the internet. No cloud connectivity.
- She has never configured a SPAN port. She knows what Modbus is but has never used Wireshark.
- Her troubleshooting tools today: ping, walking to the control room to check HMI screens, calling the PLC vendor's support line, and waiting for Bwalya to wake up.

### Goals
- Know within 60 seconds of arriving at work whether the control network is healthy
- When a PLC stops responding, know whether it's the PLC, the switch, or a cable
- Have evidence to show the PLC vendor that the problem is on their side, not the network
- Not accidentally break anything - she is acutely aware that an incorrect Modbus write could stop the concentrator

### Pain Points
- She gets calls at 02:00 from operations saying "the screen is frozen" with no further information
- She has no baseline - she doesn't know if a PLC's response time of 200ms is normal or a sign of impending failure
- She cannot distinguish between a network fault and a PLC fault without physically visiting both
- She fears active monitoring tools because she's heard stories of SCADA systems crashing from aggressive SNMP polling

### How Mutale Uses NetSense
- **Layer 3 dashboard (default for engineer role):** When an alert fires, she sees the affected device, the blast radius, and a step-by-step checklist generated from similar historical incidents. She does not need to interpret raw metrics.
- **Passive monitoring only:** The exclusion list is pre-populated with all PLCs. She knows the system cannot harm production devices.
- **Forensic replay sharing:** When Bwalya arrives in the morning, she shares a replay link showing exactly what happened at 02:00, with causality arrows. She doesn't need to explain - the replay explains itself.
- **SMS alerts:** She receives critical alerts via SMS because she's often away from the control room checking field devices.

### Design Implications
- Default dashboard layer for "engineer" role must be Layer 3 with checklist
- All OT devices must be on the exclusion list by default
- Alert language must be plain, not jargon - "PLC-07 is not responding" not "Modbus exception code 0x04 on unit ID 7"
- SMS alerts must be actionable with only a phone screen

---

## Persona 2: Bwalya - Senior Network Engineer

### Background
Bwalya is 34. He has a degree in computer science from UNZA and a CCNP certification. He worked at an ISP in Lusaka for five years before moving to the mining sector for better pay. He understands networks deeply - VLANs, OSPF, spanning tree, SNMP MIBs. He is the person Mutale calls when she cannot resolve an issue. He works day shift but is on call 24/7 for critical incidents.

### Technical Context
- He designed the mine's control network topology - a ring of Cisco IE-2000 switches with redundant fiber uplinks
- He manages 200+ devices across the mine: the control network, the administrative network, and the camp network
- He has configured SPAN ports before and knows SNMPv3 inside out
- His current monitoring: LibreNMS on a old Dell server that took him three days to configure and still doesn't show Modbus devices

### Goals
- See the entire network topology at a glance - every device, every link, automatically discovered
- Know about problems before operations calls him - ideally before any device actually fails
- Have forensic evidence when a vendor claims "it's not our equipment"
- Reduce MTTR from hours to minutes - his performance review depends on plant uptime
- Build a knowledge base so that when he's on leave, Mutale can handle incidents without calling him

### Pain Points
- LibreNMS requires constant manual intervention - new devices don't appear automatically
- He has no visibility into the OT side - LibreNMS sees switches but not PLCs
- When something fails, he has to manually trace cables or SSH into every switch to check interface status
- Resolution notes live in his head. If he leaves, they leave with him.
- He spends 40% of his time on preventable issues that a baseline system would catch early

### How Bwalya Uses NetSense
- **Layer 1 dashboard (default for senior role):** When everything is healthy, he glances at the green topology map for 5 seconds and moves on.
- **Layer 2 when anomalies fire:** He sees the 4-hour metric chart with control limits, the blast radius, and similar historical incidents. He makes the diagnosis.
- **SNMP configuration during setup:** He enters the SNMPv3 credentials during the setup wizard. He knows them.
- **Active polling whitelist:** He selectively whitelists PLCs he knows can handle active Modbus reads - modern S7-1500s, not the legacy S7-300 on the old crusher.
- **Incident memory:** He writes detailed resolution notes because he knows they become the checklist Mutale sees at 02:00.
- **PCAP download:** When a vendor disputes his diagnosis, he downloads the forensic PCAP and shows them the packet trace.

### Design Implications
- Senior role sees Layer 2 by default - more data, less hand-holding
- Setup wizard must support SNMPv3 with full credential entry
- Whitelist confirmation dialog must give Bwalya the information he needs to decide: device class, observed response time, firmware version if known
- PCAP download must be fast and the file must be standard .pcap format that Wireshark can open

---

## Persona 3: Chanda - IT/Operations Manager

### Background
Chanda is 42. She is the IT and Operations Manager at a mid-sized manufacturing company in Lusaka's industrial area. She manages a team of four: two IT support technicians, one network administrator, and one SCADA technician. She reports to the COO. Her background is in business information systems - she is not a network engineer but understands enough to manage the team.

### Technical Context
- The factory network has ~150 devices: administrative (email, ERP, file server) and production (PLCs, HMIs, SCADA)
- The network is connected to the internet via a fiber link from Zamtel
- She budgets for IT annually. She can approve purchases up to K50,000 without board approval.
- Current monitoring: nothing systematic. The network administrator checks switch interfaces manually when something breaks.

### Goals
- Justify IT expenditure to the COO with data - "we prevented 12 production stoppages this quarter"
- Know whether the team is handling incidents effectively - MTTR, recurrence rate, resolution quality
- Ensure the factory can survive the network administrator going on leave
- Have a dashboard she can show the COO that proves the network is being managed professionally

### Pain Points
- She cannot quantify network reliability. The COO asks "how often does the network go down?" and she has no data.
- When production stops, she gets pressure from operations but has no visibility into whether IT is resolving it quickly
- She suspects some problems recur because there's no institutional memory, but she can't prove it
- She needs to demonstrate compliance with the parent company's IT policies, but has no audit trail

### How Chanda Uses NetSense
- **Monthly report:** She generates a report from the incident log showing: total incidents, MTTR, most common root causes, and devices with recurring issues. This goes to the COO.
- **Maintenance windows:** She reviews and approves maintenance windows. She can see at a glance which devices are in maintenance and whether alert suppression is working.
- **User management:** She manages the team's accounts - adding new engineers, removing departed ones, setting roles.
- **Escalation contact:** She receives critical alerts via SMS and email. If a critical alert fires and no engineer acknowledges it within 10 minutes, she escalates.
- **Budget justification:** She uses the predictive view (Phase 5) to justify proactive switch replacements - "three switches are predicted to fail within 60 days."

### Design Implications
- Admin role must have user management, system configuration, and report generation
- Incident log must support export (CSV, PDF) for management reporting
- Maintenance window UI must be simple and obvious - Chanda should understand it without training
- Dashboard must have a "management view" - simplified, high-level, suitable for showing a non-technical executive

---

## Persona 4: Thabo - MSP Technician

### Background
Thabo is 28. He works for a managed service provider based in Kitwe that handles IT for 15 small and medium businesses - mostly equipment suppliers, logistics companies, and small mines. He is a generalist: he manages networks, servers, email, and helpdesk. He has no dedicated network monitoring background. His company is exactly the type of MSP that would resell NetSense as a managed service.

### Technical Context
- He is responsible for ~300 devices across 15 client sites
- He visits each client site physically at least once a month. Some sites are 4 hours' drive away.
- He uses TeamViewer for remote access and WhatsApp for client communication
- Current monitoring: he set up PRTG free (100 sensors) at two clients. The other 13 have nothing.

### Goals
- Monitor all 15 clients from a single dashboard without driving to each site
- Know about problems before the client calls him - ideally, call the client first and say "we've detected an issue, we're working on it"
- Reduce windshield time - every hour spent driving to a site is an hour not billed
- Look professional - when a client asks "what do we pay you for?", show them a report

### Pain Points
- He cannot be in 15 places at once. He finds out about problems when clients call.
- PRTG's 100-sensor limit makes it useless for even medium-sized clients
- He tried LibreNMS but couldn't justify the setup time per client - it's not repeatable
- Clients don't understand why they need monitoring - "the internet works fine"

### How Thabo Uses NetSense
- **Multi-site dashboard (Model 3 or 4):** He opens the dashboard and sees all 15 client sites as a grid. Green means healthy. Amber means attention needed. He drills into the site with the problem.
- **Probe deployment:** He receives a pre-configured probe, plugs it in at the client site, runs the 10-minute wizard, and leaves. The probe connects back to his cloud platform via WireGuard.
- **Alert routing:** Alerts for all clients go to his phone. He triages from anywhere.
- **Client reporting:** He generates a monthly health report for each client automatically. This is his value demonstration.
- **Multi-tenancy:** He can switch between client views but client A's data is completely isolated from client B's. He cannot accidentally show one client's topology to another.

### Design Implications
- Multi-site view must be the default for MSP users
- Onboarding a new client must be repeatable and fast - under 20 minutes per site
- The platform must support tenant isolation that an MSP technician cannot accidentally breach
- Alert routing must support per-client notification preferences
- Reporting must be automated and white-label-capable

---

## Persona Summary Table

| Attribute | Mutale | Bwalya | Chanda | Thabo |
|-----------|--------|--------|--------|-------|
| **Role** | Junior OT Engineer | Senior Network Engineer | IT/Operations Manager | MSP Technician |
| **Experience** | 2 years | 12 years | 15 years (management) | 6 years |
| **NetSense Role** | engineer | senior | admin | senior (multi-tenant) |
| **Primary Dashboard Layer** | Layer 3 (checklist) | Layer 2 (detail) | Management view | Multi-site grid |
| **Primary Device** | Phone (SMS) + control room PC | Laptop + phone | Office PC + phone | Phone + laptop |
| **Key Fear** | Breaking production | Missing a fault | Unexplained downtime | Client churn |
| **Key Motivation** | Confidence in decisions | Reduce MTTR | Prove IT value | Scale without hiring |
| **Setup Involvement** | None (pre-configured) | Configures SNMP, whitelist | Approves budget, manages users | Installs probes, configures alerts |
