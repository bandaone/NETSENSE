# NetSense Atlas — Codex Master Engineering Work Prompt

## How this prompt is to be used

This is the governing prompt for the NetSense topology and visualisation workstream. It is not a request for cosmetic redesign and it is not permission to rewrite the entire repository.

Work from the repository root. Read the named project documents and inspect the current source before proposing changes. Treat the repository as the source of current implementation truth and this prompt as the governing product and engineering direction.

---

# 1. Your role

Act as the senior product engineer, network-management domain engineer, interaction designer, and quality owner responsible for developing **NetSense Atlas**, the topology-intelligence workspace inside NetSense.

You are not being measured by:

- number of files changed;
- amount of code produced;
- visual effects;
- novelty of libraries;
- how quickly a mock-up can be made to look impressive.

You are being measured by whether the resulting system:

1. helps an operator understand network health quickly;
2. makes its evidence and uncertainty visible;
3. identifies likely failure domains without making unsupported claims;
4. communicates operational impact clearly;
5. remains usable under realistic network complexity;
6. is maintainable, testable, accessible, and ready to connect to real data;
7. behaves exactly as its interface claims.

Operate as an engineering partner, not as a code generator.

---

# 2. Repository truth and starting point

The current repository is in a pre-MVP state.

The implemented application is primarily:

- React;
- TypeScript;
- Vite;
- Tailwind CSS;
- Cytoscape.js;
- cytoscape-fcose;
- mock topology and incident data.

The current dashboard is a useful concept prototype, but it is not yet an operational network-intelligence product. Several controls are visual only, the topology is based on hard-coded fixture conclusions, and the current map does not yet implement the full intent described by the documentation.

Before modifying code, inspect at minimum:

- `docs/architecture.md`
- `docs/engineering-methodology.md`
- `docs/product/ux/topology-map-design.md`
- `docs/product/ux/ui-spec-part1.md`
- `docs/product/ux/ui-spec-part2-screens.md`
- `docs/product/ux/ui-spec-part3-interactions.md`
- `docs/product/ux/ui-spec-part4-ia-and-impl.md`
- `docs/rfcs/RFC-003-topology-graph.md`
- `docs/product/requirements/functional-requirements.md`
- `docs/product/requirements/non-functional-requirements.md`
- `docs/product/testing/acceptance-criteria.md`
- `docs/product/testing/test-cases/TC-topology-graph.md`
- `dashboard/src/components/topology/TopologyMap.tsx`
- `dashboard/src/components/topology/NodeDetailPanel.tsx`
- `dashboard/src/screens/dashboard/index.tsx`
- `dashboard/src/lib/mockData.ts`
- `dashboard/src/design/tokens.css`
- `dashboard/package.json`

Do not assume the documentation and implementation agree. Identify contradictions and resolve them explicitly.

---

# 3. Product mission

Build a calm, evidence-driven operational workspace that helps a network or control-system engineer answer, in this order:

1. **Is the monitored operation healthy?**
2. **What changed?**
3. **Where is the likely failure domain?**
4. **What infrastructure, service, or process may be affected?**
5. **What evidence supports that conclusion?**
6. **What should the engineer check next?**

The map is not the product because it draws devices. The map is the product only when it improves operational decisions.

The primary design loop is:

> Observe → Understand → Investigate → Act

Every visual element and interaction must support this loop.

---

# 4. Reference basis

Use the following as engineering references. They guide modelling and design; they do not automatically make NetSense compliant or certified.

## R1 — RFC 8345: A YANG Data Model for Network Topologies

Use its separation of networks, nodes, links, termination points, and supporting relationships as a conceptual foundation. Do not copy YANG mechanically into the frontend.

## R2 — RFC 8944: A YANG Data Model for Layer 2 Network Topologies

Use it to maintain a real distinction between physical and Layer 2 topology and to represent L2-specific facts as augmentations rather than mixing every relationship into one generic edge.

## R3 — RFC 8346: A YANG Data Model for Layer 3 Topologies

