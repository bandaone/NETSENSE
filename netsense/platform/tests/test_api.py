from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from netsense_platform.admission import (
    AllowAllRateLimiter,
    InMemoryFixedWindowRateLimiter,
    RateLimiter,
)
from netsense_platform.application import create_app
from netsense_platform.memory_repository import MemoryPlatformRepository
from netsense_platform.readiness import ReadinessProbe, StaticReadinessProbe

from .support import (
    INCIDENT_ID,
    NODE_ID,
    NOW,
    OTHER_TENANT_ID,
    SITE_ID,
    TENANT_ID,
    SigningKeys,
    authenticator,
    contract_registry,
    make_token,
    repository,
    signing_keys,
    topology_snapshot,
)


@pytest.fixture(scope="module")
def keys() -> SigningKeys:
    return signing_keys()


def make_app(
    keys: SigningKeys,
    repo: MemoryPlatformRepository | None = None,
    *,
    rate_limiter: RateLimiter | None = None,
    readiness_probe: ReadinessProbe | None = None,
    max_request_body_bytes: int = 32 * 1024 * 1024,
):
    contracts = contract_registry()
    configured_repository = repo or repository(contracts)
    return create_app(
        authenticator=authenticator(keys),
        contracts=contracts,
        topology_repository=configured_repository,
        topology_ingestion_repository=configured_repository,
        incident_repository=configured_repository,
        ingestion_rate_limiter=rate_limiter or AllowAllRateLimiter(),
        readiness_probe=readiness_probe or StaticReadinessProbe(),
        max_request_body_bytes=max_request_body_bytes,
        now=lambda: NOW,
        trace_id_factory=lambda: "trace_platform_test_001",
    )


@asynccontextmanager
async def client_for(
    keys: SigningKeys,
    repo: MemoryPlatformRepository | None = None,
    **app_options: Any,
) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(
        app=make_app(keys, repo, **app_options),
        raise_app_exceptions=False,
    )
    async with AsyncClient(transport=transport, base_url="https://platform.test") as client:
        yield client


def auth_headers(keys: SigningKeys, *, role: str = "engineer", tenant_id: str = TENANT_ID):
    return {"Authorization": f"Bearer {make_token(keys, role=role, tenant_id=tenant_id)}"}


def probe_headers(
    keys: SigningKeys,
    *,
    idempotency_key: str,
    sequence: int,
    tenant_id: str = TENANT_ID,
) -> dict[str, str]:
    return {
        "Authorization": (
            "Bearer "
            + make_token(keys, role="probe", tenant_id=tenant_id, subject="collector:test")
        ),
        "Idempotency-Key": idempotency_key,
        "X-Topology-Sequence": str(sequence),
    }


@pytest.mark.asyncio
async def test_liveness_is_minimal_and_api_requires_authentication(keys: SigningKeys) -> None:
    async with client_for(keys) as client:
        health = await client.get("/health/live")
        unauthorized = await client.get(f"/api/v1/sites/{SITE_ID}/topology")

    assert health.json() == {"status": "healthy"}
    assert unauthorized.status_code == 401
    assert unauthorized.headers["content-type"].startswith("application/problem+json")
    assert unauthorized.headers["www-authenticate"] == "Bearer"
    assert unauthorized.json()["traceId"] == "trace_platform_test_001"


