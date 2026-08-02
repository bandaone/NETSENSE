# NetSense UI/UX Specification — Part 4: Copy, Information Architecture & Implementation Guide

**Version:** 0.1.0  
**Status:** Draft  
**Last updated:** 2026-07-06

---

## 1. Information Architecture

### Site Map

```
NetSense
│
├── / (Setup Wizard — first boot only)
│
├── /login
│
├── /dashboard                    ← Default landing (role determines layer)
│   ├── ?layer=1                  ← Overview (engineer default)
│   ├── ?layer=2                  ← Detail (senior default)
│   └── ?layer=3                  ← Critical Incident Mode (auto)
│
├── /sites                        ← MSP multi-site grid
│   └── /sites/:tenantId          ← Enter a specific site
│
├── /alerts                       ← Alert feed + history
│
├── /incidents                    ← Incident list
│   └── /incidents/:id            ← Incident detail
│       └── /incidents/:id/replay ← Forensic replay (full-screen)
│
├── /replay/:shareToken           ← Shared replay (no auth)
│
├── /devices                      ← Device inventory
│   └── /devices/:ip              ← Device detail
│
├── /maintenance                  ← Maintenance windows
│
├── /reports                      ← Report generation
│
├── /predict                      ← Predictive health (Phase 5)
│
└── /settings
    ├── /settings/general
    ├── /settings/devices
    ├── /settings/snmp
    ├── /settings/alerts
    └── /settings/users
```

### Navigation Hierarchy Rules
1. The Dashboard is always accessible via the logo click
2. Breadcrumbs shown on all pages deeper than level 1 (e.g. `Incidents / INC-0047`)
3. Back button on device detail and incident detail returns to previous list (preserving filter state)
4. The forensic replay opens in a full-screen overlay, not a new page, so background context is preserved

---

## 2. Copy & Language Standards

### Voice & Tone
NetSense speaks like a calm, experienced engineer — not a marketing tool, not a robot.

| Principle | Good | Bad |
|-----------|------|-----|
| Plain language | `PLC-07 is not responding` | `Host unreachable (ICMP timeout)` |
| Honest uncertainty | `Alert fired with low confidence (74%)` | `ANOMALY DETECTED` |
| Specific, not vague | `7 devices downstream are affected` | `Multiple devices affected` |
| Action-oriented | `Check switch cabinet C3 power supply` | `Investigate affected infrastructure` |
| No exclamation marks | `Network is healthy.` | `Great job! Everything's running fine!` |
| No passive voice | `The system detected an anomaly at 02:17` | `An anomaly was detected` |

### Alert Copy Formula
```
[SEVERITY]: [Device name] [what happened]. [N] [downstream device type(s)] affected.
```
Examples:
- `CRITICAL: Distribution-Switch-03 is not responding. 7 devices downstream affected.`
- `WARNING: SCADA-Server-01 response time is 340ms (normal: 18ms). Baseline confidence: 94%.`
- `INFO: New device discovered — 192.168.10.88 (unknown type). Review in Settings.`

### Confidence Language
| Confidence | Label | UI Treatment |
|-----------|-------|--------------|
| 0.0–0.30 | `Early learning` | Cyan badge, metric chart has full learning overlay |
| 0.31–0.69 | `Learning` | Cyan badge, partial overlay |
| 0.70–0.99 | `Nearly calibrated` | Small cyan dot, no overlay |
| 1.00 | (no label) | No badge shown — confidence is now expected |

### Severity Labels
| Level | Label | Color | When |
|-------|-------|-------|------|
| 4 | `CRITICAL` | Red | Device unreachable, or severe metric breach |
| 3 | `WARNING` | Amber | Metric approaching control limit, or degraded |
| 2 | `INFO` | Blue | New device, config change, resolved incident |
| 1 | `MAINTENANCE` | Purple | Incident suppressed during maintenance window |

### Error Messages
All error messages follow:
```
What happened: [1 sentence, plain language]
Why it happened: [1 sentence, if known]
What to do: [1 actionable step]
```