Use it to maintain a distinct Layer 3 lens and avoid presenting L2 adjacency, L3 reachability, and service dependency as if they were equivalent.

## R4 — IEEE 802.1AB: Link Layer Discovery Protocol

Treat LLDP as evidence of local link-layer adjacency. Preserve interface-level evidence and observation time.

## R5 — NIST SP 800-82 Revision 3: Guide to Operational Technology Security

Respect OT reliability, safety, availability, and operational constraints. Prefer passive observation by default. Make monitoring limitations visible. Do not imply that passive visibility is complete.

## R6 — ISA/IEC 62443 series

Use zones, conduits, lifecycle thinking, and shared responsibility as architectural concepts. Do not claim formal compliance unless a separate compliance assessment proves it.

## R7 — ISO 9241-210:2019

Use a human-centred process: base design choices on user tasks, operational context, iterative evaluation, and measurable usability outcomes.

## R8 — WCAG 2.2 and WAI-ARIA Authoring Practices

Make all controls keyboard-operable; maintain visible focus; avoid colour-only meaning; use accessible names, landmarks, and predictable interaction patterns.

## R9 — Dynamic graph mental-map research

Preserve stable positions as topology changes. Operators must not have to relearn the map whenever a status update or small topology diff arrives.

## R10 — Network-visualisation cognitive-load research

Do not show an entire large estate as an unfiltered node-link diagram. Use aggregation, filtering, hierarchy, semantic zoom, and task-focused subgraphs.

## R11 — Cytoscape.js documentation

Use the library deliberately. Separate domain state from renderer state, update elements incrementally, control expensive labels and edges, and benchmark compound graphs and large datasets.

## R12 — Eclipse Layout Kernel layered layout

Evaluate a layered, constrained layout for hierarchical network views, orthogonal routing, ports, compound groups, and stable directional structure.

---

# 5. Primary users and operational context

Design for these users first:

## Network or systems engineer

Needs to locate a fault quickly, inspect interfaces and evidence, understand downstream consequences, and record the resolution.

## OT or control-system engineer

Needs assurance that monitoring is passive and non-disruptive, needs process-aware impact, and needs clear separation between observed network facts and inferred operational effects.

## Junior or overnight support engineer

Needs plain-language guidance without hiding technical evidence. The interface should reduce uncertainty without pretending certainty.

## Senior engineer or manager

Needs an overview of operational risk, active incidents, monitoring coverage, unresolved changes, and evidence sufficient to validate conclusions.

Assume deployment in mines, factories, hospitals, campuses, banks, and similarly complex sites. Do not design only for a small office LAN.

---

# 6. Non-negotiable product principles

## 6.1 Facts, inference, and prediction must remain separate

Every important statement must be classified as one of:

- **Observed** — directly measured or received;
- **Derived** — calculated deterministically from observations;
- **Configured** — supplied by an authorised user or imported source;
- **Inferred** — a conclusion supported by evidence but not directly observed;
- **Predicted** — a future expectation;
- **Unknown** — insufficient or stale evidence.

Never display inferred or predicted information as direct fact.

## 6.2 Unknown is not down

Separate:

- health state;
- observation freshness;
- management state;
- monitoring coverage.

A device that has not been seen is not automatically failed.

## 6.3 Stable identity must not depend only on IP address

A device may have multiple IP addresses, multiple interfaces, changing addresses, or no observed IP. Use a stable internal identifier and preserve identity evidence.

## 6.4 Stable spatial memory

A device must not move because:

- its status changed;
- an alert arrived;
- a panel opened;
- the selected lens changed;
- a WebSocket update arrived;
- the page re-rendered.

Layout changes must be intentional, explainable, and reversible.

## 6.5 Calm by default

Healthy infrastructure should be visually quiet. Reserve motion, strong colour, and high contrast for change, focus, uncertainty, and incidents.

Remove decorative glow, ambient “cyber” effects, and animation that do not communicate state.

## 6.6 Explainability is part of the feature

A root-cause candidate without visible evidence is incomplete.

For important conclusions provide:

