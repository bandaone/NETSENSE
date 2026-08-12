# Local MiFi Pilot Engineering Record — 2026-08-12

**Status:** First authorised live-path exercise; not a hardware or discovery
acceptance test

## Scope

Exercise the real Probe → Platform → PostgreSQL → Atlas full-snapshot path on a
pocket MiFi without representing it as full-network monitoring. The probe ran
on the development laptop's MiFi USB/RNDIS interface. Capture was restricted to
IPv4 traffic whose source and destination were both inside the authorised pilot
subnet. Exact site addresses and link-layer identifiers are intentionally
omitted from this repository record.
The concurrent Wi-Fi connection remained outside the stated capture scope.

The platform used a dedicated local pilot database, forced RLS, the
restricted runtime role, short-lived local RS256 identities, and the live Atlas
HTTP adapter. Secrets and runtime configuration remained in a private temporary
directory and were not committed.

## Observed result

- Platform liveness and database/schema/RLS readiness returned healthy/ready.
- The capability-scoped probe opened the real interface without running the
  entire process as root.
- Controlled ICMP and HTTP exchanges with the MiFi gateway succeeded; the ICMP
  sample had zero loss across four packets and then two packets. This is a
  connectivity check, not a throughput or loss benchmark.
- The platform accepted ordered, non-synthetic snapshots and the spool advanced
  without pending files.
- A corrected snapshot contained two link-layer-backed identities: the pilot
  laptop and the MiFi gateway.
- Both nodes correctly reported `unknown` health, `partial` coverage, and
  passive evidence. No physical adjacency or dependency was claimed.
- Authenticated Atlas rendered `Local MiFi Pilot`, labelled the source `Live
  platform evidence`, and displayed the real nodes and observed communication.

## Defects found and resolved

1. The default browser transport stored native `fetch` as an instance method.
   Chrome invoked it with the repository as its receiver and rejected it before
   issuing a request. The adapter now calls `globalThis.fetch` through a wrapper,
   with a regression test covering the receiver.
2. `observed_flow` existed in the contract and visual grammar but was omitted
   from the Operations lens allowlist. Operations now includes it, while
   Physical and Dependency continue to exclude it so observed traffic cannot
   be mistaken for adjacency or dependency truth.
3. Investigate opened on the Dependency lens even when the live snapshot
   contained only operational flow evidence. It now opens on the broad
   evidence-first Operations lens, with browser coverage for the selected lens
   and visible topology region.
4. Automatic fit enlarged a sparse two-device topology until labels dominated
   the canvas. Sparse maps now have a bounded automatic zoom policy and concise
   node labels; health, coverage, addresses, and evidence remain available
   through semantic styling, hover, selection, and detail views.
5. A token placed in tab-scoped storage made the dedicated Chrome inspection
   work while an isolated IDE browser correctly failed authentication. The
   local pilot now uses an explicit development-only Vite proxy bridge that
   reads an owner-only token file and accepts only loopback platform targets.
   A clean browser receives no credential and production still requires its own
   authenticated user session.

## Important finding not yet resolved in code

A filter using only `net <authorised-subnet>` admits packets when either endpoint
is local. On inbound routed Internet traffic, the Ethernet source is the gateway
while the IP source is remote. The current source-MAC/source-IP correlator can
therefore attach remote IP addresses to the gateway identity. The pilot was
stopped before presenting that snapshot and restarted with this strict filter
template:

```text
ip and src net <authorised-subnet> and dst net <authorised-subnet>
and not ether broadcast and not ether multicast
```

This operational mitigation is appropriate for the bounded pilot but not a
general solution. Before capture across routed boundaries, the probe needs an
explicit configured identity-network policy (potentially per observation
point) so out-of-scope network-layer sources cannot enrich a local link-layer
identity. Tests must cover inbound routed replies and overlapping/ambiguous
address scopes.

## Other limitations exposed

- A pocket MiFi provides no SPAN/mirror feed. The probe saw this laptop's real
  traffic, not all connected clients or the complete MiFi network.
- The laptop had Wi-Fi and RNDIS addresses in the same subnet. A cleaner repeat
  should disable one path to avoid multi-homing ambiguity.
- TCP, UDP, and ICMP currently produce separate relationships for the same
  directed node pair. The facts are valid, but protocol-aware edge aggregation
  should be designed before larger live maps to prevent visual noise.
- Atlas loads a validated snapshot on page load/retry; topology streaming and
  automatic snapshot refresh remain unimplemented.
- The two-minute horizon and 30-second cadence were lab settings, not product
  defaults or measured production capacity.
- No conclusion is available for silent devices, other MiFi clients, physical
  topology, wireless RF state, health, service dependency, sustained packet
  loss, ARM64, or 100 Mbps operation.

## Verification after fixes

| Gate | Result |
| --- | --- |
| Contract generation consistency | Pass |
| Frontend lint | Pass |
| Frontend unit suite | Pass; 78/78 |
| Frontend statement coverage | Pass; 93% |
| Production frontend build | Pass with existing chunk warning |
| Browser/accessibility suite | Pass; 16/16 |
| Authenticated live API request | Pass; HTTP 200 |
| Live Atlas evidence rendering | Pass; two entities and observed relationships |

## Next pilot step

Repeat with only one MiFi connection active, then introduce one additional
authorised client and controlled local traffic if the MiFi permits peer
communication. Implement identity-network admission before widening the BPF or
using a routed SPAN. A managed switch mirror remains necessary for meaningful
multi-device precision/recall and capture-loss acceptance.
