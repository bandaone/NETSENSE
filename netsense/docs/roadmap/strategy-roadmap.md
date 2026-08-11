# NetSense — Strategy Roadmap

This roadmap is subordinate to the customer outcomes and proof gates in the
[service delivery charter](../product/service-delivery-charter-v1.md). Dates
are planning targets, not release authority. A release advances only when its
evidence, safety, reliability, and service-delivery gates pass.

## Strategic position

NetSense will not win by being another device monitor or by relying on a
visually impressive topology alone. It will compete as an accessible,
passive-first network evidence and operations platform for mixed-vendor,
resource-constrained organisations.

The technical engine remains cross-industry. Go-to-market begins with a narrow
customer profile and expands only from verified deployments. The first paid
offer is a bounded Network Truth Assessment; recurring revenue follows from
Continuous Atlas Assurance, with Managed Network Intelligence, Passive IT/OT
Visibility, and Incident Evidence and Replay introduced only when their
operational gates pass.

## Outcome-gated sequence

### Gate A — Live network truth

- Complete passive capture, ingestion, normalisation, stable identity, and
  evidence provenance.
- Connect Atlas to authenticated live topology without weakening fixture and
  contract tests.
- Prove discovery accuracy, evidence freshness, failure behaviour, and safe
  deployment on an authorised pilot network.
- Produce a customer-readable assessment export with explicit blind spots.

**Commercial result:** Network Truth Assessment may be piloted.

### Gate B — Continuous operational assurance

- Add durable metrics, topology/change history, baselines, bounded streaming,
  notification delivery, and live incident workflow.
- Prove readiness, rate limits, backup/restore, tenant isolation, scale, and
  recovery from probe/platform disconnection.
- Measure time-to-detect, time-to-understand, alert usefulness, and operator
  success against the pre-NetSense baseline.

**Commercial result:** Continuous Atlas Assurance may be piloted.

### Gate C — Operated service

- Establish escalation policies, human triage, auditable handover, service
  reporting, on-call practice, and customer-visible limitations.
- Exercise support, upgrade, replacement, incident, and disaster-recovery
  runbooks with pilot customers.

**Commercial result:** Managed Network Intelligence may be offered for the
explicitly contracted scope and hours.

### Gate D — Sensitive-network and forensic proof

- Prove passive safety, capture isolation, parser robustness, target-hardware
  loss budgets, OT exclusion, and encrypted local buffering.
- Prove temporal replay, retention, forensic authorisation, access auditing,
  key rotation, and evidence export.

**Commercial result:** Passive IT/OT Visibility and Incident Evidence and
Replay may be offered within their verified protocol and deployment scope.

## Year 1: Foundation and First Deployments
- **Q1 (Months 1-3):** Pursue Gate A. Test on simulated and authorised real
  networks. Deploy to the first design partner only after the safety and data
  handling review.
- **Q2 (Months 4-6):** Pursue Gate B. Expand to as many as 5 paid pilots only
  after Gate A remains healthy. Gather evidence, refine operations and UX, and
  establish support processes.
- **Q3 (Months 7-9):** Focus on a verified regional customer profile rather
  than a hard-coded product vertical. Target 10-15 deployments only if Gates A
  and B remain healthy. Build evidence-based case studies and begin MSP
  partnerships.
- **Q4 (Months 10-12):** Consider regional expansion and multi-tenant SaaS
  only after deployment, isolation, support, and recovery evidence justifies
  it. Growth targets must not override service gates.

## Year 2: Multi-Site and Productisation
- Multi-site dashboard improvements
- MSP-specific features (white-label reporting, bulk operations)
- OPC-UA and Modbus enhancements based on OT customer feedback
- Hardware probe v2 with 5G and satellite backhaul options
- Begin exploring security monitoring add-on (not core)

## Year 3: Scale and Ecosystem
- AI/ML enhancements (deep learning on incident patterns)
- Integration APIs for third-party tools (ServiceNow, PagerDuty)
- Regional offices or distributor network
- Possible exit or continued growth

## Explicit Non-Goals (Year 1-2)
- We will NOT become a security monitoring platform. Security features are add-ons, not core.
- We will NOT support real-time industrial control. NetSense is out-of-band.
- We will NOT build a configuration management tool.
- We will NOT compete with SolarWinds on enterprise features. Our market is SMB/mid-market/OT.
