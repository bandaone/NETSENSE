# RFC-012: Independent virtual network acceptance lab

**Author:** NetSense Engineering

**Date:** 2026-08-13

**Status:** First software-LAN slice implemented; routed, impairment, scale,
Open vSwitch and hardware-in-loop tiers remain planned

## Decision

Build a black-box virtual lab in which the production Probe observes genuine
kernel-forwarded frames and the Platform receives ordinary authenticated
snapshots. An external controller owns scenario declaration and records only
traffic exchanges that actually complete. A separate scorer compares that
observable truth with the authenticated Platform result.

NetSense runtime components must not receive the scenario, hidden truth,
expected graph, or score thresholds. No test-only ingestion path may insert the
answer. The scorer must not import capture, topology-builder, persistence, or UI
implementation code.

## Why

Fixtures and deterministic unit tests prove contracts and edge behavior, but
they cannot prove that real frames cross capture, identity, spool, transport,
storage and read boundaries correctly. A customer pilot is too late to discover
basic integration failures. The virtual lab adds repeatable black-box evidence
without misrepresenting virtualization as hardware qualification.

## Truth sets

1. **Configured inventory:** all endpoints created by the lab.
2. **Observable truth:** only endpoints and directional transports involved in
   exchanges that completed while the observation point was active.
3. **NetSense claims:** the validated snapshot returned by the Platform API.

A silent configured endpoint is not passive observable truth. The scorer must
neither require its discovery nor permit NetSense to invent it.

## First topology

The first slice uses a private, internal Docker bridge with two clients, a
service, and a silent negative control. It produces real TCP, UDP and ICMP
exchange traffic. The existing libpcap Probe captures the named bridge and
uploads through the implemented ordered Platform boundary.

This establishes software-path discovery precision/recall and claim honesty.
It intentionally does not establish physical SPAN behavior.

## Safety and isolation

- The Docker network is `--internal`, preventing a route to external networks.
- Every managed resource carries a lab ownership label.
- Cleanup validates ownership and declared names before removal.
- Containers are read-only, drop all capabilities, set no-new-privileges, and
  receive only the minimum `NET_RAW` exception for an ICMP actor.
- Runtime credentials and acceptance artifacts are ignored by Git.
- Tokens are disposable, RS256, at most eight hours, and written owner-only.
- The Probe BPF admits only source-and-destination traffic inside the declared
  private lab subnet, avoiding the routed-source identity hazard found in the
  MiFi exercise.

## Acceptance baseline

The controlled software LAN requires complete precision and recall for
observable addresses and directional transports, plus complete MAC-to-IP
identity recall for declared active endpoints. It also requires no silent
endpoint claim, no unsupported physical/dependency relationship, no health
overclaim, correct tenant/site scope, a non-synthetic snapshot, and resolvable
evidence for every relationship.

The harness must include negative tests that demonstrate it fails when nodes
or relationships are fabricated, flows are omitted, traffic does not complete,
or health/adjacency is overclaimed.

## Qualification ladder

1. Software LAN: kernel bridge, real packets, strict semantic acceptance.
2. Routed software campus: OVS VLANs/mirror, FRRouting, DHCP/DNS/NAT,
   asymmetric paths, duplicate/changed addresses and mirror loss.
3. Dedicated scale host: 50–500 endpoints, sustained traffic, multiple Probes,
   database failure and controlled `tc netem` impairment.
4. Hardware-in-loop: managed switch SPAN, target appliance, physical NICs,
   rate generator, power interruption, storage and thermal measurements.
5. Authorised customer pilot: agreed validation inventory and independent
   operator outcome measures.

## Claims explicitly left open

Passing this RFC's first slice does not close target capture-loss, physical
SPAN, ARM64, watchdog, power-loss, thermal, RF, vendor interoperability,
100 Mbps, installation, usability, or customer outcome gates. Release records
must name the exact tier passed.
