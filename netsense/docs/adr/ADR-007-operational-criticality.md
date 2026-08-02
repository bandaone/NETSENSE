# ADR-007: Operational Criticality Semantics

**Status:** Accepted for Atlas v1

**Date:** 2026-08-02

## Context

FR-TOP-004 defines `1` as critical and `5` as non-critical, while the dashboard
prototype uses higher values for larger, more important nodes and star ratings.
The unqualified name `criticality` is also easy to confuse with operational
health, incident severity, evidence confidence, or monitoring coverage.

The Atlas contract needs one unambiguous interpretation before typed fixtures
or API adapters are introduced.

## Decision

The field is named `operationalCriticality` and has these semantics:

| Value | Meaning |
|---:|---|
| 1 | Low |
| 2 | Moderate |
| 3 | Important |
| 4 | High |
| 5 | Mission-critical |

Operational criticality is independent of:

- operational health;
- alert or incident severity;
- evidence confidence;
- observation freshness;
- monitoring coverage;
- management state.

It may contribute to prioritisation, but it never determines whether an entity
is healthy, reachable, well observed, or affected by an incident.

## Migration

- Atlas schemas reject the legacy unqualified `criticality` field.
- Synthetic fixtures use `operationalCriticality`.
- Unknown persisted values must not be automatically inverted. A future API
  migration must identify the source semantics before conversion.
- The topology requirement and RFC are updated only after this ADR.
- Visual size may reflect stable structural role, but status changes and live
  metrics must not continuously resize nodes.

## Consequences

- Higher values consistently mean greater operational importance.
- UI labels, sorting, tests, and future API contracts share one interpretation.
- Existing prototype fixtures require explicit migration.
- Incident severity remains a separate concept and scale.