@pytest.mark.asyncio
async def test_readiness_is_dependency_aware_and_non_disclosing(keys: SigningKeys) -> None:
    async with client_for(keys, readiness_probe=StaticReadinessProbe()) as client:
        ready = await client.get("/health/ready")
    async with client_for(keys, readiness_probe=StaticReadinessProbe(False)) as client:
        unavailable = await client.get("/health/ready")
        live = await client.get("/health/live")

    assert ready.status_code == 200
    assert ready.json() == {"status": "ready"}
    assert unavailable.status_code == 503
    assert unavailable.json() == {"status": "unavailable"}
    assert "database" not in unavailable.text.lower()
    assert live.status_code == 200
    assert live.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_ingestion_body_limit_accepts_boundary_and_rejects_oversize(
    keys: SigningKeys,
) -> None:
    snapshot = topology_snapshot(snapshot_id="snapshot:body-limit:001")
    payload = json.dumps(snapshot, separators=(",", ":")).encode()
    headers = {
        **probe_headers(
            keys,
            idempotency_key="topology-body-limit-key-001",
            sequence=1,
        ),
        "Content-Type": "application/json",
    }
    accepted_repository = repository(contract_registry())
    async with client_for(
        keys,
        accepted_repository,
        max_request_body_bytes=len(payload),
    ) as client:
        accepted = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers=headers,
            content=payload,
        )

    rejected_repository = repository(contract_registry())
    async with client_for(
        keys,
        rejected_repository,
        max_request_body_bytes=len(payload) - 1,
    ) as client:
        rejected = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers=headers,
            content=payload,
        )
        current = await client.get(
            f"/api/v1/sites/{SITE_ID}/topology",
            headers=auth_headers(keys),
        )

    assert accepted.status_code == 201
    assert rejected.status_code == 413
    assert rejected.json()["code"] == "PAYLOAD_TOO_LARGE"
    assert rejected.headers["x-trace-id"] == "trace_platform_test_001"
    assert rejected.headers["cache-control"] == "no-store"
    assert current.json()["snapshotId"] != snapshot["snapshotId"]


@pytest.mark.asyncio
async def test_ingestion_body_limit_counts_streamed_chunks(keys: SigningKeys) -> None:
    snapshot = topology_snapshot(snapshot_id="snapshot:chunk-limit:001")
    payload = json.dumps(snapshot, separators=(",", ":")).encode()

    async def chunks():
        midpoint = len(payload) // 2
        yield payload[:midpoint]
        yield payload[midpoint:]

    headers = {
        **probe_headers(
            keys,
            idempotency_key="topology-chunk-limit-key-01",
            sequence=1,
        ),
        "Content-Type": "application/json",
    }
    async with client_for(keys, max_request_body_bytes=len(payload) - 1) as client:
        response = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers=headers,
            content=chunks(),
        )

    assert response.status_code == 413
    assert response.json()["code"] == "PAYLOAD_TOO_LARGE"


@pytest.mark.asyncio
async def test_ingestion_rate_limit_is_scoped_and_returns_retry_after(keys: SigningKeys) -> None:
    now = [100.0]
    limiter = InMemoryFixedWindowRateLimiter(
        limit=1,
        window_seconds=60,
        clock=lambda: now[0],
    )
    snapshot = topology_snapshot(snapshot_id="snapshot:rate-limit:001")
    headers = probe_headers(
        keys,
        idempotency_key="topology-rate-limit-key-001",
        sequence=1,
    )
    async with client_for(keys, rate_limiter=limiter) as client:
        accepted = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers=headers,
            json=snapshot,
        )
        rejected = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers=headers,
            json=snapshot,
        )

    assert accepted.status_code == 201
    assert rejected.status_code == 429
    assert rejected.headers["retry-after"] == "60"
    assert rejected.json()["code"] == "RATE_LIMITED"
    assert snapshot["snapshotId"] not in rejected.text


@pytest.mark.asyncio
async def test_reads_contract_validated_topology_incidents_and_analysis(keys: SigningKeys) -> None:
    headers = auth_headers(keys)
    async with client_for(keys) as client:
        topology = await client.get(f"/api/v1/sites/{SITE_ID}/topology", headers=headers)
        incidents = await client.get(f"/api/v1/sites/{SITE_ID}/incidents", headers=headers)
        incident = await client.get(f"/api/v1/incidents/{INCIDENT_ID}", headers=headers)
        analysis = await client.get(f"/api/v1/incidents/{INCIDENT_ID}/analysis", headers=headers)

    assert topology.status_code == 200
    assert topology.json()["tenantId"] == TENANT_ID
    assert topology.headers["cache-control"] == "no-store"
    assert incidents.json()["items"][0]["id"] == INCIDENT_ID
    assert incident.json()["snapshot"]["site"]["id"] == SITE_ID
    assert analysis.json()["probableCauseCandidates"][0]["target"]["id"] == NODE_ID


