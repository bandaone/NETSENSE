# NetSense UI/UX Specification — Part 3: Interactions, States & Micro-Animations

**Version:** 0.1.0  
**Status:** Draft  
**Last updated:** 2026-07-06

---

## 1. Status System — Complete State Machine

Every device in NetSense exists in exactly one of these states at any time. The UI must reflect the correct state everywhere the device appears — on the topology, in tables, in alerts, in the slide-in panel.

### Device States

| State | Token | Dot Color | Topology Node | Description |
|-------|-------|-----------|---------------|-------------|
| `ok` | `--color-status-ok` | Solid green | Green fill | All metrics within baseline |
| `warning` | `--color-status-warn` | Solid amber | Amber fill | One or more metrics near control limit |
| `critical` | `--color-status-crit` | Pulsing red | Red fill + ring | Device unreachable or metric severely breached |
| `maintenance` | `--color-status-maint` | Solid purple | Purple fill + diagonal lines | Inside active maintenance window |
| `learning` | `--color-status-learning` | Slow-pulse cyan | Cyan outline | Baseline confidence < 1.00 |
| `unknown` | `--color-status-unknown` | Solid gray | Gray fill | No data in last 5 minutes |
| `excluded` | `--color-status-unknown` | Gray with lock | Gray + lock icon | On exclusion list, passive-only |

### Pulse Animations

**Critical pulse** (`--color-status-crit`):
```css
@keyframes pulse-critical {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  50%       { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}
/* Applied to StatusDot when status = critical */
animation: pulse-critical 1.2s ease-in-out infinite;
```

**Learning pulse** (`--color-status-learning`):
```css
@keyframes pulse-learning {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
animation: pulse-learning 2.5s ease-in-out infinite;
```

**Warning** — no pulse, solid amber. Pulse reserved for critical only (signal-to-noise).

---

## 2. Topology Map — Interaction Specification

### Node Interactions

| Interaction | Behavior |
|-------------|----------|
| Hover | Show tooltip: device name, IP, status, last seen |
| Click (Layer 1) | Promote to Layer 2 and open node detail panel |
| Click (Layer 2) | Open slide-in detail panel (480px from right) |
| Click (Layer 3 — incident mode) | Only affected nodes are clickable; opens incident checklist |
| Right-click | Context menu: View Detail / Add to Maintenance / Copy IP |
| Double-click | Navigate to S-07 (Device Detail page) |
| Drag | Move node (only when layout is frozen) |

### Edge Interactions

| Interaction | Behavior |
|-------------|----------|
| Hover | Show tooltip: interface names both ends, link speed, utilization % |
| Click | Open edge detail mini-panel: link metrics, error counts, LLDP data |

### Map Controls

**Bottom-left control cluster:**
```
[+] [-] [⊡] [❄]    [L1] [L2] [L3]
Zoom     Fit Freeze   Layer
```

- Zoom in/out: also responds to scroll wheel
- Fit to screen: fits all visible nodes
- Freeze: toggles force-directed physics. When frozen: icon shows snowflake (active), nodes can be dragged. Position saved to user preferences.
- Layer switcher: L1 / L2 / L3 buttons. L3 only enabled when critical incident active (otherwise grayed with tooltip `Switch to L3 during a critical incident`)

**Top-right mini-map:**  
Thumbnail of full graph when zoomed in. Click to pan. 120x80px, semi-transparent.

### Blast Radius Animation (Layer 3 transition)

When Layer 3 activates (critical incident fires):
1. All unaffected nodes animate to 15% opacity over 400ms
2. Affected downstream path highlights in amber, animate inward from root cause (ripple effect)
3. Root cause node gets pulsing red ring (150ms pulse cycle)
4. Side panel slides in from left (300ms ease-out)
5. Total transition: sequential, ~700ms end-to-end

When incident resolves:
1. Checklist panel slides out (200ms)
2. Nodes animate back to full opacity (500ms, staggered by distance from root)
3. Root cause node ring fades out
4. Layer returns to pre-incident layer (1 or 2)

---

## 3. Chart Specification

All metric charts use a consistent rendering specification. The library is **Recharts** (React-native, composable).

### MetricChart — Full Chart (S-03, S-07, S-09)

**Anatomy:**
```
Y axis │  ┌────────────────────────────────────────────────┐  Upper control limit (dashed)
       │  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  Control band (shaded)
       │  │  ╭──╮                                         │  ← Metric line
       │  │╭─╯  ╰──╮         ●  ← anomaly point          │
       │  │╯        ╰──────────────────────────────────── │  Baseline (dotted)
       │  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  Control band (shaded)
       │  └────────────────────────────────────────────────┘  Lower control limit (dashed)
       └───────────────────────────────────────────────── X axis (time)
```

