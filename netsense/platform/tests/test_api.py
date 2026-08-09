from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from netsense_platform.application import create_app
from netsense_platform.memory_repository import MemoryPlatformRepository

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


def make_app(keys: SigningKeys, repo: MemoryPlatformRepository | None = None):
    contracts = contract_registry()
    configured_repository = repo or repository(contracts)
    return create_app(
        authenticator=authenticator(keys),
        contracts=contracts,
        topology_repository=configured_repository,
        incident_repository=configured_repository,
        now=lambda: NOW,
        trace_id_factory=lambda: "trace_platform_test_001",
    )


@asynccontextmanager
async def client_for(
    keys: SigningKeys, repo: MemoryPlatformRepository | None = None
) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=make_app(keys, repo), raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="https://platform.test") as client:
        yield client


def auth_headers(keys: SigningKeys, *, role: str = "engineer", tenant_id: str = TENANT_ID):
    return {"Authorization": f"Bearer {make_token(keys, role=role, tenant_id=tenant_id)}"}


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
        incident_repository=incident_repo,
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
        incident_repository=_CrossScopeAnalysisRepository(configured_repository),
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
        incident_repository=incident_repo,
        now=lambda: NOW,
        trace_id_factory=lambda: "trace_repository_failure_001",
    )
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="https://platform.test") as client:
        response = await client.get(f"/api/v1/sites/{SITE_ID}/topology", headers=auth_headers(keys))

    assert response.status_code == 500
    assert response.json()["code"] == "INTERNAL_ERROR"
    assert "database details" not in str(response.json())
