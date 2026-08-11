from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from .contracts import ContractRegistry
from .database import tenant_transaction
from .db_schema import (
    idempotency_records,
    incident_actions,
    incident_analyses,
    incident_cases,
    topology_ingestion_receipts,
    topology_ingestion_state,
    topology_snapshots,
)
from .errors import RepositoryConflictError, RepositoryNotFoundError, RepositoryValidationError
from .repositories import JsonObject, TopologyIngestionCommand
from .topology_ingestion import (
    TopologyCursor,
    ValidatedTopologyIngestion,
    classify_topology_ingestion,
    make_ingestion_receipt,
    validate_topology_ingestion,
)
from .workflow import entity_exists, json_object, operation_fingerprint, require_visible_text

Operation = Literal["acknowledge", "notes", "resolve"]


@dataclass(frozen=True, slots=True)
class _Mutation:
    operation: Operation
    tenant_id: str
    incident_id: str
    actor: str
    occurred_at: str
    expected_state: str
    idempotency_key: str
    notes: str | None = None
    actual_root_cause_entity_id: str | None = None

    @property
    def fingerprint_body(self) -> JsonObject:
        if self.operation == "acknowledge":
            return {"expectedState": self.expected_state}
        if self.operation == "notes":
            return {"expectedState": self.expected_state, "notes": self.notes}
        return {
            "expectedState": self.expected_state,
            "resolutionNotes": self.notes,
            "actualRootCauseEntityId": self.actual_root_cause_entity_id,
        }


