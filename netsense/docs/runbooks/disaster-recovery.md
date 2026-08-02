# Runbook: Disaster Recovery

## Scope
Complete loss of platform server or database. Recovery from backups.

## Prerequisites
- Latest backup available (see `backup-and-restore.md`).
- Probe configuration files backed up.
- Replacement server or VM ready.

## Procedure
1. Provision a new server with Ubuntu 24.04.
2. Install Docker and Docker Compose.
3. Copy the NetSense deployment configuration and backup files to the new server.
4. Restore the database:

```bash
pg_restore -d netsense /path/to/latest_backup.dump
```

Restore probe configuration and WireGuard keys.
Start services: `make start`
Verify probes reconnect and dashboard shows data.
Notify users.

Recovery Time Objective (RTO): 4 hours
Recovery Point Objective (RPO): 24 hours (daily backups)

