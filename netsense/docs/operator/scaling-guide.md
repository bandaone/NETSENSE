# Scaling Guide

## Single-Site Deployments (Model 1)
No scaling needed. The probe handles up to 1 Gbps mirror traffic on x86 hardware.

## Multi-Site Deployments (Model 3)

### Platform Sizing
| Probes | Devices (total) | Recommended Platform VM |
|--------|-----------------|-------------------------|
| 1-5 | <500 | 4 vCPU, 8 GB RAM, 100 GB SSD |
| 5-20 | 500-2,000 | 8 vCPU, 16 GB RAM, 250 GB SSD |
| 20-50 | 2,000-5,000 | 16 vCPU, 32 GB RAM, 500 GB SSD |
| 50-100 | 5,000-10,000 | 32 vCPU, 64 GB RAM, 1 TB SSD, read replicas |

### Horizontal Scaling
- **API servers:** Add more FastAPI instances behind a load balancer (nginx or cloud LB). Stateless; just scale out.
- **Celery workers:** Increase worker concurrency or add more worker instances.
- **TimescaleDB:** Add read replicas for metric queries. Use connection pooling (pgbouncer).
- **Redis:** Use Redis Sentinel for high availability; shard if needed.

### Storage Growth
- Raw metrics: ~500 MB/day per 100 Mbps probe (with TimescaleDB compression, ~50 MB/day).
- Plan storage accordingly. Retention policies (30 days raw, 1 year aggregated) keep growth linear after 30 days.

## SaaS Deployments (Model 4)
- Multi-tenant platform with tenant ID isolation.
- Each tenant gets a dedicated database schema or row-level security (RLS) enforcement.
- Monitor per-tenant resource usage; implement soft quotas to prevent noisy neighbors.
- Use Kubernetes for orchestration if managing many tenants.

## When to Scale
- API response time p99 > 200ms under normal load.
- TimescaleDB write latency > 100ms.
- Probe connection count approaches platform's tested limit.

