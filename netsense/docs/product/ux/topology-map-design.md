# NetSense Atlas — Operational Network Map Design

**Status:** Proposed design direction

**Scope:** Topology data model, visual language, layout, interaction, and incident mapping

**Principle:** The map is the product. It must explain the network, not merely draw it.

---

## 1. Product Position

NetSense Atlas is a living operational model of an IT/OT network. It answers four questions in order:

1. **Is production healthy?**
2. **What changed?**
3. **What depends on the failed component?**
4. **What evidence supports the proposed root cause?**

The primary view is therefore an **operational dependency map**. Physical, Layer 2, Layer 3, traffic, and security relationships are available as intentional lenses over the same stable model.

> **Synthetic-data notice:** All organisations, sites, network addresses,
> assets, incidents, operational processes, people, and relationships used in
> Atlas examples are fictional and do not represent a real installation.

Atlas is not:

- a generic force-directed constellation;
- a static Visio replacement;
- a geographical map without verified coordinates;
- a packet-flow animation;
- a wall of vendor device icons;
- a security “cyber” graphic.

---

## 2. Reference Model

### 2.1 Multi-layer temporal property graph

The underlying model is a graph of:

- **networks** — a specific view or layer of topology;
- **nodes** — devices, interfaces, network segments, services, or processes;
- **termination points** — interfaces/ports at which links actually terminate;
- **links** — typed, directional relationships between termination points;
- **supporting mappings** — how an object in one topology is backed by an object in another;
- **observations** — time-bounded evidence supporting a node, link, classification, or state.

This follows the separation used by the IETF network-topology family: RFC 8345 defines networks, nodes, links, termination points, and mappings between underlay and overlay topologies. Layer 2 and Layer 3 are augmentations rather than one undifferentiated graph.

### 2.2 OT organization

OT assets are grouped using two complementary structures:

- **Functional level:** enterprise, industrial DMZ, site operations, supervisory control, basic control, and process.
- **Security zone and conduit:** assets with common security requirements belong to a zone; controlled communication between zones is represented as a conduit.

Purdue levels are useful orientation, not a claim that every modern plant is strictly hierarchical. Zone/conduit boundaries remain first-class even when IIoT, wireless, cloud, or edge paths cross levels.

### 2.3 Graph hierarchy

```text
Tenant
└── Site
    ├── Enterprise / IT
    ├── Industrial DMZ
    └── Industrial / OT
        ├── Operations zone
        └── Cell/area zone
            ├── VLAN or subnet
            ├── Infrastructure
            ├── Controllers and supervisory assets
            └── Process/service dependencies
```

Hierarchy is used for grouping and navigation. Connectivity remains represented by typed links and is never inferred solely from visual containment.

---

## 3. Topology Lenses

Atlas uses one stable canvas and six lenses. A lens changes visible entities, edge semantics, labels, and analysis; it does not randomly rearrange the network.

### 3.1 Operations

**Default lens.** Shows sites, zones, critical infrastructure, important services/processes, aggregate health, and unresolved change.

It answers: “What needs attention and what production capability is affected?”

### 3.2 Physical

Shows chassis, ports, LLDP/CDP-confirmed adjacency, link aggregation, media, link speed, errors, and redundancy.

It answers: “What is physically connected, through which interfaces?”

### 3.3 Layer 2

Shows switches, bridge domains, VLANs, trunks, access ports, STP state, LAGs, and MAC-learning evidence.

It answers: “How is the local broadcast domain constructed?”

### 3.4 Layer 3

Shows routers, routed interfaces, VRFs, subnets/prefixes, gateways, and observed or learned paths.

It answers: “How should a packet reach the destination?”

### 3.5 Flows

Shows observed conversations for a selected time range. Edges are aggregated by source, destination, protocol, and direction.

It answers: “Who actually communicated, using what, and how much?”

Flows never appear as permanent topology links and are not animated continuously by default.

### 3.6 Dependency

Shows `hosts`, `depends_on`, `controls`, `observed_by`, and `redundancy_peer` relationships between infrastructure, services, and industrial processes.

It answers: “What stops working if this component fails?”

### 3.7 Incident

A time-locked, evidence-driven subgraph derived from the dependency and topology lenses.

It answers: “What changed first, how did impact propagate, and what is the safest next action?”

---

## 4. Stable Spatial Model

### 4.1 The operator must build spatial memory

A device should remain in the same place across:

- page reloads;
- status changes;
- WebSocket topology diffs;
- lens changes where that device exists;
- opening and closing detail panels;
- entering and leaving incident mode.

Status changes move visual state, not geography.

### 4.2 Layout strategy

Use a constrained compound layout:

