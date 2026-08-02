# NetSense Documentation

NetSense is a network monitoring platform that gives any organisation—a mine, a hospital, a bank, a manufacturer, an office—complete visibility into their network: what is on it, how it is connected, when something is wrong, why it is wrong, and what will happen if it is not fixed.

## Where to Start

| You are... | Start here |
|------------|------------|
| New to the project, want to understand what we're building | [architecture.md](architecture.md) |
| About to write code, need to set up your environment | [developer/getting-started.md](developer/getting-started.md) |
| Designing a feature, need the specification template | [rfcs/RFC-template.md](rfcs/RFC-template.md) |
| Reviewing a major decision, need context | [adr/](adr/) |
| Deploying NetSense for a customer | [operator/deployment-guide.md](operator/deployment-guide.md) |
| Installing the hardware probe | [operator/hardware-installation.md](operator/hardware-installation.md) |
| Using the dashboard | [user/user-manual.md](user/user-manual.md) |
| Setting up for the first time | [user/quick-start.md](user/quick-start.md) |
| Responding to an incident | [runbooks/incident-response.md](runbooks/incident-response.md) |
| Understanding a term | [user/glossary.md](user/glossary.md) |

## Project Status

**Current phase:** Phase 0 — Foundation (documentation and pre-build validation)
**Current version:** 0.0.0 (pre-release)
**Next milestone:** Phase 1 — gopacket capture loop validated on hardware

## Documentation Structure

- `architecture.md` — Complete system design
- `hardware-design.md` — Probe hardware specifications (IT-100, OT-100, Pi-5)
- `engineering-methodology.md` — How we build (ADRs, RFCs, CI/CD, testing)
- `literature-review.md` — Academic and competitive landscape
- `product/` — Requirements, UX research, test plans
- `adr/` — Architecture Decision Records
- `rfcs/` — Engineering specifications for each subsystem
- `contracts/` — API and data contracts (OpenAPI, JSON Schema)
- `roadmap/` — Strategy, technology, and release roadmaps
- `metrics/` — Success metrics, SLOs, KPIs
- `standards/` — Compliance, coding, and data standards
- `user/` — End-user documentation
- `operator/` — System operator documentation
- `developer/` — Developer guides
- `runbooks/` — Operational incident response procedures
- `releases/` — Changelog and release notes