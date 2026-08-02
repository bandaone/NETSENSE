# Probe Replacement Procedure

## When to Replace
- Hardware failure (probe won't boot, persistent NIC errors, disk failure)
- Upgrade to a newer model
- Moving a deployment to new hardware

## Prerequisites
- A replacement probe with the same or newer firmware
- Access to the platform dashboard (admin role)
- Physical access to the network cabinet

## Procedure

### 1. Backup Configuration (if old probe is still accessible)
- SSH to the old probe
- Copy `/etc/netsense/probe.yaml` and `/etc/wireguard/` to a safe location
- If the probe is dead, you must have these backed up from the last backup cycle (see `backup-and-restore.md`)

### 2. Prepare the New Probe
- Install the latest probe binary (same version as platform)
- Restore the configuration files to `/etc/netsense/`
- Restore WireGuard keys to `/etc/wireguard/`
- Do NOT power on the new probe yet

### 3. Disconnect the Old Probe
- Physically disconnect the MIRROR, MGMT, and power cables
- Remove from rack/DIN rail
- Note: The platform will generate a "Probe Offline" alert. Acknowledge it.

### 4. Connect the New Probe
- Mount the new probe
- Connect MIRROR, MGMT, and power cables
- Power on

### 5. Verify
- On the platform dashboard, the probe should reappear as "Online" within 2 minutes
- The COL LED should start pulsing (indicating capture)
- Check that devices are appearing in the topology
- Verify that the new probe's identity (serial number) is visible in Settings → Probes
- The "Probe Offline" alert should auto-resolve

### 6. Decommission the Old Probe
- Securely wipe the SSD if it was functional
- Dispose of hardware according to local regulations

### Rollback
If the new probe fails, reconnect the old probe (if functional) and contact support.

