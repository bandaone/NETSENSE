# Upgrade Procedure

## Probe Upgrade

### OTA (Over-the-Air) — Models 2, 3, 4
1. On the platform dashboard, go to Settings → Probes.
2. Select the probe(s) to upgrade.
3. Click "Upgrade Firmware" and select the version.
4. The probe downloads the new binary, verifies the signature, and reboots.
5. The upgrade takes ~2 minutes. The probe will briefly show "Offline" then reconnect.

### USB (Air-Gapped) — Model 1
1. Download the new probe binary from the NetSense support portal onto a USB drive.
2. Rename the file to `netsense-update.tar.gz`.
3. Insert the USB drive into the probe's front panel USB port.
4. Reboot the probe (press RST button or power cycle).
5. The probe detects the update file, verifies the signature, and applies the update.
6. The PWR LED blinks during update. When solid green, update is complete. Remove USB.

## Platform Upgrade (Docker)
1. SSH to the platform server.
2. Pull new Docker images:

```bash
docker compose -f infra/docker/docker-compose.yml pull
```

Restart services:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Database migrations run automatically on startup. Verify health endpoint.

### Rollback
Probe: If the new version fails, insert a USB with the previous version and reboot, or redeploy the previous OTA version from the dashboard.
Platform: `docker compose down && docker compose up -d` with the previous image tags.

### Version Compatibility
Probe and platform versions are designed to be backward compatible within the same MINOR version. Always upgrade the platform first, then probes.