@pytest.mark.asyncio
async def test_probe_ingests_ordered_snapshot_and_operator_reads_live_result(
    keys: SigningKeys,
) -> None:
    snapshot = topology_snapshot(snapshot_id="snapshot:live:001")
    headers = probe_headers(
        keys,
        idempotency_key="topology-ingestion-key-0001",
        sequence=41,
    )
    async with client_for(keys) as client:
        accepted = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers=headers,
            json=snapshot,
        )
        replay = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers=headers,
            json=snapshot,
        )
        duplicate = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers=probe_headers(
                keys,
                idempotency_key="topology-ingestion-key-0002",
                sequence=41,
            ),
            json=snapshot,
        )
        current = await client.get(
            f"/api/v1/sites/{SITE_ID}/topology",
            headers=auth_headers(keys),
        )

    assert accepted.status_code == replay.status_code == 201
    assert accepted.json() == replay.json()
    assert accepted.json()["status"] == "accepted"
    assert accepted.json()["collectorId"] == "collector:test"
    assert duplicate.status_code == 200
    assert duplicate.json()["status"] == "duplicate"
    assert current.json()["snapshotId"] == snapshot["snapshotId"]


@pytest.mark.asyncio
async def test_probe_and_operator_roles_are_separated(keys: SigningKeys) -> None:
    snapshot = topology_snapshot(snapshot_id="snapshot:role:001")
    async with client_for(keys) as client:
        operator_ingestion = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers={
                **auth_headers(keys),
                "Idempotency-Key": "topology-role-key-000001",
                "X-Topology-Sequence": "1",
            },
            json=snapshot,
        )
        probe_read = await client.get(
            f"/api/v1/sites/{SITE_ID}/topology",
            headers=probe_headers(
                keys,
                idempotency_key="topology-role-key-000002",
                sequence=1,
            ),
        )

    assert operator_ingestion.status_code == 403
    assert probe_read.status_code == 403
    assert operator_ingestion.json()["code"] == probe_read.json()["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_ingestion_rejects_scope_collector_and_synthetic_claims(keys: SigningKeys) -> None:
    wrong_tenant = topology_snapshot(
        tenant_id=OTHER_TENANT_ID,
        snapshot_id="snapshot:wrong-tenant:001",
    )
    wrong_collector = topology_snapshot(
        snapshot_id="snapshot:wrong-collector:001",
        collector_id="collector:forged",
    )
    synthetic = topology_snapshot(snapshot_id="snapshot:synthetic:001")
    synthetic.update(
        {
            "synthetic": True,
            "syntheticDataNotice": "Synthetic test data.",
        }
    )
    async with client_for(keys) as client:
        responses = []
        for index, snapshot in enumerate((wrong_tenant, wrong_collector, synthetic), start=1):
            responses.append(
                await client.post(
                    f"/api/v1/sites/{SITE_ID}/topology/snapshots",
                    headers=probe_headers(
                        keys,
                        idempotency_key=f"topology-invalid-key-000{index}",
                        sequence=index,
                    ),
                    json=snapshot,
                )
            )

    assert [response.status_code for response in responses] == [422, 422, 422]
    assert all(response.json()["code"] == "VALIDATION_ERROR" for response in responses)
    assert OTHER_TENANT_ID not in str(responses[0].json())


@pytest.mark.asyncio
async def test_ingestion_requires_bounded_delivery_headers(keys: SigningKeys) -> None:
    token = make_token(keys, role="probe", subject="collector:test")
    async with client_for(keys) as client:
        missing = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers={"Authorization": f"Bearer {token}"},
            json=topology_snapshot(snapshot_id="snapshot:missing-headers:001"),
        )
        invalid_sequence = await client.post(
            f"/api/v1/sites/{SITE_ID}/topology/snapshots",
            headers={
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": "topology-invalid-sequence-01",
                "X-Topology-Sequence": "0",
            },
            json=topology_snapshot(snapshot_id="snapshot:invalid-sequence:001"),
        )

    assert missing.status_code == invalid_sequence.status_code == 422
    assert missing.json()["code"] == invalid_sequence.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_absent_and_cross_tenant_resources_are_indistinguishable(keys: SigningKeys) -> None:
    async with client_for(keys) as client:
        absent = await client.get(
            "/api/v1/sites/site:not-present/topology", headers=auth_headers(keys)
        )
        outside_scope = await client.get(
            f"/api/v1/sites/{SITE_ID}/topology",
            headers=auth_headers(keys, tenant_id=OTHER_TENANT_ID),
        )

    assert absent.status_code == outside_scope.status_code == 404
    assert absent.json()["code"] == outside_scope.json()["code"] == "RESOURCE_NOT_FOUND"
    assert absent.json()["detail"] == outside_scope.json()["detail"]
    assert TENANT_ID not in str(outside_scope.json())