Example:
```
SNMP test failed.
The device at 192.168.10.1 did not respond within 5 seconds.
Check that the SNMP community string is correct and the device allows SNMP from this probe's IP.
```

---

## 3. Role-Based UI Differences

This table documents every UI element that differs by role. Engineers at implementation must reference this to ensure no role sees data they shouldn't.

| Element | engineer | senior | admin |
|---------|----------|--------|-------|
| Default dashboard layer | Layer 1 | Layer 2 | Layer 5 (management) |
| Topology map visible | ✓ | ✓ | — (management view) |
| Node detail panel | Read-only | Full (can edit criticality) | Full |
| Incident acknowledge | ✓ | ✓ | ✓ |
| Incident resolve | — | ✓ | ✓ |
| PCAP download | — | ✓ | ✓ |
| Forensic replay | View only | Full control | Full control |
| Whitelist management | — | ✓ (with warning) | ✓ |
| Exclusion list | View only | ✓ | ✓ |
| Maintenance windows | View only | Create/edit | Create/edit |
| SNMP configuration | — | ✓ | ✓ |
| Alert routing | — | — | ✓ |
| User management | — | — | ✓ |
| Reports | — | View | Generate + schedule |
| Settings | — | Partial | Full |
| Predictive health | View | View | View + export |

---

## 4. Persona-to-Screen Mapping

How each persona moves through the product day-to-day:

### Mutale (Junior OT Engineer) — Night Shift
```
Arrives → S-02 (Layer 1) → scans for red
  If green → done (5 seconds)
  If alert banner → S-04 (Layer 3, incident mode)
    → reads checklist
    → follows steps
    → S-09 (Incident Detail) to add resolution notes
    → incident resolves → back to S-02
```

### Bwalya (Senior Network Engineer) — Day shift
```
Arrives → S-03 (Layer 2) → scans topology
  Morning review:
    → clicks nodes with amber status → slide-in panel → reads 4h chart
    → S-09 to review Mutale's night incidents → adds resolution notes
    → S-07 (Device Detail) for trending devices
  Incident response:
    → S-04 (Layer 3) → S-10 (Forensic Replay) → downloads PCAP
  Configuration:
    → S-14 (Devices) → S-15 (SNMP)
```

### Chanda (IT/Operations Manager) — Monthly
```
→ S-05 (Management View) → checks health score
→ S-18 (Reports) → generates monthly PDF
→ S-17 (Users) → adds/removes team members
→ S-12 (Maintenance) → approves upcoming windows
```

### Thabo (MSP Technician) — Daily
```
→ S-06 (Multi-site Grid) → scans all clients
  If amber/red site → drills into that tenant's S-04 or S-03
  → resolves or escalates
  End of month:
    → S-18 (Reports) → generates per-client reports
```

---

## 5. Phase-by-Phase UI Availability

Not all UI is built in Phase 1. This maps which screens are available per phase.

### Phase 1 (v0.1.0 — weeks 1-4)
- S-00 Setup Wizard (basic version: interface selection + passive-only)
- S-01 Login
- S-02 Dashboard Layer 1 (topology visible, no metrics yet — just discovery)
- S-11 Alert Feed (basic)
- S-14 Device list (read-only, no exclusion editing yet)

**What the Phase 1 dashboard communicates:**  
"Here are all the devices I can see on your network." No baselines, no incidents, no charts. But the topology is live and auto-discovered.

### Phase 2 (v0.2.0 — weeks 5-8)
- S-02 full (stat row, topology with status colors, alert feed)
- S-03 Layer 2 (node detail panel, sparklines)
- S-07 Device Detail (metrics tab, first charts without baseline band)
- S-11 Alert Feed (full)
- S-12 Maintenance Windows
- S-13 Settings General
- S-14 Devices + Exclusion List (full)
- S-15 SNMP & Collection
- S-16 Alert Routing

