# Monitoring NetSense

NetSense monitors your network, but you need to monitor NetSense itself.

## Health Endpoint
`GET /api/health` returns:

```json
{
	"status": "healthy",
	"probe": {
		"uptime_seconds": 123456,
		"capture_active": true,
		"packets_per_second": 85000,
		"cpu_percent": 22.5,
		"memory_mb": 3200,
		"disk_free_gb": 120
	},
	"platform": {
		"database": "connected",
		"redis": "connected",
		"active_probes": 3
	}
}
```

## Probe Heartbeat
Each probe writes a heartbeat to Redis every 30 seconds. If a heartbeat is missing for 5 minutes, the platform generates a "Probe Offline" alert. This is your primary signal that a probe has failed.

## What to Monitor
- Probe CPU and memory (alert if >80% for 5 minutes)
- Disk usage on PCAP partition (alert if >80% full)
- WireGuard tunnel status (alert if down)
- Database connection (alert if disconnected)
- Alert delivery success rate (alert if <95%)

## Logs
Probe logs: `journalctl -u netsense-probe`
Platform logs: `docker logs netsense-api`
Database logs: `docker logs netsense-timescaledb`

## Integration with External Monitoring
You can point your existing monitoring tool (Zabbix, PRTG, etc.) at the `/api/health` endpoint to track NetSense as part of your overall infrastructure monitoring.

