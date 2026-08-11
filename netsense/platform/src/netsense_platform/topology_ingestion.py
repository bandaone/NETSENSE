from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from .errors import RepositoryConflictError, RepositoryValidationError
from .repositories import JsonObject, TopologyIngestionCommand
from .workflow import operation_fingerprint

MAX_FUTURE_CLOCK_SKEW = timedelta(minutes=5)
MAX_SAFE_SEQUENCE = 9_007_199_254_740_991
NON_PROBE_EVIDENCE_SOURCES = frozenset({"manual", "import", "simulation"})


@dataclass(frozen=True, slots=True)
class ValidatedTopologyIngestion:
    fingerprint: str
    accepted_at: datetime
    observed_at: datetime


@dataclass(frozen=True, slots=True)
class TopologyCursor:
    sequence: int
    snapshot_id: str
    observed_at: datetime
    fingerprint: str


def validate_topology_ingestion(
    command: TopologyIngestionCommand,
) -> ValidatedTopologyIngestion:
    snapshot = command.snapshot
    if isinstance(command.sequence, bool) or not 1 <= command.sequence <= MAX_SAFE_SEQUENCE:
        raise RepositoryValidationError("Topology sequence is outside the supported range.")
    if snapshot["tenantId"] != command.tenant_id:
        raise RepositoryValidationError(
            "The topology snapshot does not belong to the authenticated tenant."
        )
    if snapshot["site"]["id"] != command.site_id:
        raise RepositoryValidationError("The topology snapshot site does not match the request.")
    if snapshot["synthetic"]:
        raise RepositoryValidationError("Synthetic topology cannot enter the live ingestion path.")
    if any(record["collectorId"] != command.collector_id for record in snapshot["evidence"]):
        raise RepositoryValidationError(
            "Topology evidence must belong to the authenticated collector."
        )
    if any(record["sourceType"] in NON_PROBE_EVIDENCE_SOURCES for record in snapshot["evidence"]):
        raise RepositoryValidationError(
            "Manual, imported, and simulated evidence require a separate ingestion boundary."
        )

    accepted_at = parse_timestamp(command.accepted_at)
    observed_at = parse_timestamp(snapshot["observedAt"])
    generated_at = parse_timestamp(snapshot["generatedAt"])
    if generated_at < observed_at:
        raise RepositoryValidationError(
            "Topology generation time cannot precede its observation time."
        )
    if generated_at > accepted_at + MAX_FUTURE_CLOCK_SKEW:
        raise RepositoryValidationError(
            "Topology generation time is too far ahead of the platform clock."
        )

    fingerprint = operation_fingerprint(
        "ingest_topology_snapshot",
        {"sequence": command.sequence, "snapshot": snapshot},
    )
    return ValidatedTopologyIngestion(
        fingerprint=fingerprint,
        accepted_at=accepted_at,
        observed_at=observed_at,
    )


def classify_topology_ingestion(
    command: TopologyIngestionCommand,
    validated: ValidatedTopologyIngestion,
    cursor: TopologyCursor | None,
) -> Literal["accepted", "duplicate"]:
    if cursor is None:
        return "accepted"
    if command.sequence == cursor.sequence:
        if (
            cursor.fingerprint != validated.fingerprint
            or cursor.snapshot_id != command.snapshot["snapshotId"]
        ):
            raise RepositoryConflictError(
                "TOPOLOGY_SEQUENCE_CONFLICT",
                "The topology sequence was already used for different content.",
            )
        return "duplicate"
    if command.sequence < cursor.sequence:
        raise RepositoryConflictError(
            "TOPOLOGY_SEQUENCE_STALE",
            "The topology sequence is older than the accepted sequence.",
        )
    if command.sequence > cursor.sequence + 1:
        raise RepositoryConflictError(
            "TOPOLOGY_SEQUENCE_GAP",
            "The topology sequence does not immediately follow the accepted sequence.",
        )
    if validated.observed_at < cursor.observed_at:
        raise RepositoryConflictError(
            "TOPOLOGY_OBSERVATION_STALE",
            "The topology observation time regressed.",
        )
    return "accepted"


def make_ingestion_receipt(
    command: TopologyIngestionCommand,
    *,
    status: Literal["accepted", "duplicate"],
    accepted_at: str | None = None,
) -> JsonObject:
    return {
        "schemaVersion": "1.0.0",
        "status": status,
        "tenantId": command.tenant_id,
        "siteId": command.site_id,
        "collectorId": command.collector_id,
        "sequence": command.sequence,
        "snapshotId": command.snapshot["snapshotId"],
        "acceptedAt": accepted_at or command.accepted_at,
    }


def parse_timestamp(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise RepositoryValidationError("Timestamp must be a valid ISO 8601 value.") from None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise RepositoryValidationError("Timestamp must include a timezone.")
    return parsed.astimezone(UTC)