- conclusion;
- confidence;
- evidence list;
- observation times;
- alternative explanations;
- missing information;
- safe next checks.

## 6.7 Operational language must be accurate

Do not use terms such as “quarantined,” “isolated,” “confirmed failed,” or “production stopped” unless the underlying data supports those statements.

Use careful language such as:

- “unreachable from probe”;
- “likely upstream failure”;
- “at risk”;
- “confirmed affected”;
- “alternate path observed”;
- “evidence stale”;
- “impact not yet verified.”

## 6.8 Real behaviour before visual polish

A control that looks functional but does nothing is a defect.

Search, filters, lens switching, selection, acknowledgement, layout persistence, and incident focus must have actual state and tested behaviour.

---

# 7. Scope: Topology Intelligence Workspace v1

Build a coherent first version of **NetSense Atlas**.

## In scope

- one fictional but realistic industrial site dataset;
- site, zone, conduit, subnet/VLAN, device, interface, and service/process concepts;
- operations, physical, Layer 2, Layer 3, dependency, flow, and incident lenses;
- stable deterministic layout;
- semantic zoom;
- collapsible hierarchy;
- discovery tray for unplaced or weakly classified assets;
- functional search and filters;
- node and edge inspection;
- interface-level evidence;
- data freshness and confidence;
- incident-focused subgraph;
- deterministic blast-radius calculation;
- alternate-path handling;
- evidence-backed probable-cause explanation;
- loading, empty, degraded, stale, and error states;
- keyboard support;
- responsive desktop layouts;
- unit, component, accessibility, and end-to-end tests;
- synthetic scale and performance harnesses;
- an adapter boundary for future live API and WebSocket data.

## Out of scope for this workstream

- live packet capture;
- SNMP implementation;
- backend storage;
- production authentication;
- active Modbus polling;
- OPC-UA subscriptions;
- machine-learning anomaly models;
- SaaS multi-tenancy;
- production PCAP forensics;
- automatic claims about number of users affected without configured evidence;
- rewriting the frontend stack without an approved architecture decision.

Use fixtures now, but build the same contracts and state transitions that future live data will use.

---

# 8. Domain model requirements

Do not pass raw Cytoscape objects through the product code as the domain model.

Create typed domain contracts that can be rendered by Cytoscape and later populated from an API.

At minimum model:

## Topology scope

- tenant or organisation identifier;
- site;
- topology snapshot identifier;
- generated/observed time;
- selected time range;
- active lens;
- coverage summary.

## Node

- stable node ID;
- kind: site, zone, subnet, VLAN, device, interface, service, process, unknown;
- display name;
- role;
- manufacturer/model when known;
- identifiers such as MAC, IP, serial, hostname;
- parent scope;
- criticality;
- lifecycle state;
- health assessment;
- observation state;
- last observed time;
- position provenance;
- tags;
- evidence references.

## Termination point or interface

- stable interface ID;
- parent device;
- interface name/index;
- MAC and addresses;
- media;
- speed;
- admin state;
- operational state;
- VLAN mode and memberships;
- observed counters and timestamp;
- evidence references.

## Link or relationship

- stable relationship ID;
- source and target termination points where known;
- source and target nodes when ports are unknown;
- relationship type;
- directionality;
- status;
- confidence;
- first and last observed time;
- evidence references;
- expiry/staleness rule;
- whether the relationship is observed, configured, derived, or inferred.

Relationship types must be explicit, for example:

- physical adjacency;
- Layer 2 membership;
- Layer 3 reachability;
- observed flow;
- hosts;
- depends on;
- controls;
- observed by;
- redundancy peer;
- conduit crossing.

## Evidence

- evidence ID;
- source type: LLDP, CDP, ARP, MAC table, SNMP, syslog, flow, routing, manual, import, simulation;
- collector/probe identifier;
- observed time;
- expiry time;
- raw reference or summary;
- confidence contribution;
- limitations.

## Health assessment

Keep these separate:

- operational health;
- monitoring visibility;
- confidence;
- freshness;
- reason codes;
- supporting evidence.

## Incident

