# NetSense UI/UX Specification — Part 2: Screens & Layouts

**Version:** 0.1.0  
**Status:** Draft  
**Last updated:** 2026-07-06

---

## Screen Inventory

| ID | Screen | Role Access | Phase |
|----|--------|-------------|-------|
| S-00 | Setup Wizard | (pre-auth, first boot) | 1 |
| S-01 | Login | All | 1 |
| S-02 | Dashboard — Layer 1 (Overview) | All | 2 |
| S-03 | Dashboard — Layer 2 (Topology Detail) | senior, admin | 2 |
| S-04 | Dashboard — Layer 3 (Critical Incident Mode) | All | 3 |
| S-05 | Dashboard — Management View | admin | 4 |
| S-06 | Multi-Site Grid | senior (MSP) | 4 |
| S-07 | Device Detail | senior, admin | 2 |
| S-08 | Incident List | All | 4 |
| S-09 | Incident Detail | All | 4 |
| S-10 | Forensic Replay | senior, admin | 4 |
| S-11 | Alert Feed | All | 2 |
| S-12 | Maintenance Windows | senior, admin | 3 |
| S-13 | Settings — General | admin | 2 |
| S-14 | Settings — Devices & Exclusion List | senior, admin | 2 |
| S-15 | Settings — SNMP & Collection | senior, admin | 2 |
| S-16 | Settings — Alert Routing | admin | 2 |
| S-17 | Settings — Users | admin | 4 |
| S-18 | Reports | admin | 4 |
| S-19 | Predictive Health | senior, admin | 5 |

---

## S-00: Setup Wizard

**Trigger:** First boot — no probe configured yet. Browser opens to `http://netsense.local`.

### Purpose
Get Bwalya from unboxing to first live topology view in under 10 minutes. The wizard must be dead-simple, and every step must have a passive-only fallback.

### Layout
Full-screen wizard. No sidebar. Logo centered top. Progress bar across the top showing 5 steps. Step content centered in a 640px wide card on the dark background.

### Steps

#### Step 1 — Welcome
- Headline: `Welcome to NetSense`  
- Subtext: `Let's get your network visible in under 10 minutes.`
- Two cards: `This is a new installation` / `Restore from backup`
- Passive-only callout box (cyan accent): `NetSense never touches your OT devices. All industrial devices are excluded by default.`
- CTA: `Get Started →`

#### Step 2 — Capture Interface
- Headline: `Which port is your mirror traffic on?`
- Interface picker: dropdown populated by detected NICs. Each NIC shows: name, MAC, link speed, traffic detected (yes/no). NICs with live traffic are auto-selected.
- Second picker: Management interface (separate NIC)
- Helper text with diagram showing SPAN port → probe → management network
- If no traffic detected: warning card `No traffic detected. Check your SPAN port configuration.` with link to hardware guide.
- CTA: `Confirm Interfaces →`

#### Step 3 — SNMP (Optional)
- Headline: `Do you have SNMP credentials?`
- Two paths rendered as toggle cards:
  - `Yes, configure SNMP` — expands form: version (v2c / v3), community/credentials, test button
  - `Skip for now — passive only` — shows confirmation: `NetSense will discover devices passively. You can add SNMP credentials later.`
- SNMPv3 form fields: Username, Auth Protocol (SHA-256), Auth Passphrase, Priv Protocol (AES-256), Priv Passphrase
- `Test SNMP Connection` button — shows live result: green checkmark with device count, or red error
- CTA: `Next →`

#### Step 4 — OT Exclusion Review
- Headline: `NetSense found these devices. Review the exclusion list.`
- Table of all passively discovered devices, pre-grouped:
  - **IT Devices** — switches, servers, workstations (polling enabled by default, toggle off)
  - **OT Devices** — PLCs, HMIs, SCADA (excluded by default, red lock icon, warning if engineer tries to enable)
- Warning banner at top: `OT devices are excluded from active polling. This protects your production equipment.`
- Individual row: device IP, MAC, inferred type, status (excluded / polling), edit button
- CTA: `Confirm Exclusion List →`

#### Step 5 — Alert Configuration
- Headline: `How do you want to be notified?`
- Three channels: Email (always on), SMS (phone number entry), Webhook (URL)
- Role assignment: who gets critical alerts vs. info alerts
- Escalation: `If no one acknowledges a CRITICAL alert in [10] minutes, notify [email]`
- CTA: `Finish Setup →`

