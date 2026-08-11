from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

JsonObject = dict[str, Any]


@dataclass(frozen=True, slots=True)
class TopologyIngestionCommand:
    tenant_id: str
    site_id: str
    collector_id: str
    sequence: int
    idempotency_key: str
    accepted_at: str
    snapshot: JsonObject


class TopologyRepository(Protocol):
    async def get_snapshot(
        self,
        tenant_id: str,
        site_id: str,
        observed_at: str | None,
    ) -> JsonObject: ...


class TopologyIngestionRepository(Protocol):
    async def ingest_snapshot(self, command: TopologyIngestionCommand) -> JsonObject: ...


class IncidentRepository(Protocol):
    async def list_incidents(
        self,
        tenant_id: str,
        site_id: str,
        state: str | None,
    ) -> list[JsonObject]: ...

    async def get_incident_case(self, tenant_id: str, incident_id: str) -> JsonObject: ...

    async def get_incident_analysis(self, tenant_id: str, incident_id: str) -> JsonObject: ...

    async def acknowledge(
        self,
        *,
        tenant_id: str,
        incident_id: str,
        actor: str,
        occurred_at: str,
        expected_state: str,
        idempotency_key: str,
    ) -> JsonObject: ...

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
    ) -> JsonObject: ...

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
    ) -> JsonObject: ...
