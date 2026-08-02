# Runbook: PCAP Key Compromise

## When to Use
If the AES encryption key used for PCAP files is suspected compromised (e.g., unauthorized access, stolen backup, insider threat).

## Immediate Actions
1. Rotate the PCAP encryption key via the dashboard (Settings → Security → Rotate PCAP Key).
2. This generates a new key. New PCAPs will use the new key.
3. Old PCAPs remain encrypted with the old key.
4. If the old key is compromised, consider whether old PCAPs need to be deleted. You can delete PCAPs older than a certain date from the dashboard or CLI.

## Investigation
1. Review `pcap_access_log` for unauthorized download or share link generation.
2. Identify which PCAPs may have been accessed.
3. Determine the scope of data exposure (which devices, what time periods).

## Prevention
- Enforce role-based access to PCAP downloads.
- Review audit logs monthly.
- Rotate keys on schedule (every 90 days).

