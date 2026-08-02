# ADR-001: Pure Go Probe Implementation

**Date:** 2026-05-21
**Status:** Accepted
**Author:** Dennis

## Context
The probe must run on constrained ARM hardware (Raspberry Pi 5, industrial ARM boards) with minimal dependencies. It must be deployable as a single binary for air-gapped environments. The original design considered Python with Scapy and Celery, but this introduced a Python runtime, multiple dependencies, and IPC complexity.

## Decision
The probe is implemented in pure Go (Go 1.22). gopacket replaces Scapy for packet capture. gosnmp, simonvetter/modbus, and gopcua/opcua replace their Python equivalents. Native Go goroutines and channels replace Celery for concurrent task scheduling. The only external dependency is libpcap.

## Consequences
- **Easier:** Single static binary, no runtime dependencies, fast startup, low memory footprint, cross-compile to ARM64/AMD64.
- **Harder:** Go OT protocol libraries are less mature than Python equivalents. OPC-UA (gopcua) requires validation. No Python data science ecosystem on the probe.
- **Risks:** gopcua may not be production-ready; fallback is a Python sidecar for OPC-UA only. Topology graph algorithms (NetworkX) run on the platform side, not the probe.

## Alternatives Considered
- **Python probe with Scapy/Celery:** Rejected due to runtime dependency, performance at 100 Mbps, and IPC complexity between Go and Python processes.
- **Rust probe:** Rejected due to smaller OT library ecosystem and team unfamiliarity.

## References
- architecture.md Section 5
- RFC-001, RFC-002