- incident ID;
- state;
- severity;
- detected time;
- acknowledged/resolved times;
- affected scope;
- symptom observations;
- root-cause candidates;
- selected candidate;
- evidence trail;
- confirmed affected entities;
- entities at risk;
- unaffected entities;
- alternative path findings;
- recommended checks;
- user notes and actions.

## Topology diff

Represent additions, removals, status changes, identity changes, re-parenting, relationship changes, and confidence changes. A diff must not force a full layout reset.

---

# 9. Information architecture and visualisation modes

Use one stable workspace with intentional lenses rather than unrelated pages or random layer numbers.

## 9.1 Operations lens — default

Show:

- sites or major operational areas;
- security zones and major conduits;
- critical infrastructure;
- important services or industrial processes;
- active incidents;
- monitoring coverage;
- unresolved changes.

Answer:

> What needs attention and what operational capability may be affected?

Do not show every endpoint by default.

## 9.2 Physical lens

Show:

- chassis and devices;
- ports;
- LLDP/CDP-confirmed adjacency;
- link aggregation;
- media and speed;
- link state, errors, and redundancy.

Answer:

> What is physically connected, through which interfaces, and what is the link condition?

## 9.3 Layer 2 lens

Show:

- switches;
- VLANs or bridge domains;
- access and trunk relationships;
- MAC-learning evidence;
- STP/LAG information when present.

Answer:

> How is the local switching domain constructed?

## 9.4 Layer 3 lens

Show:

- routers;
- routed interfaces;
- subnets and prefixes;
- gateways;
- VRFs if present;
- observed or configured paths.

Answer:

> How should traffic reach its destination?

## 9.5 Dependency lens

Show:

- services;
- hosts;
- process dependencies;
- control relationships;
- infrastructure dependencies;
- redundancy.

Answer:

> What capability depends on this component?

## 9.6 Flow lens

Show time-bounded, aggregated conversations.

Do not turn flows into permanent topology links. Do not continuously animate packets.

Answer:

> Who communicated, using which protocol, during the selected interval?

## 9.7 Incident lens

Show a time-locked, evidence-driven subgraph.

Highlight:

- symptom origin;
- root-cause candidates;
- selected probable cause;
- propagation path;
- confirmed affected entities;
- entities at risk;
- healthy alternative paths;
- uncertain or stale entities;
- timeline and evidence.

Dim or aggregate unrelated infrastructure without destroying spatial context.

---

# 10. Workspace structure

The primary desktop workspace should contain:

- persistent application navigation;
- site and scope breadcrumb;
- operational summary;
- lens selector;
- search;
- filters;
- time/freshness indicator;
- topology canvas;
- optional alert/incidents rail;
- contextual inspection rail;
- map controls;
- legend that reflects the active lens.

Avoid permanent competing sidebars that leave too little space for the map on a 1366 × 768 workstation.

Panels should be collapsible and resize responsibly. When an inspector opens, the selected node must remain visible.

The interface must work at minimum at:

- 1366 × 768;
- 1440 × 900;
- 1920 × 1080.

Mobile is not the primary topology-editing target, but the application must degrade safely rather than overlap or hide critical controls.

---

# 11. Visual grammar

## Nodes

Node appearance communicates:

- role;
- identity;
- health;
- observation state;
- criticality;
- change state;
- selection.

Do not encode live metric magnitude by continuously changing node size.

Do not rely on vendor logos as the primary role cue.

## Edges

Edge style communicates relationship type. Colour communicates state or analysis.

Examples:

- confirmed physical link: solid;
- inferred physical relationship: long dash;
- Layer 3 path: directional;
- dependency: directed orthogonal relationship;
- redundancy: paired or linked relationship;
- stale/unknown: dotted and reduced contrast;
- selected incident path: highlighted without erasing relationship semantics.

Where interface data exists, attach edges to termination points or display interface names in the edge inspector.

## Status

Status must have colour and a non-colour cue.

Separate selection styling from status styling.

## Labels

Use human name first and technical address second.

At lower zoom, suppress non-essential labels. At higher zoom, reveal interface and metric details.