1. Site and security-zone containers establish the large regions.
2. Core and boundary infrastructure form a stable upper backbone.
3. Distribution and cell/area networks occupy the middle.
4. controllers, HMIs, servers, and endpoints occupy the lower/local bands.
5. Redundant peers are aligned as pairs.
6. Access devices remain near their upstream switch.
7. Unplaced discoveries enter a visible **Discovery tray**, never the production map at a random coordinate.

Force-directed layout is allowed only for:

- initial placement inside an unarranged local group;
- a separate discovery/exploration mode;
- resolving a small overlap without moving established anchors.

### 4.3 Position ownership

Positions have explicit provenance:

```text
system_suggested
site_canonical
user_override
incident_temporary
```

The site-canonical position is shared. A personal override is optional and reversible. Incident mode may temporarily separate overlapping affected paths but returns every node to its prior position.

---

## 5. Semantic Zoom

Zoom changes information resolution, not just object size.

### Z0 — Estate

- Site cards and inter-site/WAN relationships
- Health score, open incidents, probe state
- No individual devices

### Z1 — Site

- Security zones and major conduits
- Core, distribution, firewalls, critical services/processes
- Aggregated endpoint counts

### Z2 — Zone

- Infrastructure and important OT/IT devices
- VLAN/subnet containers
- Confirmed backbone links
- Labels for critical and non-healthy nodes

### Z3 — Device

- All visible devices
- Device name, role, IP
- Interface names on selected path
- Link utilization and state

### Z4 — Interface

- Ports/termination points
- LAG members
- speed, duplex, errors, VLAN mode
- parallel directional relationships

The transition between levels is deterministic. Clusters expand in place so the user never loses context.

---

## 6. Visual Grammar

### 6.1 Node anatomy

A device node consists of:

1. **Role silhouette** — switch, router, firewall, server, PLC, HMI, workstation, unknown.
2. **Identity label** — human name first, address second.
3. **Status marker** — icon/shape plus color.
4. **Criticality notch** — one to five fixed ticks, not node size alone.
5. **Observation state** — confirmed, inferred, stale, or unobserved.
6. **Change marker** — new, moved, or reclassified since the selected comparison time.

Node size represents abstraction and role, not live utilization. A core router can be larger than an endpoint, but a warning must not cause layout movement.

### 6.2 Status language

Status never relies on color alone:

| State | Color | Non-color signal |
|---|---:|---|
| Healthy | green | check marker |
| Warning | amber | triangle marker |
| Critical | red | broken-ring marker |
| Maintenance | violet | wrench marker and hatched halo |
| Learning | cyan | half-ring progress marker |
| Unknown | slate | question marker |
| Stale | slate | clock marker and reduced contrast |

Only critical and newly-changing states pulse. Healthy nodes remain quiet.

### 6.3 Selection and focus

- Hover: one-hop neighbours gain contrast; unrelated content dims slightly.
- Single click: persistent selection and inspection rail.
- Double click: enter the node’s local neighbourhood.
- Shift-click: compare two nodes and calculate paths between them.
- Escape: move one level back.
- Breadcrumb always shows the current scope.

Selection is cyan and status remains separately visible. A critical selected node therefore has a cyan outer focus ring and red inner status ring.

### 6.4 Edge grammar

Edges are read as technical statements:

| Relationship | Stroke |
|---|---|
| Physical confirmed | solid |
| Physical inferred | long dash |
| Layer 2 logical | paired fine line |
| Layer 3 path | fine directional line |
| Observed flow | tapered directional band |
| Dependency | orthogonal line with arrow |
| Control relationship | double-line arrow |
| Redundancy | parallel line with linked-pair marker |
| Blocked/denied | interrupted line with stop marker |
| Unknown/stale | dotted, reduced contrast |

Color is reserved for state and analysis. Relationship type is conveyed mainly through stroke, arrow, label, and layer.

Link endpoints attach to ports/termination points when known. A link without known interfaces visibly terminates at the node boundary and carries an `interface unknown` evidence state.

### 6.5 Edge label

The selected or hovered edge can show:

```text
Gi1/0/24 ↔ Gi0/1
1 Gb/s · 62% · 0.4% errors
LLDP confirmed · seen 12s ago
```

Permanent labels appear only at sufficient zoom or along a selected path.

### 6.6 Zone and conduit language

- Zones are restrained containers with a titled header rail.
- The header shows zone name, functional level, device count, health, and policy state.
- A conduit is drawn at the boundary crossing, not as a vague long edge.
- Firewalls, data diodes, and gateways sit directly on the boundary they enforce.
- Unexpected cross-zone traffic creates a visible boundary event.

The map must make the IT/OT trust boundary understandable before the user reads any table.

---

## 7. Map Chrome

### 7.1 Top command bar

```text
[Scope breadcrumb]  [Operations | Physical | L2 | L3 | Flows | Dependency]
                    [Time: Live ▾] [Compare] [Search /]
```

