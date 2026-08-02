# Runbook: Database Failure

## Symptoms
- Dashboard returns 500 errors or "Database connection failed."
- API health endpoint shows database: "disconnected."
- TimescaleDB container is stopped or crashing.

## Immediate Actions
1. Check database container status:
```bash
docker ps -a | grep timescaledb
```
If stopped, attempt restart:
```bash
docker start netsense-timescaledb
```
Check logs for cause:
```bash
docker logs netsense-timescaledb --tail 100
```

### Common Causes
Disk full: Free space on data volume. See `disk-full.md`.
Corrupted WAL: Restore from backup (see `backup-and-restore.md`).
Memory exhaustion: Increase container memory limit or system RAM.

### If Restart Fails
Restore from latest backup.
If no backup available, reinitialize database (data loss of unbuffered events; probe buffers will replay on reconnect). Contact senior engineer.

### Prevention
Monitor disk space and set alerts.
Test backups weekly.
Use UPS to prevent sudden power loss corruption.