@pytest.mark.asyncio
async def test_acknowledgement_is_idempotent_and_expected_state_is_enforced(
    keys: SigningKeys,
) -> None:
    headers = {
        **auth_headers(keys),
        "Idempotency-Key": "acknowledgement-key-0001",
    }
    async with client_for(keys) as client:
        first = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/acknowledgements",
            headers=headers,
            json={"expectedState": "open"},
        )
        replay = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/acknowledgements",
            headers=headers,
            json={"expectedState": "open"},
        )
        stale = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/acknowledgements",
            headers={**auth_headers(keys), "Idempotency-Key": "acknowledgement-key-0002"},
            json={"expectedState": "open"},
        )
        reused = await client.put(
            f"/api/v1/incidents/{INCIDENT_ID}/notes",
            headers=headers,
            json={"expectedState": "acknowledged", "notes": "Verified current evidence."},
        )

    assert first.status_code == replay.status_code == 200
    assert first.json() == replay.json()
    assert first.json()["state"] == "acknowledged"
    assert stale.status_code == 409
    assert stale.json()["code"] == "INCIDENT_STATE_CONFLICT"
    assert reused.status_code == 409
    assert reused.json()["code"] == "IDEMPOTENCY_CONFLICT"


@pytest.mark.asyncio
async def test_resolution_requires_senior_role_and_a_snapshot_entity(keys: SigningKeys) -> None:
    resolution = {
        "expectedState": "acknowledged",
        "resolutionNotes": "Verified the identity service health and restored operation.",
        "actualRootCauseEntityId": NODE_ID,
    }
    async with client_for(keys) as client:
        forbidden = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/resolution",
            headers={**auth_headers(keys), "Idempotency-Key": "resolution-role-key-01"},
            json=resolution,
        )

    assert forbidden.status_code == 403
    assert forbidden.json()["code"] == "FORBIDDEN"

    async with client_for(keys) as client:
        senior_headers = auth_headers(keys, role="senior")
        acknowledged = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/acknowledgements",
            headers={**senior_headers, "Idempotency-Key": "resolution-ack-key-01"},
            json={"expectedState": "open"},
        )
        invalid_root = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/resolution",
            headers={**senior_headers, "Idempotency-Key": "resolution-invalid-01"},
            json={**resolution, "actualRootCauseEntityId": "device:outside-snapshot"},
        )
        resolved = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/resolution",
            headers={**senior_headers, "Idempotency-Key": "resolution-valid-key-01"},
            json=resolution,
        )

    assert acknowledged.status_code == 200
    assert invalid_root.status_code == 422
    assert resolved.status_code == 200
    assert resolved.json()["state"] == "resolved"
    assert resolved.json()["resolvedAt"].endswith("Z")


