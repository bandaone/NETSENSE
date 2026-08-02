# Runbook: Disk Full

## Symptoms
- "Disk usage >80%" alert from monitoring.
- Dashboard slow or unresponsive.
- PCAP partition full, triggered captures failing.

## Immediate Actions
1. Check disk usage:
```bash
df -h /var/netsense/pcap
df -h /var/lib/postgresql/data
```
Identify what's filling:
```bash
du -sh /var/netsense/pcap/*
du -sh /var/lib/postgresql/data/*
```

### PCAP Partition Full
Verify retention policy is working: PCAPs older than 30 days should be auto-deleted. If retention policy failed, manually delete oldest PCAPs:
```bash
find /var/netsense/pcap -name "*.enc" -mtime +30 -delete
```
Reduce PCAP retention temporarily if needed (configurable in dashboard).

### Database Partition Full
Check if retention policies on metrics are working.
Manually drop old chunks (if using TimescaleDB):

```sql
SELECT drop_chunks('metrics', older_than => INTERVAL '30 days');
```

Increase disk size (cloud VM) or add storage (on-prem).

### Prevention
Set disk alerts at 70% and 80%.
Ensure retention policies are configured and running.

