# NetSense Architecture

> **Implementation status (2026-08-09):** The repository currently implements
> the React Atlas frontend and contract documentation. The probe, platform,
> storage, and deployment components below are the approved target
> architecture, not shipped code. See
> `docs/product/full-product-rollout-v1.md` for the verified rollout boundary.

NetSense is designed as a passive network monitoring platform for converged IT and OT environments. It uses a lightweight probe to capture mirrored traffic, a platform service to normalise and store events, and a web dashboard for visualization and incident management.

## Key Components

- **Probe:** Go-based single binary that captures traffic via libpcap, normalises protocol data, applies baselines, and forwards events to the platform.
- **Platform:** Python/TimescaleDB backend that stores devices, metrics, incidents, and audit logs.
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