#### Success Screen
- Full-screen transition: topology map animates in from dark background
- Overlay text fades out: `Your network is now visible.`
- Node count ticks up as devices appear: `Discovering devices… 12… 47… 203`
- When complete, overlay dismisses and user lands on S-02 (Layer 1 Dashboard)

---

## S-01: Login

### Layout
Centered card (480px wide) on dark background. No sidebar.

### Elements
- NetSense logo (top)
- `Sign in to your workspace`
- Email field
- Password field
- `Forgot password?` link
- `Sign In` button (full width, brand primary)
- SSO option: `Sign in with SAML SSO` (Phase 4, shown as secondary)
- Footer: version number, `v0.1.0`

### Behavior
- Failed login: shake animation on card, red inline error `Invalid email or password`
- Successful login: role determines which screen loads (engineer → Layer 3 if incident active, else Layer 1; senior → Layer 2; admin → Layer 5; MSP → S-06)

---

## S-02: Dashboard — Layer 1 (Overview)

**Default for:** engineer role, no active critical incident  
**Purpose:** Bwalya glances for 5 seconds, sees green, moves on. Mutale arrives at work and knows the shift status immediately.

### Layout
```
┌─ TopBar ──────────────────────────────────────────────────────────┐
├─ Sidebar ─┬─ Alert Banner (shown only if CRITICAL active) ─────────┤
│           ├─ Stat Row ────────────────────────────────────────────┤
│  Nav      ├─ Topology Map (large, primary) ────────────────────── │
│           │                                                        │
│           ├─ Alert Feed (right sidebar, 320px) ──────────────────┤
└───────────┴────────────────────────────────────────────────────── ┘
```

### Alert Banner (Conditional)
Only rendered when a CRITICAL incident is active. Full-width strip below TopBar.  
- Red left accent border
- `CRITICAL: Distribution-Switch-03 unreachable — 7 devices affected — [View Incident]`
- Pulsing red dot left of text
- Dismiss button (X) right side — dismisses for current session, not resolves incident

### Stat Row (4 metric tiles across full width)
Each tile: icon + large number + label + delta from yesterday

| Tile | Metric | Icon |
|------|--------|------|
| Devices Online | `203 / 210` | network icon |
| Active Incidents | `2 CRITICAL, 1 WARNING` | alert-triangle |
| Avg Response Time | `12ms` (↓ 3ms) | activity |
| Baseline Coverage | `94%` | shield-check |

Tiles use `--color-bg-surface`, subtle border. Critical incidents tile gets red tint background when count > 0.

### Topology Map (Primary)
- **Fills remaining screen height** — this is the hero element
- Force-directed Cytoscape.js graph
- Node colors map to status tokens: green (ok), amber (warn), red (crit), purple (maintenance), cyan (learning), gray (unknown)
- Node size = criticality (larger = more critical)
- Node shape = device type: circle (server/switch), hexagon (PLC/HMI), diamond (firewall)
- Edges: solid (LLDP confirmed), dashed (inferred), width = traffic volume
- Layer 1 behavior: nodes are simplified — no labels by default, only IPs on hover
- Animated: status changes ripple outward from affected node
- Controls (bottom-left): zoom in, zoom out, fit to screen, freeze layout toggle, layer switcher (L1/L2/L3)

### Alert Feed (Right panel, 320px)
Scrollable list of recent alerts, newest first.
Each entry: severity dot, plain-language description, device IP, age (`2m ago`), acknowledge button.
Grouped by: CRITICAL (top), WARNING, INFO.
Empty state: `No active alerts. Network is healthy.` with green checkmark.

---

## S-03: Dashboard — Layer 2 (Topology Detail)

**Default for:** senior role  
**Purpose:** Bwalya sees anomalies, reads the 4-hour chart, makes a diagnosis.

### Differences from Layer 1
- Node labels always shown (device name + IP)
- Clicking a node opens a **right slide-in panel** (480px) without leaving topology
- Edge labels show interface names and utilization %
- Metric mini-charts (sparklines) shown beneath critical nodes when space allows
- Filter bar appears above topology: filter by device type, status, VLAN, criticality

### Node Detail Slide-In Panel (S-03)
Triggered by clicking any node. Slides in from right (300ms ease-out).

