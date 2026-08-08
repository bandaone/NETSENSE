# NetSense Atlas Engine

Version: 1.0.0

Status: Foundation implemented

## Purpose

Atlas is the topology composition layer between the canonical NetSense domain model and the graph renderer. It produces stable, explainable maps for any organisation without embedding a sector, vendor, protocol, or demonstration scenario into the layout engine.

Atlas does not infer operational truth. Evidence, assessment, criticality, containment, identity and relationships remain in the validated topology snapshot. Atlas projects that truth for a named lens and computes a presentation.

## Processing model

```text
Validated topology snapshot
        ↓
Named lens projection
        ↓
Generic containment and port compiler
        ↓
ELK layered layout worker
        ↓
Stable layout profile
        ↓
Cytoscape presentation adapter
```

The UI thread never performs ELK layout work. Layout profiles remain independent of topology snapshots and are keyed by site, scope and lens.

## Industry-neutral entity grammar

Atlas understands generic entity classes:

- site and location;
- zone;
- subnet and VLAN;
- device;
- service and application;
- workload;
- process and organisational capability;
- user group;
- aggregate;
- unknown entity.

Sector terminology belongs in data or templates. For example, a clinical service, payment service, learning platform and industrial process can all use the same capability and dependency mechanisms without changing Atlas.

## Relationship grammar

Relationship meaning remains independent of evidence basis and current state.

- Type explains what connects two entities.
- Direction explains how the relationship should be read.
- Knowledge kind explains whether it was observed, configured, derived, inferred, predicted or remains unknown.
- Status explains its current assessment.
- Evidence records explain why NetSense is making the assertion.

Physical relationships may terminate on interfaces. The layout compiler converts those interfaces into fixed-side ELK ports. Other relationships terminate on entities.

## Implemented lenses

### Operations

Shows organisational structure, important infrastructure, services and capabilities. Time-bounded traffic is excluded so it cannot masquerade as durable topology.

### Physical

Shows locations, zones, devices, subnets, VLANs, aggregates, unknown entities, physical adjacency, redundancy, conduits and observation infrastructure.

### Dependency

Shows devices, workloads, services, applications, processes, capabilities and user groups connected through hosting, dependency, control and service relationships.

Each lens creates a real graph projection and receives an independent stored layout.

## Layout rules

- Primary composition direction is left to right.
- Containment follows explicit parent relationships.
- Compound groups receive quiet boundaries and internal padding.
- Physical ports use fixed sides.
- Important physical paths receive greater layout priority.
- Routing is orthogonal.
- Existing stored coordinates take precedence during incremental insertion.
- A lens change does not overwrite another lens profile.
- Layout is locked by default.

## Rendering rules

- Healthy entities remain neutral.
- Abnormal health changes the border, not every visual property.
- Entity class is represented by silhouette and glyph.
- Evidence freshness and coverage remain independent markers.
- Selection uses restrained cyan and must not resemble health.
- Selecting an entity preserves one-hop context and quiets unrelated topology.
- Relationship labels appear only at a readable semantic zoom level.
- The active legend is generated from the projected relationships.

## Cross-industry proof

The same projection, compiler, worker and renderer are tested with:

- a synthetic enterprise services campus;
- a synthetic industrial operations site.

No engine branch checks for mines, hospitals, schools, banks, factories, PLCs, medical devices, departments or other sector-specific roles.

## Next increments

- Collapsed group summaries and in-place expansion.
- Persisted user pins and canonical approval workflow.
- Change and incident lenses.
- Relationship selection and evidence inspector.
- Aggregation for 1,000+ total entities.
- Layout performance telemetry and visual regression fixtures.
- Configurable organisation terminology and sector templates.
