# NetSense — Service Level Objectives

These apply to Model 4 (SaaS) and serve as internal targets for all models.

| Service | SLO | Measurement Window | Measurement Method |
|---------|-----|-------------------|-------------------|
| **Data freshness** | 99% of events appear in dashboard within 1 minute | 30 days | Event timestamp vs. display time |
| **Alert delivery** | 99.5% of critical alerts delivered (email+SMS) within 60 seconds | 30 days | Alert timestamp vs. delivery confirmation |
| **Dashboard availability** | 99.9% uptime | 30 days | Health check every 30s |
| **API availability** | 99.9% uptime, <500ms p99 latency | 30 days | Synthetic requests every 60s |
| **Data durability** | 99.999% durability (no data loss beyond retention) | Ongoing | Backup verification, replication |
| **PCAP retention** | 100% compliance with configured retention policy | 30 days | Automated audit |
| **Tenant isolation** | Zero cross-tenant data access incidents | Ongoing | Security monitoring |

