# NetSense UI/UX Specification — Part 1: Design System & Brand

**Version:** 0.1.0  
**Status:** Draft  
**Last updated:** 2026-07-06

---

## 1. Brand Identity

### What the Product Must Communicate on First Glance
NetSense is a passive network intelligence platform for industrial and enterprise environments. The UI must communicate three things instantly:
1. **Authority** — this is a serious, professional tool used in critical infrastructure
2. **Clarity** — you can understand your entire network in seconds
3. **Trust** — the system is honest, precise, and never cries wolf

### Design Personality
- **Not**: Flashy, gamified, consumer-grade
- **Yes**: Precise, calm, confident, industrial-grade
- Reference aesthetics: Bloomberg Terminal discipline + Linear app polish + Grafana dark density — but built specifically for OT/IT convergence

---

## 2. Design Tokens

### Color Palette

#### Base — Dark Mode (Primary)
```
--color-bg-base:        #0A0C10   /* Near-black, not pure black */
--color-bg-surface:     #111318   /* Card surfaces */
--color-bg-elevated:    #1A1E26   /* Modals, popovers */
--color-bg-hover:       #1F2430   /* Hover states */
--color-border-subtle:  #1E2433   /* Borders, dividers */
--color-border-default: #2A3347   /* Active borders */
```

#### Brand — Cobalt Intelligence
```
--color-brand-primary:   #2D7DD2   /* Primary actions, links */
--color-brand-dim:       #1A4A80   /* Muted brand */
--color-brand-glow:      rgba(45,125,210,0.15)  /* Ambient glow */
```

#### Status — Semantic (Critical for network monitoring)
```
--color-status-ok:        #22C55E  /* Node healthy, green */
--color-status-ok-dim:    #15803D  /* Muted healthy */
--color-status-warn:      #F59E0B  /* Degraded, warning */
--color-status-warn-dim:  #92400E  /* Muted warning */
--color-status-crit:      #EF4444  /* Down, critical */
--color-status-crit-dim:  #991B1B  /* Muted critical */
--color-status-unknown:   #6B7280  /* Unknown/offline */
--color-status-maint:     #8B5CF6  /* In maintenance */
--color-status-learning:  #06B6D4  /* Baseline learning */
```

#### Text
```
--color-text-primary:   #F1F5F9   /* Headings, primary labels */
--color-text-secondary: #94A3B8   /* Secondary labels, metadata */
--color-text-muted:     #475569   /* Timestamps, hints */
--color-text-disabled:  #334155   /* Disabled states */
--color-text-inverse:   #0A0C10   /* Text on light backgrounds */
```

#### Data Visualization
```
--color-chart-1: #2D7DD2   /* Primary metric */
--color-chart-2: #22C55E   /* Secondary metric */
--color-chart-3: #F59E0B   /* Tertiary metric */
--color-chart-4: #8B5CF6   /* Quaternary */
--color-chart-5: #06B6D4   /* Quinary */
--color-chart-band: rgba(45,125,210,0.08)  /* Baseline band fill */
--color-chart-breach: rgba(239,68,68,0.15) /* Anomaly highlight */
```

---

### Typography

**Primary Font:** `Inter` (variable, from Google Fonts)  
**Monospace Font:** `JetBrains Mono` (IP addresses, metric values, packet data)

```
--font-sans: 'Inter', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Scale */
--text-xs:   11px / 1.4  /* Timestamps, badges */
--text-sm:   13px / 1.5  /* Labels, table cells */
--text-base: 15px / 1.6  /* Body, descriptions */
--text-lg:   17px / 1.5  /* Section titles */
--text-xl:   21px / 1.3  /* Page headers */
--text-2xl:  27px / 1.2  /* Metric values (big numbers) */
--text-3xl:  35px / 1.1  /* Hero numbers */

/* Weights */
--font-regular:  400
--font-medium:   500
--font-semibold: 600
--font-bold:     700
```

---

### Spacing Scale
```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

### Border Radius
```
--radius-sm:  4px   /* Tags, badges */
--radius-md:  8px   /* Cards, inputs */
--radius-lg:  12px  /* Panels, modals */
--radius-xl:  16px  /* Large cards */
--radius-full: 9999px /* Pills, dots */
```

### Shadows & Elevation
```
--shadow-sm:  0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
--shadow-md:  0 4px 12px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3);
--shadow-lg:  0 12px 32px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4);
--shadow-glow-brand: 0 0 20px rgba(45,125,210,0.25);
--shadow-glow-ok:    0 0 12px rgba(34,197,94,0.3);
--shadow-glow-crit:  0 0 20px rgba(239,68,68,0.3);
```

---

### Animation Tokens
```
--duration-instant: 80ms
--duration-fast:    150ms
--duration-normal:  250ms
--duration-slow:    400ms
--duration-enter:   300ms
--duration-exit:    200ms

