# NetSense — Technology Roadmap

| Decision | Current Choice | When to Revisit | Trigger |
|----------|---------------|-----------------|---------|
| Probe language | Go 1.22 | Phase 5 (v1.0.0) | If gopcua is not production-ready, consider Python sidecar for OPC-UA only |
| Time-series DB | TimescaleDB (community) | Phase 4 (before SaaS) | Verify TSL restrictions on managed service. If needed, switch to pure PostgreSQL partitioning or get commercial license |
| Topology graph | NetworkX (Python) | Phase 5 | If platform scaling requires, consider moving graph to in-memory Go service for low-latency queries |
| Incident memory | JSONB + GIN index | Phase 4 (post 10k incidents) | If cosine similarity search becomes slow, migrate to pgvector extension |
| Bayesian engine | Phase 5 (EXPERIMENTAL) | Post-v1.0 (6 months of data) | Validate if Bayesian output adds value over deterministic + incident memory. If not, deprecate. |
| Dashboard | React 18 + Cytoscape.js | Phase 4 | If topology exceeds 500 nodes regularly, evaluate WebGL-based renderer (sigma.js) for performance |
| PCAP encryption | AES-256-GCM, key rotation | Annually | Audit key management against compliance requirements |