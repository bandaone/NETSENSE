# Runbook: Incident Response

This runbook covers common incident types. For each, follow the steps.

## Critical: Device Down
**What it means:** A critical device is no longer responding.
1. Open the dashboard link in the alert.
2. Verify the device is actually down (check topology, metrics).
3. Check the blast radius — what else is affected?
4. Check similar historical incidents for resolution steps.
5. Physically check the device if accessible.
6. If unresolved in 30 minutes, escalate.

## High: CPU/Utilization Spike
1. Check the 4-hour metric chart — is the spike sustained?
2. Check for broadcast storms or traffic anomalies on connected ports.
3. Check similar incidents — may be a known firmware issue.
4. If sustained and impacting production, consider rebooting the device during a maintenance window.

## Medium: Observation Reliability Drop
1. This may be a monitoring artifact, not a real fault.
2. Check if the probe's mirror port is still receiving traffic.
3. Check for network changes affecting SPAN configuration.
4. If reliability remains low, investigate the probe's connection.

## For All Incidents
- Acknowledge the alert immediately.
- Add resolution notes when resolved. Be specific.
- If the root cause differs from the system's probable cause, record the actual root cause.

