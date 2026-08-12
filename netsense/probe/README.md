# NetSense passive probe foundation

Status: implemented and repository-tested; authorised target-network and
target-hardware acceptance remain open.

This Go binary observes mirrored Ethernet traffic without transmitting packets,
retains only selected link/network/transport header facts in memory, constructs
conservative full topology snapshots, spools them durably, and uploads them to
the authenticated platform boundary. It does not store packet payloads or claim
physical adjacency, service dependency, device health, ownership, vendor, or
complete network visibility.

The governing boundary is [RFC-011](../docs/rfcs/RFC-011-passive-probe-vertical-slice.md).

## What the map means

- A node exists only after a valid source MAC is observed on the configured
  mirror interface.
- An IP address enriches that MAC-backed identity only when observed as a packet
  source. IP alone never creates or merges a device.
- An `observed_flow` exists only when both IP endpoints resolve unambiguously to
  independently source-observed devices.
- Flow direction describes the observed packet direction. It is not physical
  adjacency or an application dependency.
- Health remains `unknown`, coverage `partial`, and management state
  `passive_only` because packet headers cannot prove more.
- Old identities and flows expire after the configured observation horizon.

The default BPF includes unicast IPv4 and IPv6 and excludes Ethernet broadcast
and multicast. This intentionally omits silent devices and common passive
identity sources such as ARP, DHCP, DNS multicast, LLDP, and CDP. A broader
filter requires an explicit privacy/safety review and deployment authorisation.

## Build and verify

Prerequisites are Go 1.22+, a C toolchain, and libpcap development headers.
On Ubuntu, the package is `libpcap-dev`.

```bash
go test -race -coverprofile=coverage.out ./...
go vet ./...
go build -tags libpcap -o netsense-probe ./cmd/netsense-probe
```

The `libpcap` build tag is deliberate: a default build retains decoder and
orchestration testability without pretending that live capture exists. A
deployable binary must be built with `-tags libpcap`.

## Configuration

Create an owner-controlled configuration file:

```json
{
  "probeId": "collector:great-east-road:01",
  "tenantId": "tenant:unza",
  "organisationId": "organisation:unza",
  "organisationName": "University of Zambia",
  "siteId": "site:great-east-road",
  "siteName": "Great East Road Campus",
  "capture": {
    "interface": "mirror0",
    "bpfFilter": "(ip or ip6) and not ether broadcast and not ether multicast",
    "snapLength": 160,
    "snapshotInterval": "5m",
    "observationHorizon": "15m",
    "maxDevices": 10000,
    "maxFlows": 50000
  },
  "storage": {
    "directory": "/var/lib/netsense-probe/spool",
    "maxPendingSnapshots": 288
  },
  "platform": {
    "baseUrl": "https://atlas.example.org",
    "tokenFile": "/run/secrets/netsense-probe.jwt",
    "timeout": "10s",
    "allowInsecureTransport": false
  }
}
```

Unknown configuration fields and invalid bounds fail startup. Relative spool
and token paths resolve relative to the configuration file. Non-loopback HTTP
is rejected unless `allowInsecureTransport` is explicitly enabled for an
authorised private-tunnel deployment. That exception is not proof that the
tunnel or host is secure.

The token must be a non-symlink, owner-only regular file (for example mode
`0600`). It is reread on every delivery attempt so it can be rotated without
embedding it in configuration or logs. The token must authenticate the same
tenant and collector identity configured above and have the platform `probe`
role.

Start the probe with:

```bash
./netsense-probe -config /etc/netsense/probe.json
```

## Operating boundaries

- Capture requires permission to read the selected interface. Grant only the
  minimum host capabilities needed for packet capture; do not run the complete
  service as unrestricted root when capability-based deployment is available.
- The mirror/SPAN source and probe are authorised deployment inputs. The probe
  cannot determine whether the switch copied the intended traffic correctly.
- Pending snapshots are immutable owner-only JSON files. Sequence state and
  files use fsync plus atomic rename; accepted snapshots are deleted strictly
  oldest-first.
- The queue is bounded by snapshot count and the platform's 32 MiB per-snapshot
  ceiling. At defaults, the theoretical disk ceiling is about 9 GiB. Operators
  must select a smaller count where available disk cannot safely support that
  bound and monitor free space.
- `429` responses preserve the pending snapshot and honour bounded
  `Retry-After` guidance. Network and selected server failures retry with
  exponential backoff. Authentication, scope, ordering, validation, or payload
  conflicts stop the agent for operator reconciliation rather than discarding
  evidence or skipping a sequence.
- If there are no current observations, no empty inventory is uploaded. Missing
  traffic is not evidence of an empty network.

## Unproven release gates

Repository verification covers deterministic construction, contract
conformance, race detection, decoder behavior, bounded HTTP handling, and spool
recovery. It does not prove packet-loss performance, discovery precision/recall,
identity stability on a real network, capability/service packaging, disk-loss
behavior, 100 Mbps operation, ARM64 builds, WireGuard, enrolment, upgrades, or
operator usefulness. Those are required target-environment acceptance gates
before this foundation can be sold as automatic network discovery.