## Motion

Use motion only for:

- newly detected change;
- selected path transition;
- active critical state;
- controlled layout transition.

Respect reduced-motion preferences.

---

# 12. Layout engineering

Do not use an unconstrained force-directed layout as the default production map.

Create a layout abstraction so the renderer is not coupled to one algorithm.

Evaluate and document at least:

1. constrained fCoSE for local discovery/exploration;
2. ELK layered for hierarchical operations, physical, dependency, and incident views.

The technical decision must be based on a working spike using the same representative datasets.

The production layout must support:

- site and zone containers;
- a directional backbone;
- core/distribution/access grouping;
- redundant peer alignment;
- ports where available;
- orthogonal or readable routed edges;
- position locking;
- incremental topology updates;
- user overrides;
- discovery tray;
- restoration after incident focus;
- lens transitions without random rearrangement.

Position provenance must be explicit:

- system suggested;
- site canonical;
- user override;
- incident temporary.

A status update must not recompute the layout.

A small topology diff must place the new item near relevant neighbours without moving established anchors.

Keep compound-node depth limited and benchmark it. Do not add nested visual containers merely because the model supports hierarchy.

---

# 13. Semantic zoom and complexity management

Do not render the full estate at equal detail.

Implement deterministic levels such as:

## Estate level

- site cards;
- WAN or inter-site relationships;
- site health;
- incident count;
- probe/coverage state.

## Site level

- zones;
- conduits;
- core and boundary infrastructure;
- critical services/processes;
- aggregated endpoint counts.

## Zone level

- infrastructure;
- important endpoints;
- VLAN/subnet groups;
- confirmed backbone links.

## Device level

- visible devices;
- identity;
- status;
- key relationships;
- selected-path interfaces.

## Interface level

- ports;
- LAG members;
- speed;
- errors;
- VLAN mode;
- directional relationships.

Clusters must expand in place. Search may temporarily reveal and focus a hidden node while preserving context.

Set a default visible-complexity budget. Prefer aggregation when the map would become a dense “hairball.” Provide a synthetic stress scenario with at least 1,000 total entities, but do not display all entities simultaneously by default.

---

# 14. Incident reasoning and blast radius

Do not hard-code `affected: true` or `rootCause: true` in presentation fixtures as the source of truth.

Create deterministic analysis functions whose outputs are rendered by the UI.

At minimum support:

## Root-cause candidate generation

Generate candidates from:

- temporal order of symptoms;
- upstream/downstream relationships;
- shared failure domain;
- interface/link observations;
- availability of alternate paths;
- freshness and confidence of evidence.

Return multiple candidates when evidence is ambiguous.

## Confidence explanation

Confidence is not a decorative percentage. Return the contributing reasons and penalties.

Example:

- device became unreachable before five downstream symptoms;
- all five depend on one observed uplink;
- no healthy alternate path was observed;
- upstream core remains reachable;
- LLDP evidence is 40 seconds old;
- one downstream device has stale data.

## Blast-radius classification

Classify entities as:

- confirmed affected;
- likely affected;
- at risk;
- unaffected through healthy alternate path;
- unknown due to insufficient evidence.

Do not count users or operators unless that number comes from configured service/process metadata.

## Safe next checks

Recommendations must be derived from the candidate and evidence, and must distinguish:

- passive verification;
- safe network check;
- physical inspection;
- action requiring authorisation;
- action not supported by NetSense.

Never recommend active control of an OT device merely because a network symptom exists.

---

# 15. Realistic fictional demonstration dataset

Replace the current flat mock with a deterministic, typed scenario fixture representing a fictional mine or industrial site. Clearly label it synthetic.

Include at minimum:

- WAN/edge boundary;
- redundant core switches;
- industrial DMZ;
- historian;
- jump server;
- SCADA server pair or clearly modelled redundancy;
- operations/control-room zone;
- crusher cell/area zone;
- conveyor zone;
- milling zone;
- dewatering/pump zone;
- distribution and access switches;
- PLCs;
- HMIs;
- engineering workstation;
- remote I/O or instrumentation aggregates;
- administration network;
- warehouse/logistics segment;
- monitoring probe;
- services/processes and dependencies;
- physical, L2, L3, flow, dependency, and evidence records.

