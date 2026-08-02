# Runbook: Probe Offline

## Symptoms
- "Probe Offline" alert from platform.
- Probe status shows "Offline" in dashboard.
- No new data from that site.

## Immediate Actions
1. Check if the probe hardware is powered (PWR LED on).
2. Check network connectivity to the probe (ping the MGMT IP).
3. Check the WireGuard tunnel status from the platform.

## Common Causes and Fixes
- **Power loss:** Restore power. The probe should boot and reconnect automatically.
- **Network outage:** Restore network connectivity. The probe will buffer events locally and upload when reconnected.
- **Probe crash/hang:** The hardware watchdog should reboot it within 60 seconds. If not, physically power-cycle the probe.
- **WireGuard key mismatch:** If keys were rotated on the platform but not on the probe, re-pair the probe via the dashboard.
- **Hardware failure:** If the probe won't boot, follow `probe-replacement.md`.

## After Recovery
- Verify the probe reconnects and the COL LED is pulsing (capture active).
- Check that buffered events are uploading (gap in metrics fills in).
- Resolve the "Probe Offline" alert.