The existing L1/L2/L3 labels are replaced:

- “L1/L2/L3” are already overloaded networking terms.
- “Overview/Detailed/Incident” mixes detail level with operational mode.
- Explicit lens names remove ambiguity.

Incident mode is entered from an incident, alert, or time marker—not presented as another network layer.

### 7.2 Left rail

Contextual inventory tree:

```text
Mukuba Copper Processing Complex
├── Enterprise IT
├── Industrial DMZ
└── Plant OT
    ├── Crusher Cell
    ├── Conveyor Cell
    └── Mill Cell
```

Tree selection scopes the map. Counts show hidden healthy, warning, critical, and unknown assets.

### 7.3 Right inspection rail

The rail has fixed tabs:

- Summary
- Interfaces
- Neighbours
- Paths
- Dependencies
- Evidence
- History

It does not cover the selected node. The canvas pans to retain context when the rail opens.

### 7.4 Bottom timeline

The topology is temporal:

```text
Live ───────────────●────────────── 23:42
        +node   link↓   incident
```

The user can:

- scrub backward;
- compare two timestamps;
- replay a topology or incident change;
- return to Live;
- see whether the current state is historical.

Historical mode uses an unmistakable header and disables live actions.

### 7.5 Minimap

The minimap shows:

- current viewport;
- zone outlines;
- off-screen critical nodes;
- selected path;
- hidden incident impact.

It appears only when the graph exceeds the viewport.

---

## 8. Incident Cartography

Incident mode is not “make the graph red.” It is a causal explanation.

### 8.1 Composition

Show four visual roles:

1. **First observed change** — timestamp marker.
2. **Root-cause candidates** — ranked, numbered, confidence shown.
3. **Propagation paths** — time-ordered evidence.
4. **Impact** — confirmed affected, at risk, and protected by redundancy.

Unaffected context remains faintly visible so the user retains orientation.

### 8.2 Impact states

```text
Confirmed affected
At risk
Protected by verified alternate path
Suppressed by maintenance
Unknown because visibility is incomplete
Unaffected
```

These states use pattern, outline, and labels in addition to color.

### 8.3 Root-cause explanation

Never label a node simply “ROOT CAUSE” unless an engineer has confirmed it. Before confirmation, use:

```text
Probable cause 1 · 89%
Explains 5/5 symptoms
Changed 11s before downstream failures
No healthy alternate path observed
Evidence: LLDP, passive flow loss, interface state
```

Alternative candidates remain inspectable.

### 8.4 Blast radius

Blast radius distinguishes:

- structurally downstream;
- confirmed affected;
- operationally dependent;
- still healthy but at risk;
- protected through an alternate path;
- hidden by incomplete observation.

Impact summaries include services and processes:

```text
5 devices affected · 9 at risk · 4 protected
Crusher Line control unavailable
Operator impact: not configured in this synthetic scenario
Observation confidence 89%
```

### 8.5 Incident transition

1. Preserve the existing map position.
2. Move the timeline to the first event.
3. Dim unrelated context over 250 ms.
4. Draw the observed propagation in timestamp order.
5. Reveal candidate ranking.
6. Open the incident rail without covering the causal path.

No rapid red pulse, moving background, or continuously animated traffic is used during diagnosis.

---

## 9. Discovery and Uncertainty

Passive discovery cannot always establish topology truth. Atlas makes uncertainty useful.

### 9.1 Evidence classes

```text
configured
LLDP/CDP confirmed
routing learned
flow observed
MAC inferred
protocol classified
operator confirmed
stale
conflicting
```

### 9.2 Confidence presentation

- Confidence appears on inferred nodes, links, and classifications.
- Conflicting evidence creates a review task.
- Low-confidence items are never allowed to silently restructure the canonical map.
- Operator confirmation records actor, time, and previous value.
- Evidence is available from the inspection rail.

### 9.3 Discovery tray

New or uncertain assets enter a tray containing:

- inferred identity;
- source evidence;
- possible upstream attachment;
- confidence;
- first/last seen;
- suggested zone;
- confirm, merge, ignore, or investigate actions.

This prevents passive observations from making the operational map jump.

---

## 10. Scaling Rules

### Up to 200 visible entities

Render individual nodes and relevant links.

### 200–2,000 entities

Use semantic clustering by site, zone, VLAN/subnet, upstream infrastructure, or device role. Expand on demand.

### Above 2,000 entities

Default to aggregate health and exception-first rendering. Query and stream only the selected scope.

### Visual-density budget

- No more than 80 persistent labels in a viewport.
- No more than two simultaneous edge overlays.
- Healthy access endpoints aggregate first.
- Critical, warning, selected, changed, and unknown entities resist aggregation.
- Hidden counts are always stated.

---

## 11. Interaction and Accessibility

