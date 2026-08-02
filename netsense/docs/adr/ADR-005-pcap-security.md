# ADR-005: PCAP Encryption and Access Control

**Date:** 2026-05-21
**Status:** Accepted
**Author:** Dennis

## Context
Triggered PCAP files contain raw network traffic, potentially including credentials, industrial process data, or PII. Unauthorized access is a security and compliance risk.

## Decision
PCAPs are encrypted at rest with AES-256-GCM. Access requires senior role (engineer can see metadata only). Every access is logged to an append-only audit table. Share links use time-limited signed JWTs scoped to a single incident. Encryption keys rotate every 90 days.

## Consequences
- **Easier:** Strong security posture, auditable, meets compliance requirements.
- **Harder:** Key management adds operational complexity. PCAP decryption on download adds latency.
- **Risks:** Key rotation requires careful implementation to not lose access to old PCAPs.

## Alternatives Considered
- **Unencrypted PCAPs:** Rejected — unacceptable security risk.
- **Full-disk encryption only:** Rejected — does not protect against application-level access.

## References
- FR-PCAP-001 through FR-PCAP-008
- NFR-SEC-003 through NFR-SEC-005
- RFC-007