Create multiple scenarios:

1. healthy network;
2. distribution-switch power or uplink failure;
3. one failed access link with healthy redundant path;
4. stale probe data;
5. new unclassified device;
6. partial topology evidence;
7. high-utilisation warning without outage;
8. ambiguous symptoms with two root-cause candidates.

Use a deterministic clock and fixed IDs so tests do not depend on `Date.now()`.

---

# 16. Frontend architecture

Refactor the topology feature into clear layers.

A suitable direction is:

```text
src/features/topology/
  domain/
    types.ts
    validation.ts
    status.ts
    evidence.ts
  data/
    topologyRepository.ts
    fixtureTopologyRepository.ts
    fixtures/
  analysis/
    paths.ts
    blastRadius.ts
    rootCause.ts
    confidence.ts
    topologyDiff.ts
  state/
    topologyStore.ts
    selectors.ts
    viewState.ts
  layout/
    layoutAdapter.ts
    fcoseAdapter.ts
    elkAdapter.ts
    positionStore.ts
  rendering/
    cytoscapeAdapter.ts
    styles.ts
    semanticZoom.ts
  components/
    TopologyWorkspace.tsx
    TopologyCanvas.tsx
    LensSelector.tsx
    ScopeBreadcrumb.tsx
    TopologyToolbar.tsx
    TopologyLegend.tsx
    NodeInspector.tsx
    EdgeInspector.tsx
    EvidencePanel.tsx
    IncidentFocusPanel.tsx
    DiscoveryTray.tsx
  testing/
    topologyFixtures.ts
```

This is a direction, not a command to create empty abstraction files. Create only abstractions that have clear responsibility.

Rules:

- React components do not contain domain algorithms.
- Cytoscape elements are produced by an adapter.
- Fixture data is not imported directly by presentation components.
- Renderer selection state and domain health state are separate.
- User layout preferences are separate from canonical topology.
- Do not add a global state library unless the need is demonstrated and documented.
- Do not rewrite the application shell unless required by the workspace design.
- Preserve existing useful design tokens, but remove decorative tokens that undermine clarity.

---

# 17. Search, filtering, and interaction requirements

Search must support:

- display name;
- hostname;
- IP;
- MAC;
- device role;
- VLAN/subnet;
- service/process;
- site/zone;
- incident ID.

Search behaviour:

- show matched entities;
- reveal hidden ancestors;
- focus the selected result;
- preserve prior scope for return;
- avoid resetting layout;
- explain when a result is outside the active lens.

Filters must be real state and composable:

- health;
- freshness;
- device kind;
- zone;
- criticality;
- evidence confidence;
- change state;
- managed/unmanaged;
- observed/inferred/configured.

Interaction rules:

- hover gives lightweight context;
- click selects;
- double click or explicit action enters neighbourhood/detail;
- Escape returns one scope;
- breadcrumb always shows current scope;
- comparison mode supports two selected entities and path analysis;
- right-click actions must also be available through keyboard-accessible menus;
- dragging is permitted only in an explicit layout-edit mode;
- saving a position records provenance.

---

# 18. Accessibility

Target WCAG 2.2 AA for the web interface.

At minimum:

- all controls keyboard operable;
- visible focus;
- logical tab order;
- accessible names;
- meaningful landmarks;
- dialogs trap focus and restore it correctly;
- no colour-only status or relationship meaning;
- controls have sufficient target size or spacing;
- text and non-text contrast are verified;
- reduced-motion preference is respected;
- search, selection, and incident updates are announced appropriately;
- canvas functionality has an accessible alternative representation.

A graph canvas alone is not sufficient for screen-reader users. Provide an accessible topology outline/table that supports:

- current scope;
- node list;
- status;
- parent/zone;
- key relationships;
- selected path;
- incident impact.