### Phase 3 (v0.3.0 — weeks 9-12)
- S-03 Layer 2 (now with baseline bands on charts)
- S-04 Layer 3 — Critical Incident Mode (blast radius, fading)
- S-07 Device Detail (baseline chart with control bands, confidence overlay)
- Confidence badges appear across all metric surfaces

### Phase 4 (v0.4.0 — weeks 13-16)
- S-05 Management View
- S-06 Multi-site Grid
- S-08 Incident List (full)
- S-09 Incident Detail (full with similar incidents, PCAP, resolution notes)
- S-10 Forensic Replay
- S-17 Users
- S-18 Reports (basic)

### Phase 5 (v0.5.0 — weeks 17-20)
- S-19 Predictive Health

---

## 6. Placeholder States for Incomplete Phases

When a user navigates to a feature not yet available, we do NOT show a 404 or an error. We show a "Coming Soon" state that builds anticipation.

### Coming Soon Template
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│          [Feature icon — 32px, muted]                        │
│                                                              │
│          Predictive Health                                   │
│                                                              │
│          Available when you have 30+ days of history.        │
│          You have 12 days. Keep NetSense running.            │
│                                                              │
│          ████████████░░░░░░░░░░  40%                         │
│          12 of 30 days collected                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

This applies to:
- Predictive Health (Phase 5) — shows data accumulation progress
- Similar Incidents panel (Phase 4) when < 5 incidents exist: `Similar incidents appear after your first 5 resolved incidents`
- Incident Memory (Phase 4) checklist when no similar incident exists: `No past incidents match this pattern. Add detailed resolution notes — they become the checklist for future incidents.`

---

## 7. Implementation Guide for Developers

### Tech Stack (confirmed from technology roadmap)
- **React 18** + TypeScript
- **Cytoscape.js** for topology (WebGL fallback for > 500 nodes)
- **Recharts** for metric charts
- **React Router v6** for routing
- CSS custom properties (design tokens defined in `:root`)
- **Lucide React** for icons
- **Inter + JetBrains Mono** from Google Fonts

### File Structure (Frontend)
```
src/
├── design/
│   └── tokens.css          ← All CSS custom properties (the design system)
├── components/
│   ├── primitives/          ← StatusDot, Badge, Button, Input, etc.
│   ├── charts/              ← MetricChart, MetricSparkline
│   ├── topology/            ← TopologyMap, TopologyNode, TopologyEdge
│   ├── incidents/           ← IncidentCard, ChecklistPanel, BlastRadiusPanel
│   ├── layout/              ← Shell, Sidebar, TopBar, PageHeader
│   └── empty-states/        ← All empty state components
├── screens/
│   ├── setup/               ← S-00 Setup Wizard
│   ├── dashboard/           ← S-02, S-03, S-04, S-05 Dashboard layers
│   ├── sites/               ← S-06 Multi-site grid
│   ├── devices/             ← S-07 Device detail
│   ├── incidents/           ← S-08, S-09, S-10 Incidents + replay
│   ├── alerts/              ← S-11 Alert feed
│   ├── maintenance/         ← S-12 Maintenance windows
│   ├── reports/             ← S-18 Reports
│   ├── predict/             ← S-19 Predictive health
│   └── settings/            ← S-13–S-17 Settings sub-pages
├── hooks/
│   ├── useWebSocket.ts      ← Real-time updates
│   ├── useTopology.ts       ← Graph state management
│   ├── useIncidents.ts      ← Incident list + detail
│   └── useAuth.ts           ← Role, tenant, session
├── api/
│   └── client.ts            ← Typed API client
└── App.tsx
```

### Component Contract (Example: StatusDot)

```typescript
interface StatusDotProps {
  status: 'ok' | 'warning' | 'critical' | 'maintenance' | 'learning' | 'unknown' | 'excluded';
  size?: 'sm' | 'md' | 'lg';  // default: 'md'
  pulse?: boolean;             // default: true for critical
  'data-testid'?: string;
  'aria-label'?: string;       // default: `Device status: ${status}`
}
```