**Sections:**
1. **Header** — device name, IP, MAC, type icon, status dot + last seen timestamp
2. **Status row** — uptime, criticality rating (1–5), exclusion/polling status
3. **Key Metrics** — 3 most important metrics as sparkline cards (24h view)
4. **4-Hour Chart** — full metric chart with:
   - Upper/lower control limit bands shaded in `--color-chart-band`
   - Anomaly points highlighted as red dots
   - X-axis: time labels every 30min
   - Y-axis: auto-scaled with unit label
   - Baseline confidence watermark if < 100%: `Baseline: 74% confident`
5. **Connected Devices** — mini list of directly connected nodes (LLDP links)
6. **Recent Incidents** — last 3 incidents for this device with status chips
7. **Actions** — `View Full Detail`, `Add to Maintenance`, `Download PCAP`

---

## S-04: Dashboard — Layer 3 (Critical Incident Mode)

**Trigger:** Auto-activated when a CRITICAL incident fires. Engineer can also manually switch.  
**Default for:** engineer role during active incident.

### Purpose
Mutale at 2am. She must be able to act without calling Bwalya. This screen gives her everything.

### Layout Change
The topology map enters "blast radius mode":
- **Unaffected nodes fade to 15% opacity**
- Affected nodes and the root cause candidate remain at full opacity
- Affected downstream path highlighted in amber
- Root cause candidate has red pulsing ring around it
- All other UI chrome (sidebar, stat row) collapses — incident panel takes priority

### Incident Panel (Full left side, 480px)
```
┌─ CRITICAL INCIDENT ──────────────────────────────────────────────┐
│  Distribution-Switch-03 is not responding                         │
│  Started: 02:17 · Duration: 8 minutes                            │
├──────────────────────────────────────────────────────────────────┤
│  BLAST RADIUS                                                     │
│  ● 7 devices affected                                             │
│  ● 4 PLCs unreachable                                             │
│  ● 2 HMIs unreachable                                             │
│  ● ~40 operators affected                                         │
├──────────────────────────────────────────────────────────────────┤
│  SIMILAR PAST INCIDENT                                            │
│  March 14 · Resolved by Bwalya in 12 min                         │
│  Root cause: Switch power supply failure after 18h uptime         │
├──────────────────────────────────────────────────────────────────┤
│  WHAT TO DO                                                       │
│  1. ✓ Confirm switch is physically powered                        │
│  2. ✓ Check UPS status for cabinet C3                             │
│  3. → Attempt remote reboot via management port                   │
│  4.   If reboot fails, escalate to Bwalya                         │
├──────────────────────────────────────────────────────────────────┤
│  [Acknowledge Incident]      [I Fixed It — Add Notes]            │
└──────────────────────────────────────────────────────────────────┘
```

### Checklist Panel (inside Incident Panel)
Steps are dynamically generated from the similar past incident's resolution notes.  
Each step has a checkbox. Checking steps is optional but encouraged.  
`LOW BASELINE CONFIDENCE` badge shown if incident alert confidence < 1.0, with value: `Confidence: 74%`.

