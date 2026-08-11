# NetSense Service Delivery Charter v1

**Status:** Governing product direction

**Applies to:** probe, platform, Atlas, deployment, operations, documentation,
and commercial packaging

**Last reviewed:** 2026-08-12

## Purpose

NetSense exists to give an operator a trustworthy operational model of a
network. From deployed evidence, the system must help answer:

1. What is present and how confidently do we know?
2. How is it connected across physical, logical, flow, and dependency views?
3. Which service, place, team, or process depends on it?
4. What changed, and when?
5. What is affected, what is merely at risk, and what remains unknown?
6. Which evidence supports the conclusion and what is the safe next check?

The concise product promise is:

> Install a NetSense Probe and see what is connected, how critical services
> depend on it, where visibility is incomplete, and what changed.

The map earns attention. Accurate discovery, explainable reasoning, safe
operation, and useful incident memory earn trust and continued payment.

## Product and market boundary

NetSense is a general network evidence and operations platform. The engine
must remain configurable across industries; industry-specific terminology,
protocol support, policies, and reports belong in configuration or bounded
plugins rather than forks of the product.

The initial customer profile is deliberately narrower than the technical
scope: organisations with mixed-vendor networks, approximately 300 to 10,000
connected assets, one or more sites, and a small operations team that lacks a
reliable current topology or a staffed 24-hour NOC. Campuses, hospitals,
distributed commercial estates, financial branch networks, government sites,
and smaller industrial facilities are representative proving environments.

NetSense is not, in its first releases:

- a SIEM, EDR, or full network-detection-and-response replacement;
- an industrial control system or an active control path;
- a universal configuration-management system;
- a mathematical configuration digital twin;
- a substitute for global Internet-path assurance;
- an excuse to present generated text as operational evidence.

## Product structure

- **NetSense Probe** collects permitted evidence at the network edge and
  continues safely through intermittent platform connectivity.
- **NetSense Platform** authenticates, isolates, normalises, stores, reasons
  over, and serves operational state.
- **NetSense Atlas** is the evidence, topology, investigation, and incident
  workspace. Atlas must never manufacture conclusions to complete a visual.
- **NetSense Services** combine the product with deployment, validation,
  review, and support where a customer lacks specialist capacity.

## Service catalogue

### S1 — Network Truth Assessment

A bounded assessment that deploys a probe, discovers the authorised scope,
measures visibility, and produces an evidence-backed current-state report.

Required customer outcomes:

- inventory with stable identity and duplicate/uncertain identity handling;
- physical, Layer 2, Layer 3, and service/dependency findings where evidence
  supports them;
- unmanaged or newly observed entities separated from known assets;
- blind spots, stale evidence, and unsupported relationships made explicit;
- critical paths, redundancy observations, and single points of failure
  described with limitations;
- exportable findings and an agreed correction/reconciliation process.

S1 is deliverable only when the live collection and ingestion path, identity
resolution, evidence provenance, assessment export, and deployment security
gates have passed. A synthetic Atlas demonstration is not an assessment.

### S2 — Continuous Atlas Assurance

A recurring service that maintains the operational model and helps an
operator detect and investigate health, topology, dependency, and change
conditions.

Required customer outcomes:

- continuously refreshed inventory and topology with visible freshness and
  monitoring coverage;
- independent health, freshness, coverage, management, criticality, severity,
  and confidence dimensions;
- meaningful topology and identity change history;
- evidence-backed alert and incident investigation;
- confirmed, likely, at-risk, unaffected, and unknown impact kept distinct;
- alternate paths considered before downstream outages are asserted;
- role-appropriate notifications, audit history, and operational reports.

S2 is deliverable only when live Atlas reads and bounded diff recovery,
metrics, alert delivery, readiness, rate controls, durable workflow, backup,
and target-scale reliability have been verified.

### S3 — Managed Network Intelligence

An optional human service for customers without continuous network-operations
coverage. NetSense personnel review and route evidence; they do not silently
change customer infrastructure.

Required customer outcomes:

- agreed monitoring scope, escalation paths, service hours, and response
  targets;
- human-reviewed triage with evidence and declared uncertainty;
- ordered handover notes and customer-visible audit history;
- periodic coverage, reliability, capacity, and recurring-incident review;
- a clear boundary between observation, advice, approval, and action.

S3 is deliverable only after tenant isolation, role enforcement, notification
routing, operator audit, support runbooks, service-level reporting, and an
on-call process have been exercised in a pilot. The product must not imply a
managed response outside the contracted service window.

### S4 — Passive IT/OT Visibility

A passive-first assessment or continuous service for sensitive, legacy, IoT,
and operational environments.

Required customer outcomes:

- observed devices, roles, protocols, and communication relationships;
- zone and conduit crossings where configured or evidenced;
- unexpected or changed communication surfaced without declaring malicious
  intent from traffic alone;
- explicit capture coverage and protocol-decoding limitations;
- no unapproved active interaction with protected devices.

S4 is deliverable only after target-hardware packet-loss tests, capture
isolation, protocol-parser robustness, OT exclusion enforcement, encrypted
local buffering, and passive safety review. Active collectors remain separate,
explicitly authorised capabilities.

### S5 — Incident Evidence and Replay

A retained incident record that lets an authorised operator reconstruct what
was observed before, during, and after an event.

