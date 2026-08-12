# NetSense software-LAN acceptance lab

Status: first runnable software-path lab. It is deliberately not a hardware,
physical-SPAN, radio, ARM64, thermal, power-loss, or production-scale acceptance
environment.

## What this builds

The lab creates a private Docker bridge with four ordinary Linux endpoints:

- two clients;
- one TCP/UDP service;
- one silent negative-control endpoint.

Traffic actors perform real TCP request/response, UDP request/response, and
ICMP echo exchanges over the Linux kernel data plane. The deployable NetSense
Probe binary captures the bridge interface exactly as it would capture a
software mirror or virtual-switch observation point. The Probe is not given the
scenario, node list, or successful-exchange report.

The independent scorer uses only:

1. exchanges that actually completed, recorded by the actors; and
2. the authenticated topology snapshot returned by the Platform API.

It fails on missed or invented observable devices, missed or invented flows,
the silent endpoint appearing without admitted evidence, unresolved evidence,
or passive observations being relabelled as health, physical adjacency, or
dependency truth.

## Trust boundary

```text
scenario + traffic actors ──> private acceptance artifacts ──> scorer
            │                                             ▲
            └─ real packets ─> Probe ─> Platform API ─────┘
```

The acceptance artifacts are ignored by Git and are never mounted into Probe,
Platform, PostgreSQL, or Atlas. No topology fixture is inserted into the
database. The scorer does not import NetSense capture, topology-builder, or
repository implementation code.

## Prerequisites

- Docker with permission to create an internal bridge network;
- Python 3.12 for the controller and tests;
- the existing Platform virtual environment for disposable RS256 token issue;
- `netsense/probe/netsense-probe` built with `-tags libpcap` and the minimum
  capture capability required by the host;
- a running, isolated Platform/PostgreSQL instance configured for this lab.

The reference actor image is pinned by SHA-256 digest in `scenario.json`.
Changing it is a reviewed scenario change; mutable tags are rejected.

## Commands

Run from `netsense/lab`:

```bash
python3 -m unittest discover -s tests -v
python3 lab.py doctor
python3 lab.py up
python3 lab.py traffic
```

Issue disposable identities into the ignored runtime directory:

```bash
../platform/.venv/bin/python issue_tokens.py \
  --directory runtime/identity \
  --tenant-id tenant:virtual-acceptance \
  --collector-id collector:software-lan-v1:01 \
  --database-url 'postgresql+asyncpg://runtime-user:secret@127.0.0.1:55432/netsense_virtual_lab'
```

Create `runtime/probe.json` from the reviewed scenario:

```bash
python3 lab.py configure-probe --platform-url http://127.0.0.1:8010
```

Start the exact Probe binary and wait for at least one delivered snapshot, then
score through the authenticated Platform boundary:

```bash
python3 lab.py score \
  --operator-token runtime/identity/operator.jwt \
  --platform-url http://127.0.0.1:8010
```

Remove only resources owned by this lab:

```bash
python3 lab.py down
```

`down` discovers resources by `netsense.lab=software-lan-v1`, checks container
names against the declared scenario, verifies network ownership, and refuses
to remove unrelated resources.

## Current acceptance checks

- every declared exchange completed;
- Platform snapshot is non-synthetic and in the expected tenant/site scope;
- observable device precision and recall are 100%;
- declared observable MAC-to-IP identity recall is 100%;
- declared observable MAC-to-IP identity precision is 100%;
- observable directional/transport flow precision and recall are 100%;
- graph object IDs, node cardinality, and flow claims are exact and non-duplicate;
- the silent negative-control address is absent;
- passive device state remains unknown/partial/passive-only;
- every relationship is evidence-resolvable;
- no physical/dependency relationship is claimed from the current passive
  header evidence.

These strict values are appropriate for the small controlled lab. Later noisy
and lossy scenarios must define their own measured thresholds rather than
quietly weakening this baseline.

## What this cannot prove

- managed-switch ASIC/SPAN behavior or vendor quirks;
- physical NIC offloads, ring pressure, or capture loss;
- Raspberry Pi 5/ARM64 CPU, memory, disk, temperature, or power behavior;
- hardware watchdog and sudden power-cut recovery;
- Wi-Fi RF, cellular, industrial fieldbus, or tap behavior;
- 100 Mbps/1 Gbps sustained target-hardware performance;
- installation or operator usefulness at a customer site.

Those remain separate hardware-in-loop and authorised-network gates. A passing
software-LAN report must never be described as production appliance acceptance.