### Resolution Flow
Clicking `I Fixed It — Add Notes`:
1. Slide-up modal (not full page)
2. `What was the root cause?` — device picker (defaults to system's probable cause)
3. `What did you do?` — rich text note (becomes checklist for future incidents)
4. `How did you confirm it was fixed?` — text
5. `Submit` → incident closes, nodes return to normal opacity, Layer 1 resumes

---

## S-05: Dashboard — Management View

**Access:** admin role only  
**Purpose:** Chanda shows the COO a clean, non-technical view of network health.

### Layout
Single scrollable page, no topology map.

### Sections
1. **Health Score** — large circular gauge, 0–100%, color-coded. `Network Health: 94%`
2. **This Month** — 4 KPI cards: Incidents (total), MTTR (avg), Uptime (%), Alerts Sent
3. **Incidents Over Time** — bar chart, last 30 days, stacked by severity
4. **Top 5 Problem Devices** — table: device name, incident count, avg resolution time, trend arrow
5. **Team Performance** — incidents acknowledged vs escalated, per engineer
6. **Export Button** — `Export PDF Report` — generates management report

---

## S-06: Multi-Site Grid (MSP View)

**Access:** MSP senior role  
**Purpose:** Thabo sees all 15 client sites at a glance.

### Layout
Full-width grid of `SiteCard` tiles. Filter/sort bar at top.

### SiteCard
```
┌──────────────────────────────────────┐
│  🟢  Kitwe Mining Co.                │
│  203 devices · 0 incidents           │
│  Last updated: 32s ago               │
│                              [Open →]│
└──────────────────────────────────────┘
```
- Color-coded left border: green (all ok), amber (warnings), red (critical)
- Status dot pulses on red/amber
- Probe connectivity indicator: `●  Connected` or `◌  Probe offline`
- Click → navigates into that tenant's Layer 1/2/3 dashboard (tenant-isolated)

### Triage Mode
When any site is RED: that tile moves to top of grid and expands to show incident summary. No clicks needed to see what's wrong.

---

## S-07: Device Detail

**Access:** senior, admin  
**Route:** `/devices/:ip`  
**Purpose:** Deep inspection of a single device — all metrics, all history, full config.

### Layout
Two-column: left (60%) = metrics and charts, right (40%) = device metadata + incidents

### Left Column
- **Metric Chart** (full width, default: response time, last 24h)
- Metric selector tabs: Response Time | Interface Errors | CPU | Memory | Bandwidth
- Time range picker: 1h / 6h / 24h / 7d / 30d
- Baseline control band rendered on chart
- Anomaly points: red dots, clickable → opens incident for that point
- PCAP download button if forensic capture exists for visible time window

### Right Column
- Device info card: name, IP, MAC, type, criticality, firmware (if known), location
- **Exclusion status** — prominent: `🔒 Excluded from active polling` or `✓ Active polling: Modbus read-only`
- SNMP status: responding / not responding / unconfigured
- Uptime metric with sparkline
- Last 5 incidents for this device

---

## S-08: Incident List

**Route:** `/incidents`  
**Purpose:** Searchable, filterable log of all incidents.

### Layout
Standard list page. Filter bar top, table below.

### Filter Bar
- Status: All / Open / Acknowledged / Resolved / Suppressed
- Severity: All / Critical / Warning / Info
- Device: IP search
- Date range: picker
- Text search: searches resolution notes and descriptions

### Incident Table Columns
| # | Column | Detail |
|---|--------|--------|
| 1 | Severity | Colored badge |
| 2 | Description | Plain-language, device name |
| 3 | Started | Relative (`3h ago`) + absolute on hover |
| 4 | Duration | Time to resolve (or `Ongoing`) |
| 5 | Assigned to | Avatar + name |
| 6 | Status | Open / Ack / Resolved chip |
| 7 | Actions | `→` to detail |

Click row → S-09 (Incident Detail).

---

## S-09: Incident Detail

**Route:** `/incidents/:id`  
**Purpose:** Full incident record — everything that happened, what was done, forensic evidence.

### Sections
1. **Header** — severity, description, start time, duration, status
2. **Timeline** — vertical event log:
   - `02:17` System detected anomaly
   - `02:17` SMS sent to Mutale (+260...)
   - `02:18` Mutale opened dashboard
   - `02:25` Mutale acknowledged incident
   - `02:37` Mutale marked resolved
3. **Root Cause** — system's probable cause vs. engineer's override (if set)
4. **Blast Radius** — affected device list at time of incident
5. **Similar Incidents** — top 3 matches with similarity score (shown as %)
6. **Metric Evidence** — embedded chart showing the anomaly, time-locked to incident window
7. **Forensic PCAP** — download button if capture exists. Shows: file size, capture window, encryption status
8. **Resolution Notes** — engineer's notes, editable by senior+
9. **Share Replay** — generate expiring link for forensic replay

---

## S-10: Forensic Replay

**Route:** `/replay/:id` (also accessible via expiring share link — no auth required for shared links)  
**Purpose:** Animated replay of how the incident unfolded. Used for vendor disputes and knowledge transfer.

### Layout
Full-screen. Topology map fills screen. Replay controls at bottom.

### Replay Controls
```
[◀◀] [◀] [▶/⏸] [▶▶]  ──────●──────────────────  02:17:43  [1x] [2x] [4x]
                       02:15                02:22
```
- Scrubber with incident markers (triangles at event timestamps)
- Speed control: 1x / 2x / 4x
- Event annotation panel: at each timestamp marker, a popup shows what event fired

### Replay Visualization
- Nodes animate state changes in sync with timeline
- Causality arrows appear between nodes as the cascade unfolds
- Affected path glows amber, root cause pulses red
- Counter in top-right: `Viewing: 02:17:43 · 3 devices down`

### Share Link Mode (No Auth)
If accessed via expiring share link:
- Read-only (no controls other than playback)
- Banner at top: `This is a shared forensic replay from NetSense. Link expires: 2026-07-10.`
- NetSense logo with `Learn More` link

---

## S-11: Alert Feed

**Route:** `/alerts`  
**Purpose:** Full alert history, notification log, acknowledgment management.

### Layout
List page. Alerts grouped by day.

### Alert Entry
- Time, severity dot, plain-language description, device
- Status: Sent / Delivered / Acknowledged
- Delivery channel icons: SMS icon if SMS sent, email icon if email sent
- `Acknowledge` button if unacknowledged

---

## S-12: Maintenance Windows

**Route:** `/maintenance`  
**Purpose:** Schedule planned maintenance to suppress alerts.

### Active Windows
Table: device(s) covered, start/end time, scheduled by, suppressed alert count so far, `End Now` button.

### Create Window (Modal)
- Device picker (multi-select, search by IP or name)
- Start date/time, end date/time
- Reason (text)
- `What gets suppressed` preview: shows which alert rules would fire during this window
- `Create Window` button

### Behavior
- Purple `In Maintenance` badge overlays affected nodes on topology
- Alert count during window shown in incident record as `Suppressed during maintenance window`

---

## S-13 to S-17: Settings

All settings pages share a sub-navigation sidebar on the left within the main content area:

```
Settings
  ├ General
  ├ Devices & Exclusions
  ├ SNMP & Collection
  ├ Alert Routing
  └ Users
```

### S-14: Devices & Exclusion List
Two tabs: `All Devices` | `Exclusion List`

**All Devices table:** IP, MAC, name, type, status, polling status, edit
**Exclusion List:** Devices never actively polled. Red lock badge on each. Add/remove with confirmation modal.

**Whitelist dialog (adding active Modbus):**
```
⚠  Warning: Active Polling Risk

You are enabling active Modbus TCP polling on:
PLC-07 · 192.168.10.47 · Allen-Bradley ControlLogix

Active polling sends read-only Modbus requests to this device.
Even read-only requests can cause legacy controllers to crash.

Device class: PLC (industrial)
Observed response time: 18ms
Firmware version: Unknown

Only proceed if you are certain this device can handle polling.

[ Cancel ]    [ Enable Polling — I Accept the Risk ]
```

### S-15: SNMP & Collection
- SNMPv2c / SNMPv3 credential management per device or global
- Collection schedule: status (30s), performance (5min), custom
- Plugin status: table of active collector plugins, health, last event time

### S-16: Alert Routing
- Routing rules table: severity + device group → notification channel
- Channel config: SMTP credentials, SMS provider (AT, Vonage), Webhook URL
- Escalation rules: `If CRITICAL not acknowledged in [N] minutes → notify [contact]`

### S-17: Users
- User table: name, email, role, last login, status (active/inactive)
- Add user: email, role assignment
- Edit user: change role, deactivate
- Roles: `engineer` / `senior` / `admin` (no custom roles in Phase 4)

---

## S-18: Reports

**Route:** `/reports`  
**Purpose:** Chanda generates monthly reports for COO or Thabo generates client reports.

### Report Types
| Report | Description | Format |
|--------|-------------|--------|
| Monthly Health | Incidents, MTTR, uptime, top faults | PDF, CSV |
| Incident Log | Filtered incident export | CSV |
| Device Inventory | All devices, type, status | CSV |
| Baseline Coverage | Per-device confidence progress | PDF |

### Generation
- Select report type → configure date range + filters → `Generate`
- Preview renders in-page (PDF iframe or table view)
- `Download` button
- `Schedule` — configure monthly auto-generation + email delivery

---

## S-19: Predictive Health (Phase 5)

**Route:** `/predict`  
**Purpose:** Bwalya sees which devices are trending toward failure.

### Layout
Two panels: left = ranked device list, right = selected device trend

### Ranked List
Each device: name, metric showing trend, `Estimated time to threshold breach` with confidence interval, urgency color (red/amber/green)

### Device Trend Panel
- Metric chart extended forward in time (dashed line = prediction)
- Confidence interval shaded (wider = less certain)
- Kalman filter RUL estimate: `Switch-04 predicted to breach error threshold in 14–22 days`
- Recommended action card: `Schedule maintenance window before [date]`

### Empty State (insufficient data)
`Predictive health requires at least 30 days of metric history. You have 12 days. Check back in 18 days.`
Progress bar showing days accumulated.