--ease-default:   cubic-bezier(0.4, 0, 0.2, 1)
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1)  /* Status dot pulse */
--ease-out:       cubic-bezier(0, 0, 0.2, 1)
```

---

## 3. Iconography

**Icon set:** Lucide Icons (MIT licensed, consistent stroke weight)  
**Stroke width:** 1.5px across all icons (not 2px — too heavy for dense dashboards)  
**Icon sizes:**
```
--icon-xs: 12px   /* Inline with text-xs */
--icon-sm: 14px   /* Inline with labels */
--icon-md: 16px   /* Standard UI */
--icon-lg: 20px   /* Navigation, headers */
--icon-xl: 24px   /* Empty states */
--icon-2xl: 32px  /* Hero sections, setup wizard */
```

**Device type icons (custom SVG, consistent 24x24 grid):**
- Switch — stacked rectangles with upward arrows
- Router — circle with arrows
- PLC — interlocking rectangles (industrial feel)
- HMI — rounded rectangle with display face
- SCADA server — server stack with signal lines
- Workstation — monitor shape
- Firewall — shield with grid
- Unknown — question mark in circle

---

## 4. Component Library Overview

Components are built in React 18 + TypeScript. All components accept a `data-testid` prop for browser testing. No component has hardcoded colors — all use design tokens.

### Core Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `StatusDot` | Pulsing colored dot for device status | `status`, `size`, `pulse` |
| `SeverityBadge` | CRITICAL / WARNING / INFO badge | `severity`, `count` |
| `ConfidencePill` | Shows baseline confidence 0–100% | `confidence`, `showLabel` |
| `MetricSparkline` | Inline 24-hour sparkline | `data`, `anomaly`, `band` |
| `MetricChart` | Full 4-hour chart with control bands | `metric`, `timeRange`, `incidents` |
| `DeviceCard` | Summary card for a single device | `device`, `metrics`, `onClick` |
| `IncidentCard` | Incident summary with severity + age | `incident`, `onAcknowledge` |
| `TopologyMap` | Cytoscape.js interactive network graph | `graph`, `layer`, `onNodeClick` |
| `BlastRadiusPanel` | Affected downstream device tree | `rootDevice`, `affected` |
| `ChecklistPanel` | Step-by-step resolution guide | `steps`, `incidentId` |
| `AlertBanner` | Full-width critical alert bar | `incident`, `onDismiss` |
| `MaintenanceBadge` | Purple "In Maintenance" overlay | `window`, `suppressedCount` |
| `SiteCard` | MSP multi-site grid tile | `site`, `health`, `onClick` |
| `SetupStep` | Wizard step with status | `step`, `status`, `children` |

---

## 5. Layout System

### Shell Layout (Authenticated App)
```
┌─────────────────────────────────────────────────────────┐
│  [Logo] [Site name]              [Alerts] [User] [Menu]  │  ← TopBar (56px)
├────────┬────────────────────────────────────────────────┤
│        │                                                 │
│  Nav   │              Main Content Area                  │
│ (220px)│                                                 │
│        │                                                 │
│        │                                                 │
└────────┴────────────────────────────────────────────────┘
```

**TopBar:** Fixed, 56px, `--color-bg-surface` with `border-bottom: 1px solid --color-border-subtle`. Contains: logo + site selector (left), alert bell with count badge, user avatar menu (right).

**Sidebar Navigation:** 220px fixed, collapsible to 56px icon-only mode. Dark, `--color-bg-base`. Navigation items have hover fill + active left-border accent in `--color-brand-primary`.

**Main Content Area:** Scrollable, `--color-bg-base`, 24px padding. Max-width: none (full bleed for topology), but content panels have `max-width: 1440px` and `margin: 0 auto`.

### Grid System
- 12-column grid with 24px gutters
- Responsive breakpoints: `sm: 640px`, `md: 1024px`, `lg: 1280px`, `xl: 1536px`
- Cards never go below 280px width

---

## 6. Critical Interaction Principles

### 1. Status is Always Visible
Every page where a device is referenced shows its current status. There is no page where a device appears without a `StatusDot`. Status is never text-only.

### 2. Plain Language First
Alert messages are always plain language:
- ✅ `PLC-07 is not responding. 4 downstream devices affected.`
- ❌ `Modbus exception code 0x04 on unit ID 7. ifOperStatus DOWN.`

### 3. Honest Uncertainty
When confidence is below 100%, the UI never hides it:
- Metric charts show a shaded "learning" overlay
- Alert cards show `LOW CONFIDENCE` badge
- Incident panels show confidence meter

### 4. Zero Dead Ends
Every empty state has a clear action. No screen ever shows a blank area without explaining why and what to do next.

### 5. OT Safety is Visible Architecture
The exclusion list and passive-only indicators are always surfaced. Engineers should never have to wonder "is the system touching that PLC?" — the answer must be visible.
