# NetSense Documentation

NetSense is being built as a cross-industry network reasoning platform. Its
goal is to explain what is observed, how entities are connected, what may be
wrong, what depends on it, and which evidence supports the conclusion. It does
not claim complete visibility when monitoring coverage or evidence is partial.

## Where to Start

| You are... | Start here |
|------------|------------|
| New to the project, want to understand what we're building | [architecture.md](architecture.md) |
| About to write code, need to set up your environment | [developer/getting-started.md](developer/getting-started.md) |
| Reviewing what is implemented versus planned | [product/full-product-rollout-v1.md](product/full-product-rollout-v1.md) |
| Designing a feature, need the specification template | [rfcs/RFC-template.md](rfcs/RFC-template.md) |
| Reviewing a major decision, need context | [adr/](adr/) |
| Deploying NetSense for a customer | [operator/deployment-guide.md](operator/deployment-guide.md) |
| Installing the hardware probe | [operator/hardware-installation.md](operator/hardware-installation.md) |
| Using the dashboard | [user/user-manual.md](user/user-manual.md) |
| Setting up for the first time | [user/quick-start.md](user/quick-start.md) |
| Responding to an incident | [runbooks/incident-response.md](runbooks/incident-response.md) |
| Understanding a term | [user/glossary.md](user/glossary.md) |

## Project Status

**Current phase:** Atlas frontend rollout; platform and probe remain planned.

**Current version:** 0.0.0 (pre-release)

**Next milestone:** Complete Atlas contracts and hardening, then begin the
platform as a separate contract-driven workstream.

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
