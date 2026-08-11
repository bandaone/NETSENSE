from __future__ import annotations

import asyncio
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Literal

from .contracts import ContractRegistry
from .errors import RepositoryConflictError, RepositoryNotFoundError, RepositoryValidationError
from .repositories import JsonObject, TopologyIngestionCommand
from .topology_ingestion import (
    TopologyCursor,
    classify_topology_ingestion,
    make_ingestion_receipt,
    validate_topology_ingestion,
)
from .workflow import entity_exists, operation_fingerprint, require_visible_text


@dataclass(slots=True)
class _Workflow:
    notes: str = ""
    actual_root_cause_entity_id: str | None = None
    actions: list[JsonObject] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class _IdempotencyResult:
    fingerprint: str
    response: JsonObject


class MemoryPlatformRepository:
    """Deterministic development/test adapter; not a durable production store."""

    def __init__(
        self,
        *,
        contracts: ContractRegistry,
        topology_snapshots: list[JsonObject],
        incident_cases: list[JsonObject],
        incident_analyses: list[JsonObject],
    ) -> None:
        self._contracts = contracts
        self._topologies: dict[tuple[str, str], JsonObject] = {}
        self._cases: dict[tuple[str, str], JsonObject] = {}
        self._analyses: dict[tuple[str, str], JsonObject] = {}
        self._workflows: dict[tuple[str, str], _Workflow] = {}
        self._idempotency: dict[tuple[str, str, str], _IdempotencyResult] = {}
        self._topology_cursors: dict[tuple[str, str, str], TopologyCursor] = {}
        self._topology_receipts: dict[tuple[str, str, str], _IdempotencyResult] = {}
        self._snapshot_ids: set[tuple[str, str]] = set()
        self._lock = asyncio.Lock()

        for raw_snapshot in topology_snapshots:
            snapshot = contracts.validate("topology_snapshot", raw_snapshot)
            key = (snapshot["tenantId"], snapshot["site"]["id"])
            if key in self._topologies:
                raise ValueError(
                    "Only one current topology snapshot is allowed per tenant and site."
                )
            self._topologies[key] = snapshot
            self._snapshot_ids.add((snapshot["tenantId"], snapshot["snapshotId"]))

        for raw_case in incident_cases:
            incident_case = contracts.validate("incident_case", raw_case)
            key = (incident_case["incident"]["tenantId"], incident_case["incident"]["id"])
            if key in self._cases:
                raise ValueError("Incident identifiers must be unique within a tenant.")
            self._cases[key] = incident_case
            self._workflows[key] = _Workflow()

        for raw_analysis in incident_analyses:
            analysis = contracts.validate("incident_analysis", raw_analysis)
            key = (analysis["tenantId"], analysis["incidentId"])
            if key not in self._cases:
                raise ValueError("Incident analysis must match a configured incident case.")
            if self._cases[key]["incident"]["siteId"] != analysis["siteId"]:
                raise ValueError("Incident analysis site must match its configured incident case.")
            if key in self._analyses:
                raise ValueError("Only one current analysis is allowed per incident.")
            self._analyses[key] = analysis

    async def get_snapshot(
        self,
        tenant_id: str,
        site_id: str,
        observed_at: str | None,
    ) -> JsonObject:
        snapshot = self._topologies.get((tenant_id, site_id))
        if snapshot is None or (observed_at is not None and snapshot["observedAt"] != observed_at):
            raise RepositoryNotFoundError
        return deepcopy(snapshot)

    async def ingest_snapshot(self, command: TopologyIngestionCommand) -> JsonObject:
        validated = validate_topology_ingestion(command)
        receipt_key = (command.tenant_id, command.collector_id, command.idempotency_key)
        cursor_key = (command.tenant_id, command.site_id, command.collector_id)
        async with self._lock:
            replay = self._topology_receipts.get(receipt_key)
            if replay is not None:
                if replay.fingerprint != validated.fingerprint:
                    raise RepositoryConflictError(
                        "IDEMPOTENCY_CONFLICT",
                        "The idempotency key was already used for different topology content.",
                    )
                return deepcopy(replay.response)

            if any(
                tenant_id == command.tenant_id
                and site_id == command.site_id
                and collector_id != command.collector_id
                for tenant_id, site_id, collector_id in self._topology_cursors
            ):
                raise RepositoryConflictError(
                    "TOPOLOGY_COLLECTOR_CONFLICT",
                    "The site already has a different authoritative snapshot collector.",
                )

            cursor = self._topology_cursors.get(cursor_key)
            classification = classify_topology_ingestion(command, validated, cursor)
            if classification == "duplicate":
                return self._remember_topology_receipt(
                    command,
                    receipt_key,
                    validated.fingerprint,
                    status="duplicate",
                )

            snapshot_key = (command.tenant_id, command.snapshot["snapshotId"])
            if snapshot_key in self._snapshot_ids:
                raise RepositoryConflictError(
                    "TOPOLOGY_SNAPSHOT_ID_CONFLICT",
                    "The topology snapshot identifier was already used.",
                )

            self._topologies[(command.tenant_id, command.site_id)] = deepcopy(command.snapshot)
            self._snapshot_ids.add(snapshot_key)
            self._topology_cursors[cursor_key] = TopologyCursor(
                sequence=command.sequence,
                snapshot_id=command.snapshot["snapshotId"],
                observed_at=validated.observed_at,
                fingerprint=validated.fingerprint,
            )
            return self._remember_topology_receipt(
                command,
                receipt_key,
                validated.fingerprint,
                status="accepted",
            )

    def _remember_topology_receipt(
        self,
        command: TopologyIngestionCommand,
        key: tuple[str, str, str],
        fingerprint: str,
        *,
        status: Literal["accepted", "duplicate"],
    ) -> JsonObject:
        response = self._contracts.validate(
            "topology_ingestion_receipt",
            make_ingestion_receipt(command, status=status),
        )
        self._topology_receipts[key] = _IdempotencyResult(
            fingerprint=fingerprint,
            response=deepcopy(response),
        )
        return deepcopy(response)

    async def list_incidents(
        self,
        tenant_id: str,
        site_id: str,
        state: str | None,
    ) -> list[JsonObject]:
        summaries = [
            self._summary(case)
            for (case_tenant_id, _), case in self._cases.items()
            if case_tenant_id == tenant_id
            and case["incident"]["siteId"] == site_id
            and (state is None or case["incident"]["state"] == state)
        ]
        return sorted(summaries, key=lambda item: (item["detectedAt"], item["id"]), reverse=True)

    async def get_incident_case(self, tenant_id: str, incident_id: str) -> JsonObject:
        return deepcopy(self._get_case(tenant_id, incident_id))

    async def get_incident_analysis(self, tenant_id: str, incident_id: str) -> JsonObject:
        self._get_case(tenant_id, incident_id)
        analysis = self._analyses.get((tenant_id, incident_id))
        if analysis is None:
            raise RepositoryNotFoundError
        return deepcopy(analysis)

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
        fingerprint = operation_fingerprint("acknowledge", {"expectedState": expected_state})
        async with self._lock:
            replay = self._replay(tenant_id, incident_id, idempotency_key, fingerprint)
            if replay is not None:
                return replay
            incident_case = self._require_state(tenant_id, incident_id, expected_state)
            incident_case["incident"]["state"] = "acknowledged"
            workflow = self._workflows[(tenant_id, incident_id)]
            workflow.actions.append(_action("acknowledged", actor, occurred_at))
            response = self._summary(incident_case)
            response["acknowledgedAt"] = occurred_at
            self._remember(tenant_id, incident_id, idempotency_key, fingerprint, response)
            return deepcopy(response)

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
        fingerprint = operation_fingerprint(
            "notes", {"expectedState": expected_state, "notes": notes}
        )
        async with self._lock:
            replay = self._replay(tenant_id, incident_id, idempotency_key, fingerprint)
            if replay is not None:
                return replay
            incident_case = self._require_state(tenant_id, incident_id, expected_state)
            require_visible_text(
                notes,
                minimum=1,
                message="Investigation notes must contain visible text.",
            )
            workflow = self._workflows[(tenant_id, incident_id)]
            workflow.notes = notes
            workflow.actions.append(_action("note_updated", actor, occurred_at))
            response = self._summary(incident_case)
            self._remember(tenant_id, incident_id, idempotency_key, fingerprint, response)
            return deepcopy(response)

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
        body = {
            "expectedState": expected_state,
            "resolutionNotes": resolution_notes,
            "actualRootCauseEntityId": actual_root_cause_entity_id,
        }
        fingerprint = operation_fingerprint("resolve", body)
        async with self._lock:
            replay = self._replay(tenant_id, incident_id, idempotency_key, fingerprint)
            if replay is not None:
                return replay
            incident_case = self._require_state(tenant_id, incident_id, expected_state)
            require_visible_text(
                resolution_notes,
                minimum=10,
                message=(
                    "Resolution requires at least 10 visible characters of investigation notes."
                ),
            )
            if actual_root_cause_entity_id is not None and not entity_exists(
                incident_case["snapshot"], actual_root_cause_entity_id
            ):
                raise RepositoryValidationError(
                    "The actual root-cause entity is not present in the incident snapshot."
                )
            workflow = self._workflows[(tenant_id, incident_id)]
            workflow.notes = resolution_notes
            workflow.actual_root_cause_entity_id = actual_root_cause_entity_id
            workflow.actions.append(_action("resolved", actor, occurred_at))
            incident_case["incident"]["state"] = "resolved"
            response = self._summary(incident_case)
            response["resolvedAt"] = occurred_at
            self._remember(tenant_id, incident_id, idempotency_key, fingerprint, response)
            return deepcopy(response)

    def _get_case(self, tenant_id: str, incident_id: str) -> JsonObject:
        incident_case = self._cases.get((tenant_id, incident_id))
        if incident_case is None:
            raise RepositoryNotFoundError
        return incident_case

    def _require_state(self, tenant_id: str, incident_id: str, expected_state: str) -> JsonObject:
        incident_case = self._get_case(tenant_id, incident_id)
        if incident_case["incident"]["state"] != expected_state:
            raise RepositoryConflictError(
                "INCIDENT_STATE_CONFLICT",
                "The incident changed after this view was loaded.",
            )
        return incident_case

    def _replay(
        self,
        tenant_id: str,
        incident_id: str,
        idempotency_key: str,
        fingerprint: str,
    ) -> JsonObject | None:
        existing = self._idempotency.get((tenant_id, incident_id, idempotency_key))
        if existing is None:
            return None
        if existing.fingerprint != fingerprint:
            raise RepositoryConflictError(
                "IDEMPOTENCY_CONFLICT",
                "The idempotency key was already used for a different operation.",
            )
        return deepcopy(existing.response)

    def _remember(
        self,
        tenant_id: str,
        incident_id: str,
        idempotency_key: str,
        fingerprint: str,
        response: JsonObject,
    ) -> None:
        self._idempotency[(tenant_id, incident_id, idempotency_key)] = _IdempotencyResult(
            fingerprint=fingerprint,
            response=deepcopy(response),
        )

    def _summary(self, incident_case: JsonObject) -> JsonObject:
        incident = incident_case["incident"]
        workflow = self._workflows[(incident["tenantId"], incident["id"])]
        acknowledgement = next(
            (action for action in workflow.actions if action["kind"] == "acknowledged"), None
        )
        resolution = next(
            (action for action in workflow.actions if action["kind"] == "resolved"), None
        )
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
                "acknowledgedAt": acknowledgement["occurredAt"] if acknowledgement else None,
                "resolvedAt": resolution["occurredAt"] if resolution else None,
            },
        )


def _action(kind: str, actor: str, occurred_at: str) -> JsonObject:
    return {"kind": kind, "actor": actor, "occurredAt": occurred_at}
