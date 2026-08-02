# On-Call Guide

## When You Get Paged
1. Acknowledge the alert (within 5 minutes).
2. Open the NetSense dashboard. The alert link takes you directly to the affected device.
3. Follow the incident-specific runbook in `runbooks/`.
4. If the incident is not in the runbooks, investigate using the forensic replay and topology map.
5. If you cannot resolve within 30 minutes, escalate per the escalation policy.

## Escalation
- Level 1: On-call engineer (you) — 30 minutes
- Level 2: Senior engineer (Bwalya) — +30 minutes
- Level 3: Manager (Chanda) — +1 hour

## Access
- Dashboard: https://netsense.example.com
- API: https://api.netsense.example.com/docs
- Probe local dashboard: http://<probe-ip>:80 (if platform is unreachable)
- SSH: ssh netsense@<probe-ip> (key-only, in Vault)

## Common Tools
- Check probe health: `GET /api/health`
- View recent alerts: `GET /api/alerts/recent`
- Download PCAP: `GET /api/incidents/{id}/pcap/download` (senior role)

