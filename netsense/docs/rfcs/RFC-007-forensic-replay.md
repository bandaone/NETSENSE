# RFC-007: Forensic Replay

## Scope

This RFC covers triggered packet capture around anomaly events, compression, encryption, and retention of forensic PCAP data.

## Related Requirements

- FR-PCAP-001
- FR-PCAP-002
- FR-PCAP-003
- FR-PCAP-004

## Summary

The forensic capture path retains pre-alert packet history, continues capture after the trigger, and stores the result in a compressed, encrypted archive with automatic retention cleanup.
