# RFC-011: Passive Go Probe Vertical Slice

**Author:** NetSense Engineering

**Date:** 2026-08-12

**Status:** Implemented foundation; target-host acceptance pending

## Summary

Build the smallest real NetSense Probe path that can observe permitted mirrored
traffic, retain only bounded header-derived facts, construct an honest
vendor-neutral topology snapshot, survive restart/platform disconnection, and
deliver ordered snapshots to the authenticated RFC-009 platform boundary.

This slice proves the shape of Probe → Platform → PostgreSQL → Atlas. It does
not claim complete discovery, physical-switch topology, service dependency,
device health, or production capture throughput.

## Customer Outcome

- Service: S1 — Network Truth Assessment
- Gate: A — Live network truth
- Decision improved: identify devices that actively source traffic on the
  authorised observation point and show supported communication relationships
  between identities that the probe has independently observed.
- Proof target: an authorised small LAN produces a non-synthetic Atlas snapshot
  whose nodes, identifiers, flow relationships, timestamps, and limitations can
  all be traced back to passive packet headers.

## Scope and Invariants

1. The probe is Go 1.22 and uses gopacket/libpcap under ADR-001.
2. Capture is passive. No packet transmission, scanning, ICMP, SNMP, Modbus, or
   OPC-UA code exists in this slice.
3. The default BPF admits IP unicast and excludes Ethernet broadcast and
   multicast, preserving FR-CAP-001. Broader passive discovery requires an
   explicit configured BPF and deployment authorisation.
4. Processing extracts only Ethernet, IP, TCP/UDP/ICMP headers, kernel time,
   and original packet length. Application payload bytes are never persisted,
   logged, placed in evidence, or sent to the platform.
5. A device identity requires an independently observed source MAC address.
   IP addresses enrich that identity but never create or merge a device alone.
6. Destination MAC plus destination IP is not treated as identity evidence:
   routed traffic would otherwise attach remote IPs to the next-hop router.
7. A flow relationship is emitted only when both IP endpoints resolve
   unambiguously to device identities independently observed as packet sources.
8. Passive traffic does not prove health, management, criticality, user count,
   dependency, or physical adjacency. The snapshot says unknown/partial and
   explains the limitation.
9. Snapshot sequence allocation and queued payload creation are crash-safe.
   An accepted payload can be replayed with the same sequence and deterministic
   idempotency key until local deletion succeeds.
10. Pending snapshots upload strictly in sequence. `429` honors
    `Retry-After`; `409` and `413` fail closed for operator reconciliation.
11. The bearer token is read from a restricted file for each delivery attempt
    so rotation does not require embedding it in configuration or logs.
12. Configuration rejects unknown fields, invalid durations/paths, URL user
    information, and insecure non-loopback HTTP unless explicitly authorised.

## Components

- `config`: strict file-backed identity, capture, storage, and platform policy.
- `capture`: libpcap source with kernel BPF and immediate header extraction.
- `observation`: renderer- and transport-independent packet-header fact.
- `topology`: time-bounded identity/flow correlation and exact Atlas snapshot
  construction.
- `spool`: atomic immutable JSON queue plus durable monotonic sequence state.
- `platform`: bounded HTTP delivery and exact receipt/scope verification.
- `agent`: cancellation-aware orchestration with separate capture and delivery
  failure paths.

## Failure and Recovery

- Interface/BPF failure: process exits non-zero without presenting capture as
  healthy.
- Malformed configuration/token: startup or delivery fails without logging the
  secret.
- No observations: no empty inventory is published; absence of mirrored
  traffic is not evidence that a network is empty.
- Platform/network failure: the immutable pending snapshot remains queued.
- Crash before sequence-state update: startup reconciles state from the highest
  durable spool filename.
- Crash after platform acceptance but before deletion: exact replay is accepted
  idempotently and the queue can then advance.
- Ambiguous IP ownership: the affected communication relationship is omitted
  and coverage remains partial.

## Security and Privacy

The capture path never formats complete packets. Tests use synthetic header
observations and verify snapshot JSON contains no supplied payload marker.
Spool directories and files use owner-only permissions. Transport requires
HTTPS by default; explicitly insecure transport is a development/private-tunnel
exception and not proof of WireGuard compliance.

Running packet capture requires the minimum operating-system capability needed
for the configured interface. The project must not prescribe running the whole
probe as unrestricted root when capability-based deployment is available.

## Testing and Acceptance

- Unit: strict configuration, identity rules, routed-destination avoidance,
  ambiguous IP handling, flow typing, evidence limits, expiry, deterministic
  snapshot ordering, and absence of payload data.
- Spool: monotonic allocation, atomic recovery, corrupt state, replay after
  acceptance/delete interruption, ordering, permissions, and bounded files.
- HTTP: authentication headers, exact receipt validation, response-size bound,
  timeout, 429 retry, 409/413 classification, and no response-body leakage.
- Capture: offline decoder fixtures for IPv4/IPv6/TCP/UDP/ICMP/VLAN and
  truncated/unsupported packets; live interface tests remain target-host gates.
- Cross-language: every produced snapshot fixture validates against the same
  generated topology schema and Python graph invariants.
- Quality: `go test -race`, `go vet`, formatting, at least 80% function
  coverage, and representative ARM64/AMD64 builds where libpcap toolchains are
  available.

## Explicit Non-goals

- claiming LLDP/CDP physical adjacency before those decoders exist;
- ARP/DHCP/DNS identity enrichment in the default filter;
- active polling or OT interaction;
- application payload parsing or PCAP retention;
- SQLite 72-hour event buffering, metrics, baselines, alerts, and forensics;
- topology-diff generation/streaming;
- automatic enrolment, WireGuard provisioning, OTA updates, or production
  service supervision;
- 100 Mbps/Raspberry Pi performance acceptance.

## Known Trade-offs

Atomic JSON spooling is smaller and easier to audit for the first low-frequency
full-snapshot path than introducing SQLite before an event schema exists. It
does not satisfy the later 72-hour normalized-event buffer requirement. Full
snapshots will be inefficient at scale; their measured cadence and size will
inform diff and retention design.

## Release Truth

Passing repository tests proves a transportable passive probe foundation, not
automatic discovery in the market. Gate A stays closed until target hardware
and an authorised network establish capture loss, precision/recall, identity
stability, blind-spot communication, restart/offline recovery, security, and
operator usefulness.