@pytest.mark.asyncio
async def test_invalid_requests_are_bounded_and_do_not_echo_operator_notes(
    keys: SigningKeys,
) -> None:
    secret_notes = "sensitive operator text that must not be reflected"
    async with client_for(keys) as client:
        response = await client.put(
            f"/api/v1/incidents/{INCIDENT_ID}/notes",
            headers={
                **auth_headers(keys),
                "Idempotency-Key": "notes-invalid-key-0001",
            },
            json={"expectedState": "open", "notes": secret_notes, "actor": "forged-admin"},
        )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert secret_notes not in str(response.json())
    assert "forged-admin" not in str(response.json())


@pytest.mark.asyncio
async def test_framework_validation_and_unknown_cursor_use_safe_problem_responses(
    keys: SigningKeys,
) -> None:
    async with client_for(keys) as client:
        missing_header = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/acknowledgements",
            headers=auth_headers(keys),
            json={"expectedState": "open"},
        )
        unknown_cursor = await client.get(
            f"/api/v1/sites/{SITE_ID}/incidents?cursor=unknown",
            headers=auth_headers(keys),
        )
        historical_miss = await client.get(
            f"/api/v1/sites/{SITE_ID}/topology?observedAt=2026-08-09T00:00:00.000Z",
            headers=auth_headers(keys),
        )

    assert missing_header.status_code == 422
    assert missing_header.json()["violations"][0]["path"].startswith("/header/")
    assert unknown_cursor.status_code == 422
    assert historical_miss.status_code == 404


@pytest.mark.asyncio
async def test_notes_are_validated_and_incident_state_filter_is_applied(keys: SigningKeys) -> None:
    headers = auth_headers(keys)
    async with client_for(keys) as client:
        whitespace = await client.put(
            f"/api/v1/incidents/{INCIDENT_ID}/notes",
            headers={**headers, "Idempotency-Key": "notes-whitespace-key-01"},
            json={"expectedState": "open", "notes": "   "},
        )
        saved = await client.put(
            f"/api/v1/incidents/{INCIDENT_ID}/notes",
            headers={**headers, "Idempotency-Key": "notes-valid-key-00001"},
            json={"expectedState": "open", "notes": "Verified current evidence."},
        )
        open_incidents = await client.get(
            f"/api/v1/sites/{SITE_ID}/incidents?state=open", headers=headers
        )
        resolved_incidents = await client.get(
            f"/api/v1/sites/{SITE_ID}/incidents?state=resolved", headers=headers
        )

    assert whitespace.status_code == 422
    assert saved.status_code == 200
    assert open_incidents.json()["items"][0]["id"] == INCIDENT_ID
    assert resolved_incidents.json()["items"] == []


@pytest.mark.asyncio
async def test_concurrent_retries_produce_one_idempotent_transition(keys: SigningKeys) -> None:
    contracts = contract_registry()
    repo = repository(contracts)
    request = {
        "tenant_id": TENANT_ID,
        "incident_id": INCIDENT_ID,
        "actor": "operator:mutale",
        "occurred_at": "2026-08-09T12:00:00.000Z",
        "expected_state": "open",
        "idempotency_key": "concurrent-ack-key-0001",
    }

    first, second = await asyncio.gather(repo.acknowledge(**request), repo.acknowledge(**request))

    assert first == second
    assert first["state"] == "acknowledged"


class _CrossScopeTopologyRepository:
    async def get_snapshot(
        self, tenant_id: str, site_id: str, observed_at: str | None
    ) -> dict[str, Any]:
        return topology_snapshot(tenant_id=OTHER_TENANT_ID, site_id=site_id)


class _FailingTopologyRepository:
    async def get_snapshot(
        self, tenant_id: str, site_id: str, observed_at: str | None
    ) -> dict[str, Any]:
        raise RuntimeError("database details that must not escape")


