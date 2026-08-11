# NetSense Architecture

> **Implementation status (2026-08-11):** The repository currently implements
> the React Atlas frontend, portable contracts, and an authenticated Python API
> with a PostgreSQL repository, forced tenant RLS, durable incident workflow,
> an append-only action audit, ordered topology snapshot ingestion, and an
> opt-in live Atlas topology adapter. The physical probe, event processing,
> metric storage, streaming, production identity, and deployment components
> below remain approved target architecture, not shipped code. See
> `docs/product/full-product-rollout-v1.md` for the verified rollout boundary.

NetSense is designed as a passive network monitoring platform for converged IT and OT environments. It uses a lightweight probe to capture mirrored traffic, a platform service to normalise and store events, and a web dashboard for visualization and incident management.

The system exists to deliver the customer outcomes and service proof gates in
the [NetSense Service Delivery Charter](product/service-delivery-charter-v1.md).
Architecture components are not considered product capabilities until their
live evidence, safety, failure, and operational gates have passed.

## Key Components

- **Probe:** Go-based single binary that captures traffic via libpcap, normalises protocol data, applies baselines, and forwards events to the platform.
- **Platform:** Python API validates contracts, JWT identity, tenant scope,
  roles, topology ingestion order, and incident transitions. PostgreSQL
  persists topology, per-probe ingestion state, and incident state with forced
  RLS and append-only workflow actions. TimescaleDB metrics, event processing,
  and PCAP audit persistence remain planned.
- **Frontend:** React dashboard with topology, incident logs, alert feed, and forensic replay.
- **Storage:** TimescaleDB hypertables for metrics and PostgreSQL relational tables for devices, users, incidents, and configuration.
- **Communication:** WireGuard secures probe-to-platform traffic, with role-based API access for users.

## Deployment Models

- Model 1: On-premises probe and platform.
- Model 2: Platform in cloud, probe on-prem.
- Model 3: Multi-site platform with multiple probes.
- Model 4: SaaS with multi-tenant isolation.

## Design Principles

- **Passive-first:** No active scanning of OT devices unless explicitly whitelisted.
- **Single-binary probe:** Minimal dependencies for air-gapped and constrained hardware.
- **Confidence-weighted baselines:** Alerts from day zero with uncertainty metadata.
- **Encrypted forensics:** Triggered PCAPs encrypted at rest and access-controlled.
- **Modular plugin architecture:** New protocol support added through collector plugins.