- Full keyboard navigation between zones, nodes, links, and controls.
- Search accepts name, IP, MAC, VLAN, zone, site, protocol, interface, and incident ID.
- Every graphical state has an equivalent textual representation.
- Status and edge type never rely on color alone.
- Essential graph objects meet non-text contrast requirements.
- “Reduce motion” disables pulses, animated edge flow, and layout transitions.
- A table/tree alternative represents the current scoped topology.
- Copy actions expose name, IP, MAC, interface, and stable graph ID.

---

## 12. Data Contract Direction

Illustrative node:

```json
{
  "id": "device:mukuba-copper-complex:dist-02",
  "kind": "device",
  "role": "distribution_switch",
  "name": "Dist-02 (Plant)",
  "status": "critical",
  "operationalCriticality": 5,
  "parent": "zone:mukuba-copper-complex:plant-ot",
  "observation": {
    "state": "confirmed",
    "confidence": 0.98,
    "sources": ["lldp", "passive_flow"],
    "last_seen": "2026-07-25T00:18:42Z"
  }
}
```

Illustrative termination point:

```json
{
  "id": "interface:mukuba-copper-complex:dist-02:gi1-0-24",
  "node_id": "device:mukuba-copper-complex:dist-02",
  "name": "Gi1/0/24",
  "oper_state": "down",
  "speed_bps": 1000000000
}
```

Illustrative link:

```json
{
  "id": "link:mukuba-copper-complex:core-02:gi0-2:dist-02:gi1-0-24",
  "kind": "physical_confirmed",
  "source_tp": "interface:mukuba-copper-complex:core-02:gi0-2",
  "target_tp": "interface:mukuba-copper-complex:dist-02:gi1-0-24",
  "direction": "bidirectional",
  "supporting_links": [],
  "capacity_bps": 1000000000,
  "utilization": 0,
  "evidence": {
    "source": "lldp",
    "confidence": 1,
    "last_seen": "2026-07-25T00:18:31Z"
  },
  "valid_from": "2026-05-02T09:14:00Z",
  "valid_to": null
}
```

---

## 13. Changes Required From the Current Prototype

1. Stop destroying and rebuilding the Cytoscape instance on every lens or status change.
2. Remove `randomize: true` from normal operational transitions.
3. Persist canonical positions and update topology through diffs.
4. Add compound nodes for sites, zones, and VLAN/subnet scopes.
5. Model interfaces/termination points rather than terminating every link at a device.
6. Replace generic `inferred` and `affected` booleans with typed relationships and evidence.
7. Separate status, criticality, confidence, and incident-impact visual channels.
8. Replace ambiguous L1/L2/L3 UI labels with explicit topology lenses.
9. Stop animating all dashed edges continuously; animate only a selected or replayed flow.
10. Add semantic zoom and aggregation.
11. Add stable selection, path comparison, edge inspection, and temporal comparison.
12. Correct and enforce the project-wide criticality direction.

---

## 14. Delivery Sequence

### Milestone A — Map language

- typed node/link contract;
- criticality invariant;
- status and relationship primitives;
- stable layout;
- zone compounds;
- Operations and Physical lenses.

### Milestone B — Network depth

- interfaces and link aggregation;
- Layer 2 and Layer 3 lenses;
- edge inspection;
- path comparison;
- search and semantic zoom.

### Milestone C — Operational intelligence

- dependency model;
- articulation/redundancy analysis;
- incident subgraph;
- root-cause evidence;
- protected/at-risk blast radius.

### Milestone D — Time and scale

- topology history;
- compare and replay;
- discovery tray;
- clustering;
- multi-site estate view.

---

## 15. Authoritative References

- IETF RFC 8345, *A YANG Data Model for Network Topologies*: base networks, nodes, links, termination points, underlay/overlay mappings, and stable identifiers.
- IETF RFC 8346, *A YANG Data Model for Layer 3 Topologies*: Layer 3 augmentation of the base topology.
- IETF RFC 8944, *A YANG Data Model for Layer 2 Network Topologies*: Layer 2 augmentation of the base topology.
- IETF RFC 8795, *YANG Data Model for Traffic Engineering Topologies*: directional TE links, termination points, bandwidth, resources, and multi-layer topology.
- NIST SP 800-82 Rev. 3, *Guide to Operational Technology Security*: OT topology, segmentation, isolation, mapped data flows, functional levels, and DMZ boundaries.
- ANSI/ISA-62443-3-2: partitioning an industrial automation and control system into security zones and conduits.
- Cisco Industrial Automation design guides: practical mapping between Purdue functional levels and industrial core, distribution, cell/area, control, and process environments.
- Cytoscape.js documentation: compound nodes, hierarchical layouts, element state, viewport control, and incremental graph operations.
- W3C WCAG 2.2 guidance for Use of Color and Non-text Contrast: diagram state must remain understandable without color alone.