class _CrossScopeAnalysisRepository:
    def __init__(self, delegate: MemoryPlatformRepository) -> None:
        self._delegate = delegate

    async def get_incident_case(self, tenant_id: str, incident_id: str) -> dict[str, Any]:
        return await self._delegate.get_incident_case(tenant_id, incident_id)

    async def get_incident_analysis(self, tenant_id: str, incident_id: str) -> dict[str, Any]:
        analysis = await self._delegate.get_incident_analysis(tenant_id, incident_id)
        analysis["tenantId"] = OTHER_TENANT_ID
        return analysis


@pytest.mark.asyncio
async def test_repository_scope_leak_is_blocked_as_an_internal_contract_failure(
    keys: SigningKeys,
) -> None:
    contracts = contract_registry()
    incident_repo = repository(contracts)
    app = create_app(
        authenticator=authenticator(keys),
        contracts=contracts,
        topology_repository=_CrossScopeTopologyRepository(),
        topology_ingestion_repository=incident_repo,
        incident_repository=incident_repo,
        ingestion_rate_limiter=AllowAllRateLimiter(),
        readiness_probe=StaticReadinessProbe(),
        max_request_body_bytes=32 * 1024 * 1024,
        now=lambda: NOW,
        trace_id_factory=lambda: "trace_scope_failure_001",
    )
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="https://platform.test") as client:
        response = await client.get(f"/api/v1/sites/{SITE_ID}/topology", headers=auth_headers(keys))

    assert response.status_code == 500
    assert response.json() == {
        "type": "https://problems.netsense.example/internal-error",
        "title": "Internal service error",
        "status": 500,
        "code": "INTERNAL_ERROR",
        "traceId": "trace_scope_failure_001",
    }
    assert OTHER_TENANT_ID not in str(response.json())


@pytest.mark.asyncio
async def test_analysis_scope_leak_is_blocked_as_an_internal_contract_failure(
    keys: SigningKeys,
) -> None:
    contracts = contract_registry()
    configured_repository = repository(contracts)
    app = create_app(
        authenticator=authenticator(keys),
        contracts=contracts,
        topology_repository=configured_repository,
        topology_ingestion_repository=configured_repository,
        incident_repository=_CrossScopeAnalysisRepository(configured_repository),
        ingestion_rate_limiter=AllowAllRateLimiter(),
        readiness_probe=StaticReadinessProbe(),
        max_request_body_bytes=32 * 1024 * 1024,
        now=lambda: NOW,
        trace_id_factory=lambda: "trace_analysis_scope_failure_001",
    )
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="https://platform.test") as client:
        response = await client.get(
            f"/api/v1/incidents/{INCIDENT_ID}/analysis", headers=auth_headers(keys)
        )

    assert response.status_code == 500
    assert response.json()["code"] == "INTERNAL_ERROR"
    assert response.json()["traceId"] == "trace_analysis_scope_failure_001"
    assert OTHER_TENANT_ID not in str(response.json())


@pytest.mark.asyncio
async def test_unexpected_repository_failure_is_non_disclosing(keys: SigningKeys) -> None:
    contracts = contract_registry()
    incident_repo = repository(contracts)
    app = create_app(
        authenticator=authenticator(keys),
        contracts=contracts,
        topology_repository=_FailingTopologyRepository(),
        topology_ingestion_repository=incident_repo,
        incident_repository=incident_repo,
        ingestion_rate_limiter=AllowAllRateLimiter(),
        readiness_probe=StaticReadinessProbe(),
        max_request_body_bytes=32 * 1024 * 1024,
        now=lambda: NOW,
        trace_id_factory=lambda: "trace_repository_failure_001",
    )
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="https://platform.test") as client:
        response = await client.get(f"/api/v1/sites/{SITE_ID}/topology", headers=auth_headers(keys))

    assert response.status_code == 500
    assert response.json()["code"] == "INTERNAL_ERROR"
    assert "database details" not in str(response.json())
