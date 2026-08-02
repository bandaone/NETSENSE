# Security Hardening Guide

## Operating System
- Run Ubuntu Server 24.04 LTS with unattended-upgrades enabled.
- Disable password SSH login; use SSH keys only.
- Change default passwords (if any).
- Enable UFW firewall: allow only SSH (22), WireGuard port, and dashboard port (443).
- Keep libpcap updated.

## NetSense Application
- Use HTTPS for dashboard and API (nginx with Let's Encrypt or self-signed cert for air-gapped).
- Rotate JWT signing keys periodically (configurable in platform config).
- Rotate WireGuard keys every 90 days (can be automated).
- Rotate PCAP encryption keys every 90 days (automatic).
- Enforce role-based access: ensure only admin can manage users.
- Review user accounts quarterly; disable inactive accounts.

## Network
- The mirror port (MIRROR) receives data only; configure the switch SPAN port to be transmit-only (no receive).
- The management port (MGMT) should be on a dedicated management VLAN, not the production VLAN.
- Use WireGuard for all probe-to-platform communication.

## PCAP Security
- PCAPs are encrypted at rest (AES-256-GCM).
- Access requires senior role (engineer can see metadata only). All access is logged.
- Share links are time-limited and scoped to a single incident.

## Production Secrets
- Use HashiCorp Vault (or a local encrypted file for air-gapped) to store:
	- Database passwords
	- JWT signing keys
	- WireGuard private keys
	- PCAP encryption master key
	- Africa's Talking API key
	- SMTP passwords

## Incident Response
- If a key is compromised, follow `runbooks/pcap-key-compromise.md`.
- If the platform is breached, rotate all secrets and re-provision.