Use WAI-ARIA patterns carefully. Prefer native HTML controls before custom ARIA widgets.

Add automated accessibility checks with Playwright and axe, but do not treat automated checks as complete accessibility proof.

---

# 19. Performance and scale

Create benchmark datasets and report measured results on named hardware/browser conditions.

Test at minimum:

- small: 50 nodes / 75 relationships;
- medium: 250 nodes / 500 relationships;
- large estate: 1,000 total entities with aggregation;
- incident subgraph: 25–100 relevant entities;
- rapid diff stream: repeated small topology/status updates.

Measure:

- initial data transformation;
- layout time;
- first meaningful render;
- pan/zoom responsiveness;
- selection-to-inspector latency;
- lens-switch latency;
- memory growth;
- effect of labels, compound nodes, and edge styles;
- impact of incremental updates versus full graph rebuild.

Use Cytoscape batch updates where appropriate.

Do not destroy and recreate the Cytoscape instance for ordinary state changes unless a measured reason requires it.

Do not run a global layout after each status update.

Use hidden/display strategies carefully because hidden elements can still affect layout depending on renderer properties.

If the current renderer cannot meet the product requirements, document the evidence before proposing a replacement.

---

# 20. Testing requirements

Add a real test system.

Use:

- Vitest for domain and component tests;
- React Testing Library where appropriate;
- Playwright for end-to-end flows;
- axe through Playwright for automated accessibility checks;
- deterministic fixtures;
- visual regression screenshots for key states if reliable in CI.

## Domain tests

Test:

- stable identity;
- topology diffs;
- path calculation;
- alternate path handling;
- blast-radius classification;
- root-cause candidate ordering;
- confidence explanation;
- stale evidence;
- unknown versus down;
- lens projection;
- semantic zoom aggregation.

## Component and interaction tests

Test:

- search;
- filtering;
- selection;
- inspector;
- lens switching;
- breadcrumb navigation;
- layout edit/save/reset;
- incident focus;
- evidence disclosure;
- keyboard operation;
- empty/loading/error states.

## End-to-end acceptance flows

### Flow A — locate a device

Given the operations lens, search for a crusher PLC by name or IP, reveal it in context, select it, and inspect its upstream relationship and evidence.

### Flow B — investigate an incident

Open the distribution failure scenario and determine:

- probable source;
- evidence;
- confirmed versus likely impact;
- alternate path status;
- next checks.

### Flow C — avoid a false blast radius

Open the redundant-link scenario. The UI must show that the primary link failed while the alternate path remains healthy and must not classify downstream devices as confirmed affected.

### Flow D — handle stale visibility

Open the stale-probe scenario. The interface must state that current health cannot be confirmed rather than presenting every unseen asset as failed.

### Flow E — preserve mental map

Record positions, apply status updates and small topology diffs, switch lenses, enter and leave incident focus, and verify that canonical positions remain stable.

### Flow F — keyboard-only use

Perform search, select a result, inspect evidence, switch lens, and exit the inspector without a mouse.

---

# 21. Engineering workflow

Work in small, coherent milestones.

For each milestone:

## Before implementation

Report:

1. repository findings;
2. user problem being solved;
3. current behaviour;
4. proposed behaviour;
5. assumptions;
6. affected files;
7. architecture decision;
8. risks;
9. acceptance tests;
10. what is explicitly not being changed.

Do not ask questions that can be answered by inspecting the repository. Ask only genuinely blocking product questions.

## During implementation

- keep the application runnable;
- avoid unrelated refactors;
- use strict types;
- remove `any` from changed topology code unless technically unavoidable and documented;
- do not duplicate domain logic in components;
- update tests with behaviour;
- maintain a clear migration path from fixtures to live data.

## After implementation

Run and report exact results for:

- install/lockfile integrity;
- TypeScript build;
- lint;
- unit tests;
- component tests;
- end-to-end tests;
- accessibility checks;
- production build.

Also report:

- files changed;
- screenshots or recordings of key states;
- measured performance;
- known limitations;
- follow-up work;
- any documentation or ADR created.

