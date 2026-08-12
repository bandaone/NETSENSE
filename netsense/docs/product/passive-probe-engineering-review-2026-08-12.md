# NetSense Passive Probe Engineering Review — 2026-08-12

**Scope:** RFC-011 Go probe configuration, live/offline capture boundary,
header observations, conservative topology construction, durable spool,
authenticated platform delivery, orchestration, shared contract fixture, and
operator documentation.

## Outcome

Accepted as a repository-tested passive-probe foundation. The slice establishes
a concrete Probe → Platform full-snapshot boundary without overstating what
packet headers prove. It is not accepted as production hardware, complete
network discovery, continuous monitoring, or a generally available service.
Target-network and target-hardware gates remain mandatory.

## Golden-rule review

### 1. Correctness

The capture decoder emits only Ethernet, IPv4/IPv6, TCP/UDP/ICMP metadata. The
builder keys device identity by independently observed source MAC, uses source
IP only as enrichment, omits ambiguous IP ownership, and creates an
`observed_flow` only when both endpoints are independently resolved. Full
snapshots are deterministic for the same facts, sequence, and generation time.

Sequence allocation, immutable snapshot persistence, and state recovery are
ordered. Upload acknowledgement removes only the oldest item. A replay after
acceptance retains the same sequence, snapshot ID, body-derived idempotency key,
and therefore the same platform operation.

### 2. Cyclomatic complexity

Capture, construction, persistence, delivery, and orchestration are separate
packages. Their main paths use explicit validation and early returns rather
than nested branching. No numerical complexity claim is made without a checked
complexity tool.

### 3. Cognitive complexity

Domain names state what is known (`HeaderObservation`, `observed_flow`) and what
must happen (`EnqueueNext`, `Acknowledge`, `Reconcile`). Network capture does not
know the platform contract, and the uploader does not infer topology.

### 4. Readability

Configuration bounds, operational defaults, outcome categories, and evidence
limitations are named. JSON types mirror the portable contract. The operator
guide explains what each map element means and identifies claims the slice
cannot support.

### 5. Maintainability

The `Source` and `Deliverer` ports isolate live libpcap and HTTP from agent
logic. A later event/diff path can replace full-snapshot cadence without
placing rendering or vendor logic inside capture. The build tag keeps ordinary
tests independent of system headers while making live builds explicit.

### 6. Coupling and cohesion

Each package owns one boundary: configuration, capture, observations, topology,
spool, transport, or orchestration. The shared snapshot fixture intentionally
couples Go output to the platform's portable contract; this is a compatibility
guard, not accidental runtime coupling.

### 7. Duplication

Snapshot identifiers and evidence construction are centralised in the topology
builder. Idempotency derives once from immutable payload bytes. The Go contract
types duplicate JSON shape by necessity because generated Go types do not yet
exist; the shared cross-language fixture detects drift until generation is
justified.

### 8. Naming and conventions

The implementation follows Go package naming, `gofmt`, error wrapping, context
cancellation, table-driven test patterns where useful, and the repository's
portable camel-case JSON contract. No industry-specific device vocabulary is
embedded in the engine.

### 9. Error handling

Invalid or unknown configuration fails startup. Interface/BPF errors terminate
capture instead of reporting a healthy probe. Empty observations do not produce
an empty network. Network/selected server failures retry; rate responses honour
bounded retry guidance. Authentication, scope, order, validation, payload, or
unknown HTTP outcomes stop for reconciliation. Corrupt/gapped spool state and
capacity exhaustion fail closed.

### 10. Security and privacy

Application payload bytes cannot cross the decoder's output type and are never
persisted. Spool directories/files use owner-only permissions. Tokens are
restricted regular files, reread per delivery, absent from configuration and
logs, and transmitted only as bearer headers. Non-loopback plaintext transport
requires an explicit exception. Response bodies are bounded and never included
in errors.

The code does not provision capture capabilities, WireGuard, service isolation,
or enrolment. The token-file check cannot defend against a privileged local
attacker, and host hardening remains a deployment gate.

### 11. Test coverage

The Go suite covers strict/invalid configuration, header decoding including
IPv4/IPv6/VLAN and truncation, identity ambiguity and routed destinations,
expiry/determinism, spool order/recovery/capacity/corruption, HTTP receipt and
failure handling, retry cadence, capture failure, and end-to-end agent assembly
with fakes. `go test -race` passes with 80.4% aggregate statement coverage.
`go vet` and a real `-tags libpcap` AMD64 build pass. Python validates the exact
Go golden snapshot against JSON Schema and cross-object graph invariants.

### 12. Architectural consistency

The slice implements the passive-first ADR/RFC boundary and preserves the
service charter: stable identity is not IP-only; health, coverage, management,
and confidence remain independent; observed communication is not relabelled as
physical or dependency truth; no active OT operation exists.

### 13. Scalability implications

Devices and flows have configured in-memory caps; snapshots and pending files
have configured count/size bounds. Default worst-case spool occupancy is about
9 GiB (288 × 32 MiB), which must be reduced for smaller disks. Full snapshots,
map expiry scans, and JSON files are intentionally simple for this first slice,
but require target-scale profiling before diff/event architecture or capacity
claims. Packet loss and 100 Mbps behavior are unmeasured.

### 14. Unnecessary complexity

The slice adds no broker, embedded database, plugin framework, packet store,
active collector, or speculative abstraction. Atomic JSON spooling is easier to
audit than introducing the planned normalized event database before its
contract and retention model exist.

## Gate record

| Gate | Result |
| --- | --- |
| RFC and implementation-truth review | Pass |
| `gofmt` and `go vet` | Pass |
| Go race suite | Pass |
| Go aggregate statement coverage | Pass; 80.4%, floor 80% |
| Default non-live build/test path | Pass |
| AMD64 `libpcap` tagged test/build/link | Pass |
| Shared Go/Python contract fixture | Pass |
| Platform PostgreSQL regression before fixture-only test | Pass; 72/72, 90.73% coverage |
| Platform delta after fixture addition | Pass; 62/62 non-database tests plus isolated fixture validation |
| Target ARM64 build | Not run |
| Authorised live-network acceptance | Not run |
| Target-hardware packet-loss/100 Mbps tests | Not run |
| Capability/service/WireGuard packaging | Not implemented |
| Dependency vulnerability audit | Not rerun; gopacket is the only new module |

## Required next slice

Deploy this exact foundation to an authorised representative LAN and capture a
repeatable acceptance record: mirror scope, ground-truth inventory, precision
and recall, ambiguous identities, packet loss, CPU/memory/disk use, platform
outage and power-loss recovery, token rotation, Atlas evidence fidelity, and
operator time-to-understand. Use those measurements to choose the next passive
identity/L2 enrichment and the full-snapshot-to-diff boundary. Do not add active
collection or market discovery claims to compensate for missing passive proof.