**Style details:**
- Metric line: 1.5px, `--color-chart-1`, smooth curve
- Control band fill: `--color-chart-band` (very subtle blue-tinted fill)
- Control limit lines: 1px dashed, `--color-border-default`
- Anomaly points: 6px red dots, `--color-status-crit`, on hover show tooltip with value + deviation
- Baseline learning overlay: when confidence < 1.0, semi-transparent cyan diagonal stripe pattern covers the chart area, with label `Baseline learning (74% confident)`
- Grid lines: horizontal only, `--color-border-subtle`, 1px
- Zero line: hidden (metrics rarely cross zero)

**Interactions:**
- Hover: crosshair + floating tooltip shows timestamp, value, baseline value, deviation in sigmas (e.g. `+2.3σ`)
- Click on anomaly point: opens incident for that event if one exists
- Time range tabs above chart: `1h | 6h | 24h | 7d | 30d`
- Metric selector tabs: one tab per available metric for the device

### MetricSparkline — Inline Mini Chart (node detail, device cards)

- 80px wide, 28px tall
- No axes, no labels
- Thin 1px line
- Anomaly fill: red background segment where breach occurred
- Hover: shows full chart in tooltip

---

## 4. Navigation — Sidebar Detail

### Sidebar Items (by role)

**engineer:**
```
◉  Dashboard
🔔  Alert Feed
📋  Incidents
```

**senior:**
```
◉  Dashboard
🔔  Alert Feed
📋  Incidents
🔬  Forensic Replay
🖥  Devices
🛠  Maintenance
⚙   Settings (limited)
```

**admin:**
```
◉  Dashboard
🔔  Alert Feed
📋  Incidents
🔬  Forensic Replay
🖥  Devices
🛠  Maintenance
📊  Reports
⚙   Settings (full)
```

**MSP senior:**
```
◉  Sites (grid — default)
◉  Dashboard (per-site, when inside a site)
🔔  Alert Feed
📋  Incidents
🖥  Devices
📊  Reports
⚙   Settings
```

### Sidebar Behavior

- Collapsed mode (56px): icons only, tooltips on hover
- Expanded mode (220px): icons + labels
- Toggle: `‹` / `›` button at bottom of sidebar
- Current section: left 3px border accent, `--color-brand-primary`, background `--color-bg-hover`
- Incident badge: red number badge on `Incidents` item when unresolved incidents exist
- Alert badge: red dot on `Alert Feed` when unacknowledged alerts exist

---

## 5. Modal & Overlay System

### Modal Sizes

| Size | Width | Use |
|------|-------|-----|
| `sm` | 400px | Confirmation dialogs, simple forms |
| `md` | 560px | Create/edit forms |
| `lg` | 720px | Complex forms (SNMP config, alert routing) |
| `full` | 90vw | Report preview, forensic replay |

### Modal Anatomy
- Backdrop: `rgba(0,0,0,0.6)` blur
- Card: `--color-bg-elevated`, `--radius-lg`, `--shadow-lg`
- Header: title (text-lg semibold) + close button (X)
- Body: scrollable if content overflows
- Footer: action buttons right-aligned, destructive actions on far left

### Modal Animation
- Enter: fade-in (opacity 0→1) + scale (0.96→1.0), 250ms ease-out
- Exit: fade-out + scale (1.0→0.96), 200ms ease-in
- Backdrop: fade-in 200ms

### Confirmation Dialogs (Destructive Actions)
Always use `sm` modal. Red `Confirm` button. Pattern:

```
┌─────────────────────────────────────────┐
│  ⚠  Enable Active Polling               │
│                                         │
│  This will send Modbus TCP read         │
│  requests to PLC-07 (192.168.10.47).   │
│  Are you sure?                          │
│                                         │
│  [Cancel]          [Enable — I Accept] │
└─────────────────────────────────────────┘
```

---

## 6. Toast Notification System

Toasts appear in bottom-right corner. Stack upward. Max 3 visible at once.

### Toast Types

| Type | Color | Icon | Auto-dismiss |
|------|-------|------|-------------|
| `success` | Green border | ✓ | 4 seconds |
| `info` | Blue border | ℹ | 5 seconds |
| `warning` | Amber border | ⚠ | 8 seconds |
| `error` | Red border | ✗ | Stays until dismissed |

### Toast Anatomy
- 320px wide
- `--color-bg-elevated` background
- Colored left border (4px)
- Title (text-sm semibold) + optional description (text-sm, muted)
- Dismiss X button
- Progress bar along bottom shows time remaining (success/info/warning only)

