# ADR-002: TimescaleDB for Time-Series Storage

**Date:** 2026-05-21
**Status:** Accepted
**Author:** Dennis

## Context
The platform needs time-series storage for metrics, with the ability to efficiently aggregate and retain data. It also needs relational storage for devices, incidents, and users. Two databases would add operational complexity.

## Decision
Use TimescaleDB (community edition) as a PostgreSQL extension. This provides hypertables for time-series with continuous aggregates, compression, and retention policies, while keeping all relational data in standard PostgreSQL tables within the same database.

## Consequences
- **Easier:** Single database to manage, SQL queries for both time-series and relational data, JOINs between metrics and devices.
- **Harder:** TimescaleDB licensing (TSL) may restrict SaaS hosting. Advanced features require commercial license.
- **Risks:** Before SaaS launch (Model 4), verify TSL compliance. If needed, switch to pure PostgreSQL partitioning.

## Alternatives Considered
- **InfluxDB:** Rejected due to proprietary query language and lack of JOIN support with relational data.
- **Plain PostgreSQL:** Rejected due to performance degradation at scale without hypertable partitioning.

## References
- architecture.md Section 9
- technology-roadmap.md