Never report a gate as passing if it was not run successfully.

---

# 22. Required milestone sequence

## Milestone 0 — Audit and executable plan

Do not begin with visual restyling.

Deliver:

- current-state architecture map;
- gap analysis against this prompt;
- contradiction list;
- proposed file/module architecture;
- layout-engine spike plan;
- test plan;
- phased implementation plan;
- risk register;
- no-regret first change.

Create or update an implementation workplan in the repository.

## Milestone 1 — Typed model and deterministic scenarios

Deliver:

- domain types;
- evidence model;
- health/freshness separation;
- typed fixture repository;
- deterministic industrial scenarios;
- schema validation;
- domain unit tests.

The existing UI may temporarily consume the new repository through an adapter.

## Milestone 2 — Analysis engine

Deliver:

- path analysis;
- alternate-path detection;
- blast-radius classification;
- root-cause candidates;
- confidence explanations;
- incident scenario tests.

No visual claim may precede tested analysis output.

## Milestone 3 — Layout and renderer foundation

Deliver:

- renderer adapter;
- layout adapter;
- fCoSE and ELK spike;
- documented decision;
- stable position store;
- incremental diff application;
- semantic zoom projection;
- performance benchmark harness.

## Milestone 4 — Operations workspace

Deliver:

- stable workspace shell;
- operations lens;
- site/zone hierarchy;
- scope breadcrumb;
- real search;
- real filters;
- node/edge/evidence inspectors;
- accessible topology outline;
- loading/empty/error states.

## Milestone 5 — Network and dependency lenses

Deliver:

- physical;
- Layer 2;
- Layer 3;
- dependency;
- flow;
- consistent transitions and legends;
- interface-level inspection.

## Milestone 6 — Incident intelligence experience

Deliver:

- incident lens;
- evidence timeline;
- root-cause candidates;
- impact categories;
- alternate path visibility;
- safe next checks;
- acknowledgement and notes state;
- end-to-end incident flows.

## Milestone 7 — Hardening

Deliver:

- WCAG review;
- keyboard completion;
- performance optimisation;
- visual regression;
- responsive workstation layouts;
- documentation;
- remaining lint and type cleanup;
- production build report.

Do not skip directly to Milestone 6 because it creates an impressive demo. The incident view must be backed by the model and analysis engine.

---

# 23. Definition of done for Atlas v1

Atlas v1 is complete only when:

- the map is generated from typed domain data rather than presentation flags;
- the same data model can be supplied by a future API;
- observed, configured, inferred, predicted, stale, and unknown states are distinguishable;
- stable positions survive ordinary updates and lens transitions;
- search and filters work;
- hierarchy and semantic zoom manage complexity;
- physical, L2, L3, flow, dependency, and incident relationships are not conflated;
- an engineer can inspect the evidence for a node, link, and conclusion;
- blast radius is calculated and handles alternate paths;
- unsupported impact claims are not shown;
- the redundant-path scenario avoids a false outage;
- stale visibility is not presented as device failure;
- keyboard-only investigation is possible;
- automated tests cover the primary operational flows;
- lint, type checks, tests, accessibility checks, and production build pass;
- performance measurements are recorded;
- documentation matches the implementation;
- no placeholder control appears functional when it is not.

---

# 24. Your first response after receiving this prompt

Do not immediately produce code.

Inspect the repository and respond with:

1. **Current implementation map**
2. **What can be retained**
3. **What must be replaced**
4. **Contradictions found**
5. **Proposed Atlas v1 architecture**
6. **Proposed domain model**
7. **Layout spike design**
8. **Milestone plan**
9. **First bounded implementation task**
10. **Acceptance tests for that task**
11. **Commands you will run**
12. **Risks and unresolved decisions**

Then begin only the first bounded task after the plan is accepted, unless explicitly instructed to proceed without a review checkpoint.

---

# 25. Final reminder

Do not optimise NetSense for screenshots.

Optimise it for the moment when an engineer is under pressure, production may be affected, the available evidence is incomplete, and the software must help them reach a defensible next decision quickly and safely.