Every component must:
1. Accept `data-testid` for automated testing
2. Use only design tokens, no hardcoded colors
3. Handle loading, error, and empty states internally
4. Be fully keyboard-navigable

### WebSocket Events (from backend)

The UI subscribes to these event types for real-time updates:

| Event | Payload | UI Action |
|-------|---------|-----------|
| `node_status_change` | `{ ip, status, timestamp }` | Update node color on topology |
| `node_added` | `{ device }` | Add node to topology with fade-in |
| `node_removed` | `{ ip }` | Remove node with fade-out |
| `edge_added` | `{ src, dst, type }` | Add edge |
| `incident_created` | `{ incident }` | Show alert banner, add to feed |
| `incident_updated` | `{ incident }` | Update incident card |
| `incident_resolved` | `{ incidentId }` | Remove from active, update list |
| `metric_anomaly` | `{ ip, metric, value, sigma }` | Flash node, update metric chart |
| `baseline_confidence_update` | `{ ip, metric, confidence }` | Update confidence pill |

### Critical Rules for Developers

1. **Never show raw metric names from the API** — always map to human labels. `ifInErrors` → `Interface Errors In`. Mapping table lives in `src/lib/metricLabels.ts`.

2. **Never show raw status codes from the API** — map through the status system. `DOWN` → `critical`, not the word "DOWN".

3. **Every API error must show a human-readable toast** — catch all API errors at the client level and translate. Never expose HTTP status codes to the user.

4. **The exclusion list must be visible on every device surface** — if a device is excluded, show the lock icon. If it's on the active whitelist, show a warning icon. No device should appear without this context.

5. **Confidence must be visible whenever < 1.0** — never hide it. Engineers need to know when to trust alerts.

6. **Layer 3 must be immediately accessible** — the layer switcher must be reachable in one click from Layer 1 or 2. If a critical incident fires while the user is on Layer 2, an auto-switch prompt appears: `A CRITICAL incident just fired. Switch to incident mode? [Switch] [Stay]`.

---

## 8. Design Review Checklist

Before any screen is marked ready for development, verify:

- [ ] Every device shown has a visible StatusDot
- [ ] Every alert uses plain language (no raw codes)
- [ ] Confidence < 1.0 is surfaced where metrics appear
- [ ] OT devices show lock or warning icon on their exclusion/whitelist status
- [ ] Empty state is designed for every data surface
- [ ] Loading skeleton is designed for every data surface
- [ ] Error state is designed for every data surface
- [ ] Role restrictions are annotated (what does engineer vs senior see here?)
- [ ] Screen works at 1024px wide (tablet minimum)
- [ ] All interactive elements have keyboard focus states
- [ ] All icons have aria-labels
- [ ] No information is conveyed by color alone
- [ ] All copy follows plain-language and voice guidelines
- [ ] `data-testid` attributes are defined for every interactive element

---

## 9. Open Design Questions (To Resolve Before Build)

| # | Question | Options | Owner |
|---|----------|---------|-------|
| 1 | Should Layer 3 auto-activate, or require engineer to switch manually? | Auto (current spec) vs. Manual (less intrusive) | UX review |
| 2 | Topology layout algorithm for large graphs (200+ nodes): force-directed becomes messy. Hierarchical layout? | Force-directed (current) vs. Dagre hierarchical vs. Manual freeze | Senior eng |
| 3 | Incident checklist: should steps be auto-generated from past notes (AI/NLP), or just shown as raw notes? | Raw notes (Phase 4) → AI-generated steps (Phase 5+) | Product |
| 4 | MSP white-labeling: should the logo and brand be swappable per tenant? | White-label (Phase 5) vs. always NetSense brand | Product |
| 5 | Mobile topology: replace with device list (current spec) or show simplified topology? | Current spec fine for Phase 1-3, revisit in Phase 4 | UX |
| 6 | Report generation: in-browser render (current) vs. server-side PDF generation? | Server-side preferred for consistency | Backend eng |
