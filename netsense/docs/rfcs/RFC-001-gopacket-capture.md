# RFC-001: Gopacket Capture

## Scope

This RFC covers the passive capture loop, packet extraction, TCP handshake tracking, and the plugin architecture used by collection protocols.

## Related Requirements

- FR-CAP-001
- FR-CAP-002
- FR-CAP-003
- FR-CAP-004
- FR-CAP-005
- FR-CAP-017
- FR-CAP-018

## Summary

The capture engine uses gopacket on the mirror-port interface with a default BPF filter that excludes broadcast and multicast traffic. It exposes configurable protocol, VLAN, and IP-range filtering and emits structured packet observations with kernel timestamps.

Collection plugins implement the Collector interface so new protocol collectors can be added without changing the core engine. Plugin failures are isolated and restarted with backoff so one protocol cannot take down the capture pipeline.
