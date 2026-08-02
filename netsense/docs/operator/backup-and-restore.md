# Backup and Restore Guide

## What Gets Backed Up
- PostgreSQL/TimescaleDB database (all metrics, devices, incidents, baselines, users)
- Probe configuration files (`/etc/netsense/probe.yaml`)
- WireGuard keys (`/etc/wireguard/`)
- PCAP files are NOT backed up (they are forensic data, retained only 30 days; not part of disaster recovery)

## On-Premise Deployments (Model 1)

### Automated Daily Backup
A cron job runs daily:

```bash
ts-dump --db-name netsense --output /backup/netsense_$(date +%Y%m%d).dump
```

Configure the backup destination in `/etc/netsense/backup.conf`:

Local path: `/backup/` (default)
Remote NAS: `nfs://nas/backups/netsense/`
USB drive: `/mnt/usb-backup/`

### Manual Backup

```bash
make backup
```

### Restore
Stop NetSense services: `make stop`

Restore the database:

```bash
pg_restore -d netsense /backup/netsense_YYYYMMDD.dump
```

Restore configuration files from backup location.
Start services: `make start`
Verify: check dashboard, run `make verify-backup`

### Weekly Verification
A script runs automatically to restore the latest backup to a temporary database and verify row counts and hypertable integrity.

## Cloud Deployments (Models 2-4)
Backups are managed by the cloud provider's PostgreSQL backup service (AWS RDS automated backups, DigitalOcean managed database backups). Point-in-time recovery is enabled. To restore, use the provider's console or CLI.

## SaaS Deployments (Model 4)
NetSense operations team manages all backups. Customers do not have access to backup/restore functions. Recovery time objective (RTO) is 4 hours; recovery point objective (RPO) is 1 hour.