### Toast Animation
- Enter: slide up from bottom + fade-in, 250ms spring
- Exit: slide right + fade-out, 200ms ease-in
- When stacking: existing toasts nudge upward (200ms)

---

## 7. Empty States

Every screen that can be empty has a designed empty state. Never leave a blank area.

### Empty State Anatomy
- Centered in the available space
- Icon (24px, muted color)
- Headline (text-base, semibold)
- Description (text-sm, muted, max 2 lines)
- Optional CTA button

### Empty State Catalog

| Screen | Icon | Headline | Description | CTA |
|--------|------|----------|-------------|-----|
| Alert Feed — no alerts | `check-circle` | `No active alerts` | `Your network is healthy. Alerts will appear here when detected.` | — |
| Incident List — no results | `search` | `No incidents match your filter` | `Try adjusting your date range or status filter.` | `Clear Filters` |
| Predictive Health — insufficient data | `clock` | `Not enough history yet` | `Predictive health requires 30 days of data. You have [N] days.` | — |
| Multi-site — no sites | `map-pin` | `No sites configured` | `Add your first client site to get started.` | `Add Site` |
| Device Detail — no metrics | `activity` | `No metrics collected yet` | `The probe is passively observing this device. Metrics will appear once traffic is seen.` | — |
| Topology — no devices | `network` | `No devices discovered yet` | `Check that your mirror port is receiving traffic from the network.` | `Open Setup Wizard` |

---

## 8. Loading States

### Skeleton Loading
Used when initial data is loading (page load, tab switch). Never show spinners for data that takes < 300ms.

- Skeleton elements use `--color-bg-elevated` base with animated shimmer overlay
- Shimmer: left-to-right gradient sweep, 1.5s cycle
- Topology: shows gray placeholder nodes and edges before real data loads
- Charts: show skeleton rectangle at chart dimensions before data arrives
- Tables: show 5 skeleton rows

### Progressive Loading (Topology)
Topology loads in stages:
1. First: infrastructure devices (switches, routers, servers) — typically fast
2. Then: end devices (workstations, printers)
3. Then: OT devices (PLCs, HMIs — from passive capture, may take longer)

Each stage adds nodes with a fade-in animation (200ms per batch).

### Inline Loading
For actions that trigger server calls (acknowledge incident, create maintenance window):

- Button shows spinner replacing icon, text changes to `Working…`
- Button disabled during loading
- On success: button briefly shows checkmark before toast appears
- On error: button resets, error toast appears

---

## 9. Responsive Behavior

NetSense is primarily a desktop application (1280px+ target). However it must be usable on tablets (engineers carry iPads on the floor) and readable on mobile (SMS links open dashboard).

### Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| `mobile` | < 640px | Single column. Topology hidden (replaced by device list). Alert feed full-width. |
| `tablet` | 640–1024px | Sidebar collapses to icon-only. Charts simplified. Topology visible at reduced size. |
| `desktop` | 1024–1440px | Full layout. Standard. |
| `wide` | > 1440px | Content max-width 1440px centered. Topology fills remaining space. |

### Mobile-Specific Screens
On mobile, the dashboard shows:
- **Status strip** at top: X devices up, Y incidents
- **Alert list** (primary content)
- **Device list** (secondary, searchable)
- Topology available via `View Topology` button → opens full-screen, touch-controlled

SMS links to incidents open directly to S-09 (Incident Detail), optimized for mobile reading.

---

## 10. Accessibility

### Requirements
- All interactive elements meet WCAG 2.1 AA contrast ratios
- Keyboard navigation: full tab order, visible focus rings (`2px solid --color-brand-primary`)
- Screen reader: all icons have `aria-label`. Status dots have `role="status"` and `aria-label="Device status: critical"`
- No information conveyed by color alone — always paired with icon or text
- Alert feed: new alerts announced via `aria-live="polite"` region
- Critical incidents: `aria-live="assertive"` for the alert banner

### Focus Styles
```css
:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

### Color Blindness
Status colors are not the only signal:
- `ok` → green + check icon
- `warning` → amber + triangle icon
- `critical` → red + X icon + pulse animation
- Device type differentiated by shape (circle/hexagon/diamond) not only color

---

## 11. Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Dashboard initial load | < 2 seconds | Skeleton shown while loading |
| Topology render (200 nodes) | < 500ms | Cytoscape.js with WebGL optional at > 500 nodes |
| WebSocket reconnect | < 3 seconds | Auto-reconnect with exponential backoff |
| Chart render (24h data) | < 200ms | Data downsampled to 1440 points max |
| Alert delivery (new alert → banner) | < 1 second | Via WebSocket push |
| Page navigation | < 300ms | Client-side routing, prefetch on hover |