class PostgresPlatformRepository:
    """Tenant-scoped PostgreSQL adapter; every operation executes under forced RLS."""

    def __init__(self, *, engine: AsyncEngine, contracts: ContractRegistry) -> None:
        self._engine = engine
        self._contracts = contracts

    async def get_snapshot(
        self,
        tenant_id: str,
        site_id: str,
        observed_at: str | None,
    ) -> JsonObject:
        statement = sa.select(topology_snapshots.c.payload).where(
            topology_snapshots.c.site_id == site_id
        )
        if observed_at is None:
            statement = statement.order_by(
                topology_snapshots.c.observed_at.desc(),
                topology_snapshots.c.created_at.desc(),
                topology_snapshots.c.snapshot_id.desc(),
            ).limit(1)
        else:
            statement = (
                statement.where(topology_snapshots.c.observed_at == _parse_timestamp(observed_at))
                .order_by(
                    topology_snapshots.c.created_at.desc(),
                    topology_snapshots.c.snapshot_id.desc(),
                )
                .limit(1)
            )
        async with tenant_transaction(self._engine, tenant_id) as connection:
            payload = (await connection.execute(statement)).scalar_one_or_none()
        if payload is None:
            raise RepositoryNotFoundError
        return self._contracts.validate("topology_snapshot", json_object(payload))

    async def ingest_snapshot(self, command: TopologyIngestionCommand) -> JsonObject:
        validated = validate_topology_ingestion(command)
        async with tenant_transaction(self._engine, command.tenant_id) as connection:
            cursor = await self._locked_topology_cursor(connection, command)
            replay = await self._topology_replay(connection, command, validated.fingerprint)
            if replay is not None:
                return replay
            classification = classify_topology_ingestion(command, validated, cursor)
            if classification == "duplicate":
                return await self._record_topology_receipt(
                    connection,
                    command,
                    validated.fingerprint,
                    status="duplicate",
                )
            await self._persist_topology_snapshot(
                connection,
                command,
                validated,
                cursor_exists=cursor is not None,
            )
            return await self._record_topology_receipt(
                connection,
                command,
                validated.fingerprint,
                status="accepted",
            )

    async def _locked_topology_cursor(
        self,
        connection: AsyncConnection,
        command: TopologyIngestionCommand,
    ) -> TopologyCursor | None:
        await connection.execute(
            sa.text("SELECT pg_advisory_xact_lock(hashtext(:tenant_id), hashtext(:scope_id))"),
            {"tenant_id": command.tenant_id, "scope_id": command.site_id},
        )
        row = (
            (
                await connection.execute(
                    sa.select(topology_ingestion_state)
                    .where(topology_ingestion_state.c.site_id == command.site_id)
                    .with_for_update()
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            return None
        if row["collector_id"] != command.collector_id:
            raise RepositoryConflictError(
                "TOPOLOGY_COLLECTOR_CONFLICT",
                "The site already has a different authoritative snapshot collector.",
            )
        return TopologyCursor(
            sequence=row["last_sequence"],
            snapshot_id=row["last_snapshot_id"],
            observed_at=row["last_observed_at"],
            fingerprint=row["last_fingerprint"],
        )

    async def _persist_topology_snapshot(
        self,
        connection: AsyncConnection,
        command: TopologyIngestionCommand,
        validated: ValidatedTopologyIngestion,
        *,
        cursor_exists: bool,
    ) -> None:
        snapshot_exists = (
            await connection.execute(
                sa.select(topology_snapshots.c.snapshot_id).where(
                    topology_snapshots.c.snapshot_id == command.snapshot["snapshotId"]
                )
            )
        ).scalar_one_or_none()
        if snapshot_exists is not None:
            raise RepositoryConflictError(
                "TOPOLOGY_SNAPSHOT_ID_CONFLICT",
                "The topology snapshot identifier was already used.",
            )
        await connection.execute(
            sa.insert(topology_snapshots).values(
                tenant_id=command.tenant_id,
                snapshot_id=command.snapshot["snapshotId"],
                site_id=command.site_id,
                observed_at=validated.observed_at,
                payload=command.snapshot,
                created_at=validated.accepted_at,
            )
        )
        cursor_values = {
            "last_sequence": command.sequence,
            "last_snapshot_id": command.snapshot["snapshotId"],
            "last_observed_at": validated.observed_at,
            "last_fingerprint": validated.fingerprint,
            "updated_at": validated.accepted_at,
        }
        if cursor_exists:
            await connection.execute(
                sa.update(topology_ingestion_state)
                .where(
                    topology_ingestion_state.c.site_id == command.site_id,
                    topology_ingestion_state.c.collector_id == command.collector_id,
                )
                .values(**cursor_values)
            )
            return
        await connection.execute(
            sa.insert(topology_ingestion_state).values(
                tenant_id=command.tenant_id,
                site_id=command.site_id,
                collector_id=command.collector_id,
                **cursor_values,
            )
        )

    async def _topology_replay(
        self,
        connection: AsyncConnection,
        command: TopologyIngestionCommand,
        fingerprint: str,
    ) -> JsonObject | None:
        row = (
            (
                await connection.execute(
                    sa.select(
                        topology_ingestion_receipts.c.fingerprint,
                        topology_ingestion_receipts.c.response,
                    ).where(
                        topology_ingestion_receipts.c.collector_id == command.collector_id,
                        topology_ingestion_receipts.c.idempotency_key == command.idempotency_key,
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            return None
        if row["fingerprint"] != fingerprint:
            raise RepositoryConflictError(
                "IDEMPOTENCY_CONFLICT",
                "The idempotency key was already used for different topology content.",
            )
        return self._contracts.validate("topology_ingestion_receipt", json_object(row["response"]))

    async def _record_topology_receipt(
        self,
        connection: AsyncConnection,
        command: TopologyIngestionCommand,
        fingerprint: str,
        *,
        status: Literal["accepted", "duplicate"],
    ) -> JsonObject:
        response = self._contracts.validate(
            "topology_ingestion_receipt",
            make_ingestion_receipt(command, status=status),
        )
        await connection.execute(
            sa.insert(topology_ingestion_receipts).values(
                tenant_id=command.tenant_id,
                collector_id=command.collector_id,
                idempotency_key=command.idempotency_key,
                fingerprint=fingerprint,
                response=response,
                created_at=_parse_timestamp(command.accepted_at),
            )
        )
        return response

    async def list_incidents(
        self,
        tenant_id: str,
        site_id: str,
        state: str | None,
    ) -> list[JsonObject]:
        statement = sa.select(incident_cases).where(incident_cases.c.site_id == site_id)
        if state is not None:
            statement = statement.where(incident_cases.c.state == state)
        statement = statement.order_by(
            incident_cases.c.detected_at.desc(), incident_cases.c.incident_id.desc()
        )
        async with tenant_transaction(self._engine, tenant_id) as connection:
            rows = (await connection.execute(statement)).mappings().all()
        return [self._summary(row) for row in rows]

    async def get_incident_case(self, tenant_id: str, incident_id: str) -> JsonObject:
        async with tenant_transaction(self._engine, tenant_id) as connection:
            payload = (
                await connection.execute(
                    sa.select(incident_cases.c.payload).where(
                        incident_cases.c.incident_id == incident_id
                    )
                )
            ).scalar_one_or_none()
        if payload is None:
            raise RepositoryNotFoundError
        return self._contracts.validate("incident_case", json_object(payload))

    async def get_incident_analysis(self, tenant_id: str, incident_id: str) -> JsonObject:
        async with tenant_transaction(self._engine, tenant_id) as connection:
            payload = (
                await connection.execute(
                    sa.select(incident_analyses.c.payload).where(
                        incident_analyses.c.incident_id == incident_id
                    )
                )
            ).scalar_one_or_none()
        if payload is None:
            raise RepositoryNotFoundError
        return self._contracts.validate("incident_analysis", json_object(payload))

    async def acknowledge(
        self,
        *,
        tenant_id: str,
        incident_id: str,
        actor: str,
        occurred_at: str,
        expected_state: str,
        idempotency_key: str,
    ) -> JsonObject:
        return await self._mutate(
            _Mutation(
                operation="acknowledge",
                tenant_id=tenant_id,
                incident_id=incident_id,
                actor=actor,
                occurred_at=occurred_at,
                expected_state=expected_state,
                idempotency_key=idempotency_key,
            )
        )

    async def update_notes(
        self,
        *,
        tenant_id: str,
        incident_id: str,
        actor: str,
        occurred_at: str,
        expected_state: str,
        notes: str,
        idempotency_key: str,
    ) -> JsonObject:
        return await self._mutate(
            _Mutation(
                operation="notes",
                tenant_id=tenant_id,
                incident_id=incident_id,
                actor=actor,
                occurred_at=occurred_at,
                expected_state=expected_state,
                idempotency_key=idempotency_key,
                notes=notes,
            )
        )

    async def resolve(
        self,
        *,
        tenant_id: str,
        incident_id: str,
        actor: str,
        occurred_at: str,
        expected_state: str,
        resolution_notes: str,
        actual_root_cause_entity_id: str | None,
        idempotency_key: str,
    ) -> JsonObject:
        return await self._mutate(
            _Mutation(
                operation="resolve",
                tenant_id=tenant_id,
                incident_id=incident_id,
                actor=actor,
                occurred_at=occurred_at,
                expected_state=expected_state,
                idempotency_key=idempotency_key,
                notes=resolution_notes,
                actual_root_cause_entity_id=actual_root_cause_entity_id,
            )
        )

    async def _mutate(self, mutation: _Mutation) -> JsonObject:
        fingerprint = operation_fingerprint(mutation.operation, mutation.fingerprint_body)
        occurred_at = _parse_timestamp(mutation.occurred_at)
        async with tenant_transaction(self._engine, mutation.tenant_id) as connection:
            row = await _locked_incident(connection, mutation.incident_id)
            if row is None:
                raise RepositoryNotFoundError

            replay = await self._replay(connection, mutation, fingerprint)
            if replay is not None:
                return replay
            if row["state"] != mutation.expected_state:
                raise RepositoryConflictError(
                    "INCIDENT_STATE_CONFLICT",
                    "The incident changed after this view was loaded.",
                )

            payload = self._contracts.validate("incident_case", json_object(row["payload"]))
            values, action_kind, action_details = _apply_mutation(payload, mutation, occurred_at)
            payload = self._contracts.validate("incident_case", payload)
            values.update({"payload": payload, "updated_at": occurred_at})
            await connection.execute(
                sa.update(incident_cases)
                .where(incident_cases.c.incident_id == mutation.incident_id)
                .values(**values)
            )

            summary_values = dict(row)
            summary_values.update(values)
            response = self._summary(summary_values)
            await connection.execute(
                sa.insert(incident_actions).values(
                    tenant_id=mutation.tenant_id,
                    incident_id=mutation.incident_id,
                    kind=action_kind,
                    actor=mutation.actor,
                    occurred_at=occurred_at,
                    details=action_details,
                )
            )
            await connection.execute(
                sa.insert(idempotency_records).values(
                    tenant_id=mutation.tenant_id,
                    incident_id=mutation.incident_id,
                    idempotency_key=mutation.idempotency_key,
                    fingerprint=fingerprint,
                    response=response,
                )
            )
            return response

    async def _replay(
        self,
        connection: AsyncConnection,
        mutation: _Mutation,
        fingerprint: str,
    ) -> JsonObject | None:
        row = (
            (
                await connection.execute(
                    sa.select(
                        idempotency_records.c.fingerprint,
                        idempotency_records.c.response,
                    ).where(
                        idempotency_records.c.incident_id == mutation.incident_id,
                        idempotency_records.c.idempotency_key == mutation.idempotency_key,
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            return None
        if row["fingerprint"] != fingerprint:
            raise RepositoryConflictError(
                "IDEMPOTENCY_CONFLICT",
                "The idempotency key was already used for a different operation.",
            )
        return self._contracts.validate("incident_summary", json_object(row["response"]))

    def _summary(self, row) -> JsonObject:
        incident_case = self._contracts.validate("incident_case", json_object(row["payload"]))
        incident = incident_case["incident"]
        return self._contracts.validate(
            "incident_summary",
            {
                "schemaVersion": incident_case["schemaVersion"],
                "id": incident["id"],
                "tenantId": incident["tenantId"],
                "siteId": incident["siteId"],
                "title": incident["title"],
                "severity": incident["severity"],
                "state": incident["state"],
                "detectedAt": incident["detectedAt"],
                "acknowledgedAt": _format_timestamp(row["acknowledged_at"]),
                "resolvedAt": _format_timestamp(row["resolved_at"]),
            },
        )


async def _locked_incident(connection: AsyncConnection, incident_id: str):
    return (
        (
            await connection.execute(
                sa.select(incident_cases)
                .where(incident_cases.c.incident_id == incident_id)
                .with_for_update()
            )
        )
        .mappings()
        .one_or_none()
    )


def _apply_mutation(
    payload: JsonObject,
    mutation: _Mutation,
    occurred_at: datetime,
) -> tuple[dict[str, object], str, JsonObject]:
    occurred_at_text = _format_timestamp(occurred_at)
    if mutation.operation == "acknowledge":
        payload["incident"]["state"] = "acknowledged"
        return (
            {"state": "acknowledged", "acknowledged_at": occurred_at},
            "acknowledged",
            {},
        )

    assert mutation.notes is not None
    if mutation.operation == "notes":
        require_visible_text(
            mutation.notes,
            minimum=1,
            message="Investigation notes must contain visible text.",
        )
        return (
            {"investigation_notes": mutation.notes},
            "note_updated",
            {"notes": mutation.notes, "recordedAt": occurred_at_text},
        )

    require_visible_text(
        mutation.notes,
        minimum=10,
        message="Resolution requires at least 10 visible characters of investigation notes.",
    )
    if mutation.actual_root_cause_entity_id is not None and not entity_exists(
        payload["snapshot"], mutation.actual_root_cause_entity_id
    ):
        raise RepositoryValidationError(
            "The actual root-cause entity is not present in the incident snapshot."
        )
    payload["incident"]["state"] = "resolved"
    return (
        {
            "state": "resolved",
            "resolved_at": occurred_at,
            "investigation_notes": mutation.notes,
            "actual_root_cause_entity_id": mutation.actual_root_cause_entity_id,
        },
        "resolved",
        {
            "resolutionNotes": mutation.notes,
            "actualRootCauseEntityId": mutation.actual_root_cause_entity_id,
        },
    )


def _parse_timestamp(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise RepositoryValidationError("Timestamp must be a valid ISO 8601 value.") from None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise RepositoryValidationError("Timestamp must include a timezone.")
    return parsed


def _format_timestamp(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")