Required customer outcomes:

- time-bounded topology, metric, event, action, and evidence history;
- probable-cause candidates ranked by deterministic evidence;
- alternative explanations and missing evidence shown;
- related prior incidents and their recorded resolutions;
- exportable incident evidence with chain-of-access information;
- packet evidence only where authorised, encrypted, retained, and audited.

S5 is deliverable only after temporal topology storage, event correlation,
clock-quality handling, retention enforcement, forensic access control,
encryption/key rotation, and replay correctness tests have passed. Fixture
replay demonstrates interaction design; it is not live forensics.

## Capability traceability

| Capability | S1 | S2 | S3 | S4 | S5 |
| --- | :---: | :---: | :---: | :---: | :---: |
| Passive probe and bounded buffer | required | required | supporting | required | required for packet evidence |
| Stable identity and normalisation | required | required | required | required | required |
| Evidence provenance/confidence/freshness | required | required | required | required | required |
| Physical, L2, L3, flow, and dependency graph | required by available evidence | required | required | required by available evidence | required |
| Live Atlas adapter and diff recovery | supporting | required | required | supporting | required |
| Metrics, baselines, and alert delivery | optional | required | required | scope-dependent | required for metric replay |
| Tenant isolation, RBAC, and audit | required for hosted delivery | required | required | required | required |
| Temporal graph and incident memory | snapshot only | required for change | required | change only | required |
| Encrypted, audited packet forensics | optional | optional | optional | optional | required when sold |
| Export and integration boundary | required | required | required | required | required |

This table expresses product dependencies, not current implementation status.
Current status belongs in `full-product-rollout-v1.md` and must not be inferred
from this charter.

## Non-negotiable operating rules

1. Stable identity never depends on IP address alone.
2. Every operational relationship is typed and resolves to existing entities.
3. Important claims expose source, time, confidence, and limitations.
4. Observed, configured, derived, inferred, predicted, and unknown remain
   distinguishable in contracts and presentation.
5. Unknown or stale is not down; reachability is not service health.
6. A healthy alternate path prevents an unsupported confirmed-outage claim.
7. Business or user impact requires configured or observed dependency
   evidence. Names never imply counts or consequences.
8. Passive operation is the default. Active collection is scoped, authorised,
   rate-bounded, auditable, and architecturally unable to issue OT writes.
9. AI may explain validated evidence and assist search. It may not invent
   entities, relationships, causes, impact, or remediation results.
10. The accessible table and evidence record remain usable when graph layout
    or rendering fails.
11. Tenant and role enforcement occur at API and storage boundaries, never
    only in the interface.
12. A feature is not shipped because it looks complete. Its normal, boundary,
    failure, security, and recovery behaviour must be tested.

## Work acceptance test

Every proposed feature, design change, integration, or abstraction must answer
the following before implementation:

1. Which service and customer decision does it improve?
2. Which domain fact or evidence authorises the behaviour?
3. What happens with missing, stale, contradictory, duplicate, or out-of-order
   data?
4. What are the tenant, role, privacy, network-safety, and audit boundaries?
5. How will correctness and customer value be measured?
6. Does it preserve the general engine, or introduce an unjustified
   industry-specific assumption?
7. What is explicitly not implemented after this change?

Work that cannot answer the first question does not enter the product backlog.
Work that cannot answer questions two through five does not enter
implementation. Release notes must distinguish implemented behaviour,
synthetic demonstration, experimental capability, and planned architecture.

## Commercial proof gates

The first paid pilot must prove all of the following on an authorised real
network:

- installation and first useful map without engineering intervention beyond
  the documented deployment service;
- discovery precision and recall against a customer-agreed validation set;
- stable identity across address changes and repeated observations;
- explainable relationships with evidence and freshness;
- safe behaviour during loss of mirror traffic, platform connectivity,
  storage capacity, credentials, and probe power;
- at least one topology/change investigation completed from live evidence;
- an operator can find the affected scope and supporting evidence without
  relying on the development team;
- customer data can be exported and removed according to the agreed policy;
- measured baseline for time-to-detect, time-to-understand, and time-to-resolve
  so later improvement claims are honest.

No marketing claim of automatic discovery, continuous assurance, passive OT
visibility, root cause, blast radius, prediction, or forensics may precede the
corresponding gate.

## Current implementation truth

As of 2026-08-12, Atlas supplies a strong synthetic reference implementation,
portable contracts, deterministic incident reasoning, tested topology
interaction, and an opt-in authenticated live topology adapter. The platform
supplies authenticated tenant-scoped HTTP boundaries, ordered/idempotent
topology snapshot ingestion, and PostgreSQL persistence with forced RLS. The
physical probe, topology-diff streaming, live evidence collectors, metrics,
alert delivery, production identity flow, and forensic capture are not yet
implemented. Consequently, none of S1 through S5 is currently generally
available as a live customer service.

The immediate engineering path is:

1. readiness and rate controls for the snapshot boundary;
2. authenticated topology-diff ingestion and streaming;
3. passive probe capture, normalisation, identity, and durable buffering;
4. live discovery and evidence-backed topology on pilot hardware;
5. metrics, change detection, alert delivery, and incident evidence;
6. production identity, deployment, support, security, and commercial pilot
   gates.
