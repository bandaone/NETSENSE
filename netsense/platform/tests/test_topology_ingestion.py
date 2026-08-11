from __future__ import annotations

from copy import deepcopy
from datetime import timedelta

import pytest

from netsense_platform.errors import RepositoryConflictError, RepositoryValidationError
from netsense_platform.repositories import TopologyIngestionCommand

from .support import NOW, SITE_ID, TENANT_ID, contract_registry, repository, topology_snapshot


def command(
    *,
    sequence: int,
    snapshot_id: str,
    idempotency_key: str,
    timestamp: str = "2026-08-09T11:55:00.000Z",
) -> TopologyIngestionCommand:
    return TopologyIngestionCommand(
        tenant_id=TENANT_ID,
        site_id=SITE_ID,
        collector_id="collector:test",
        sequence=sequence,
        idempotency_key=idempotency_key,
        accepted_at=NOW.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        snapshot=topology_snapshot(
            snapshot_id=snapshot_id,
            timestamp=timestamp,
        ),
    )


@pytest.mark.asyncio
async def test_sequence_gaps_regression_content_conflicts_and_stale_observations_fail() -> None:
    configured = repository(contract_registry())
    await configured.ingest_snapshot(
        command(
            sequence=10,
            snapshot_id="snapshot:ordered:010",
            idempotency_key="topology-ordered-key-010",
        )
    )

    cases = (
        (
            command(
                sequence=12,
                snapshot_id="snapshot:ordered:012",
                idempotency_key="topology-ordered-key-012",
            ),
            "TOPOLOGY_SEQUENCE_GAP",
        ),
        (
            command(
                sequence=9,
                snapshot_id="snapshot:ordered:009",
                idempotency_key="topology-ordered-key-009",
            ),
            "TOPOLOGY_SEQUENCE_STALE",
        ),
        (
            command(
                sequence=10,
                snapshot_id="snapshot:ordered:changed",
                idempotency_key="topology-ordered-key-changed",
            ),
            "TOPOLOGY_SEQUENCE_CONFLICT",
        ),
        (
            command(
                sequence=11,
                snapshot_id="snapshot:ordered:011",
                idempotency_key="topology-ordered-key-011",
                timestamp="2026-08-09T11:54:00.000Z",
            ),
            "TOPOLOGY_OBSERVATION_STALE",
        ),
    )
    for ingestion, expected_code in cases:
        with pytest.raises(RepositoryConflictError) as captured:
            await configured.ingest_snapshot(ingestion)
        assert captured.value.code == expected_code


@pytest.mark.asyncio
async def test_idempotency_key_cannot_be_reused_for_different_topology_content() -> None:
    configured = repository(contract_registry())
    original = command(
        sequence=1,
        snapshot_id="snapshot:idempotent:001",
        idempotency_key="topology-idempotent-key-001",
    )
    await configured.ingest_snapshot(original)
    changed = deepcopy(original.snapshot)
    changed["nodes"][0]["displayName"] = "Changed identity"

    with pytest.raises(RepositoryConflictError) as captured:
        await configured.ingest_snapshot(
            TopologyIngestionCommand(
                tenant_id=original.tenant_id,
                site_id=original.site_id,
                collector_id=original.collector_id,
                sequence=original.sequence,
                idempotency_key=original.idempotency_key,
                accepted_at=original.accepted_at,
                snapshot=changed,
            )
        )

    assert captured.value.code == "IDEMPOTENCY_CONFLICT"


@pytest.mark.asyncio
async def test_generation_time_is_bounded_by_observation_and_platform_clock() -> None:
    configured = repository(contract_registry())
    before_observation = command(
        sequence=1,
        snapshot_id="snapshot:time:before",
        idempotency_key="topology-time-key-before",
    )
    before_observation.snapshot["generatedAt"] = "2026-08-09T11:54:00.000Z"

    future_timestamp = (
        (NOW + timedelta(minutes=6)).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    )
    future = command(
        sequence=1,
        snapshot_id="snapshot:time:future",
        idempotency_key="topology-time-key-future",
        timestamp=future_timestamp,
    )

    for invalid in (before_observation, future):
        with pytest.raises(RepositoryValidationError):
            await configured.ingest_snapshot(invalid)


@pytest.mark.asyncio
async def test_probe_boundary_rejects_non_probe_evidence_and_invalid_sequence() -> None:
    configured = repository(contract_registry())
    simulated = command(
        sequence=1,
        snapshot_id="snapshot:evidence:simulation",
        idempotency_key="topology-evidence-simulation",
    )
    simulated.snapshot["evidence"][0]["sourceType"] = "simulation"
    invalid_sequence = command(
        sequence=0,
        snapshot_id="snapshot:sequence:zero",
        idempotency_key="topology-sequence-zero-0001",
    )

    for invalid in (simulated, invalid_sequence):
        with pytest.raises(RepositoryValidationError):
            await configured.ingest_snapshot(invalid)


@pytest.mark.asyncio
async def test_second_snapshot_collector_cannot_replace_the_authoritative_site_view() -> None:
    configured = repository(contract_registry())
    await configured.ingest_snapshot(
        command(
            sequence=1,
            snapshot_id="snapshot:collector:first",
            idempotency_key="topology-collector-first-01",
        )
    )
    second_snapshot = topology_snapshot(
        snapshot_id="snapshot:collector:second",
        collector_id="collector:other",
    )
    with pytest.raises(RepositoryConflictError) as captured:
        await configured.ingest_snapshot(
            TopologyIngestionCommand(
                tenant_id=TENANT_ID,
                site_id=SITE_ID,
                collector_id="collector:other",
                sequence=1,
                idempotency_key="topology-collector-second-01",
                accepted_at=NOW.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                snapshot=second_snapshot,
            )
        )

    assert captured.value.code == "TOPOLOGY_COLLECTOR_CONFLICT"
