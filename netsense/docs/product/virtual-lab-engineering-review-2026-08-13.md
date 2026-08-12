# NetSense Independent Virtual Lab Engineering Review — 2026-08-13

**Scope:** RFC-012 first software-LAN tier: isolated Linux network, genuine
TCP/UDP/ICMP actors, production Probe capture, authenticated Platform
ingestion/read, Atlas rendering, independent truth recording, and black-box
acceptance scoring.

## Outcome

Accepted as a repeatable software-path integration gate. On 2026-08-13 the
production Probe observed real frames on the isolated bridge, delivered ordered
snapshots to the Platform, and Atlas rendered the resulting live four-device
graph. The independent scorer passed all 16 semantic checks with 100% device,
flow, and declared MAC-to-IP identity precision/recall where applicable.

This result is not hardware acceptance, a physical-SPAN qualification, a scale
claim, or proof that NetSense can discover an entire customer network from any
arbitrary attachment point.

## What was tested

The declared lab contained two clients, one TCP/UDP service, one bridge
gateway, and one silent negative-control endpoint. The actors completed:

- four TCP request/response exchanges;
- four UDP request/response exchanges;
- four ICMP echo request/response exchanges.

Only completed exchanges became observable ground truth. The Probe received no
inventory or expected graph. The Platform received only ordinary authenticated
Probe snapshots. The scorer fetched the graph through the authenticated public
API after capture; it did not read NetSense internals or insert fixtures.

## Measured result

| Gate | Result |
| --- | --- |
| Traffic actions completed | Pass; 3/3 actions, 12/12 exchanges |
| Live, correctly scoped snapshot | Pass |
| Observable devices | Pass; 4 expected, 4 observed |
| Device precision / recall | 1.00 / 1.00 |
| Directional transport flows | Pass; 6 expected, 6 observed |
| Flow precision / recall | 1.00 / 1.00 |
| Declared active MAC/IP identity precision / recall | 1.00 / 1.00 |
| Silent negative control absent | Pass |
| Passive health/coverage/management honesty | Pass |
| Unsupported physical/dependency claims | 0 |
| Unresolved relationships | 0 |
| Atlas live rendering | Pass; four entities and observed-flow graph visible |

The generated traffic evidence, fetched snapshot, acceptance report, disposable
keys, and tokens remain in ignored owner-only directories and are not release
fixtures.

## Golden-rule review

### 1. Correctness

Configured inventory, observable truth, and NetSense claims are deliberately
separate sets. A configured silent endpoint is neither required nor allowed in
the observed result. Response nonces ensure a traffic action succeeds only
when the expected peer actually responds. Direction and transport are checked
from evidence attached to each relationship.

### 2–3. Cyclomatic and cognitive complexity

Scenario validation, Docker lifecycle, traffic generation, evidence storage,
API retrieval, and scoring are separate small modules. The controller uses
explicit commands and early failures. No numerical complexity score is claimed
without a configured complexity tool.

### 4. Readability

The scenario is declarative JSON. Names state test intent (`silent`,
`observed_flow`, `traffic_ground_truth_complete`). Reports expose every check,
metric, expected set, observed set, and failed gate rather than returning an
opaque pass/fail result.

### 5–6. Maintainability, coupling, and cohesion

The harness depends on published system boundaries: Ethernet frames, the Probe
executable/configuration, authenticated HTTP ingestion, and the Platform read
contract. The scorer uses no Probe or Platform implementation modules. Docker
management is isolated from scoring, so future OVS/FRR and hardware adapters can
preserve the same truth and score model.

### 7–8. Duplication, naming, and conventions

Network identity, traffic actions, and ownership live in one strict scenario.
Ruff formatting/linting and standard `unittest` conventions pass. Unknown
fields are rejected so misspelled safety or identity settings cannot be
silently ignored.

### 9. Error handling

The controller fails on invalid/private-address scope, duplicate identity,
missing actors, failed exchanges, invalid actor evidence, API/authentication
failure, malformed topology, unsafe cleanup targets, and failed acceptance
checks. Partial container creation triggers owned-resource cleanup.

### 10. Security

The network is internal and RFC1918-only. Containers are read-only,
no-new-privileges, capability-dropped, and only the ICMP actor receives
`NET_RAW`. Cleanup requires exact ownership labels and declared names. The
actor image is digest-pinned. Short-lived RS256 credentials and artifacts are
owner-only, symlink checks protect token reads, and secrets are excluded from
Git and command output.

This is local test isolation, not a proof against a privileged host attacker.

### 11. Test coverage

Twenty-one harness tests pass. Positive tests cover the reference scenario,
score, safe artifact output, and pinned actor. Negative tests prove rejection
of public subnets, duplicate addresses, silent traffic actors, unknown config
fields, mutable images, weak/symlinked credentials, invented silent devices,
wrong or extra MAC/IP association, duplicate graph objects, duplicated or
misattributed traffic evidence, missing flows, unsupported physical claims,
incomplete traffic, health overclaims, and unowned cleanup targets.
Bounded server-readiness failure is also covered so a launch race cannot be
mistaken for a valid traffic result.

### 12. Architectural consistency

The lab exercises the RFC-011 passive Probe and RFC-009/010 Platform boundary
without adding a test-only ingestion path. It preserves NetSense invariants:
observed communication is not physical adjacency or dependency, and passive
presence is not health.

### 13. Scalability implications

This four-endpoint baseline proves contract wiring and semantic fidelity only.
It does not measure packet loss, map usability, database behavior, or resource
use at 50–500 endpoints. Those require dedicated host capacity, controlled
load, impairment, and explicit thresholds.

### 14. Unnecessary complexity

The first tier uses the existing Docker and Linux bridge facilities. It adds no
orchestrator, broker, custom packet injector, or alternate NetSense runtime.
OVS, FRRouting, `tc netem`, and hardware are deferred until their particular
failure modes are under test.

## Questionable decisions and open gates

- Capturing the host bridge is representative of a software observation point,
  but it does not reproduce managed-switch SPAN ASIC behavior.
- The reference addresses and traffic pattern are deterministic. A passing
  baseline could hide hard-coded assumptions if used alone; randomised holdout
  scenarios are required in the routed tier.
- The bridge has no VLANs, routing, DHCP, DNS, NAT, asymmetric paths, duplicate
  IPs, identity churn, or injected loss.
- The run did not measure packet-drop counters, CPU, memory, disk, throughput,
  database outage recovery, or long-duration stability.
- Atlas was visually checked on this small graph; larger-map legibility and
  task-level operator outcomes remain open.
- Raspberry Pi/ARM64, physical NIC offload, 100 Mbps/1 Gbps, thermals, storage,
  watchdog, power cuts, Wi-Fi/cellular/RF, and vendor interoperability remain
  hardware-in-loop gates.

## Next qualification slice

Build the routed virtual-campus tier with Open vSwitch mirroring and
FRRouting, then add controlled `tc netem` loss/latency, VLANs, DHCP/DNS, NAT,
address churn, asymmetric traffic, collector restarts, Platform outages, and
hidden/randomised holdout scenarios. Preserve this independent scorer and add
measured thresholds instead of weakening the strict software-LAN baseline.
