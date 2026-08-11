from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

import pytest
import pytest_asyncio
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncEngine

from netsense_platform.application import create_app
from netsense_platform.contracts import ContractRegistry
from netsense_platform.database import create_database_engine, tenant_transaction
from netsense_platform.db_schema import (
    idempotency_records,
    incident_actions,
    incident_analyses,
    incident_cases,
    topology_ingestion_receipts,
    topology_ingestion_state,
    topology_snapshots,
)
from netsense_platform.errors import RepositoryConflictError, RepositoryValidationError
from netsense_platform.postgres_repository import PostgresPlatformRepository
from netsense_platform.repositories import TopologyIngestionCommand

from .support import (
    INCIDENT_ID,
    NODE_ID,
    OTHER_TENANT_ID,
    SITE_ID,
    TENANT_ID,
    authenticator,
    contract_registry,
    incident_analysis,
    incident_case,
    make_token,
    signing_keys,
    topology_snapshot,
)

ADMIN_URL_ENV = "NETSENSE_TEST_DATABASE_URL"
APP_URL_ENV = "NETSENSE_TEST_APP_DATABASE_URL"


@contextmanager
def _migration_url(database_url: str):
    previous = os.environ.get("NETSENSE_DATABASE_URL")
    os.environ["NETSENSE_DATABASE_URL"] = database_url
    try:
        yield
    finally:
        if previous is None:
            os.environ.pop("NETSENSE_DATABASE_URL", None)
        else:
            os.environ["NETSENSE_DATABASE_URL"] = previous


@pytest.fixture(scope="session")
def database_urls() -> tuple[str, str]:
    admin_url = os.environ.get(ADMIN_URL_ENV)
    app_url = os.environ.get(APP_URL_ENV)
    if not admin_url or not app_url:
        pytest.skip(f"PostgreSQL integration requires {ADMIN_URL_ENV} and {APP_URL_ENV}.")
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    with _migration_url(admin_url):
        command.upgrade(config, "head")
    asyncio.run(_configure_application_role(admin_url))
    return admin_url, app_url


async def _configure_application_role(admin_url: str) -> None:
    engine = create_database_engine(admin_url, pool_size=1, max_overflow=0)
    statements = (
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'netsense_app') THEN
            CREATE ROLE netsense_app LOGIN PASSWORD 'netsense_app_test_only'
              NOSUPERUSER NOBYPASSRLS;
          END IF;
        END
        $$
        """,
        "ALTER ROLE netsense_app NOSUPERUSER NOBYPASSRLS",
        "GRANT USAGE ON SCHEMA public TO netsense_app",
        (
            "GRANT SELECT ON topology_snapshots, topology_ingestion_state, "
            "topology_ingestion_receipts, incident_cases, incident_analyses, "
            "incident_actions, idempotency_records TO netsense_app"
        ),
        (
            "GRANT INSERT ON topology_snapshots, topology_ingestion_state, "
            "topology_ingestion_receipts, incident_actions, idempotency_records "
            "TO netsense_app"
        ),
        "GRANT UPDATE ON topology_ingestion_state, incident_cases TO netsense_app",
        "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO netsense_app",
    )
    async with engine.begin() as connection:
        for statement in statements:
            await connection.execute(sa.text(statement))
    await engine.dispose()


@pytest_asyncio.fixture
async def repositories(
    database_urls: tuple[str, str],
) -> AsyncIterator[tuple[PostgresPlatformRepository, AsyncEngine, AsyncEngine, ContractRegistry]]:
    admin_url, app_url = database_urls
    admin_engine = create_database_engine(admin_url, pool_size=2, max_overflow=0)
    app_engine = create_database_engine(app_url, pool_size=4, max_overflow=0)
    contracts = contract_registry()
    await _reset_and_seed(admin_engine, contracts)
    yield (
        PostgresPlatformRepository(engine=app_engine, contracts=contracts),
        app_engine,
        admin_engine,
        contracts,
    )
    await app_engine.dispose()
    await admin_engine.dispose()


async def _reset_and_seed(admin_engine: AsyncEngine, contracts: ContractRegistry) -> None:
    first_snapshot = contracts.validate("topology_snapshot", topology_snapshot())
    second_snapshot = contracts.validate(
        "topology_snapshot", topology_snapshot(tenant_id=OTHER_TENANT_ID)
    )
    first_case = contracts.validate("incident_case", incident_case())
    second_case = contracts.validate("incident_case", incident_case(tenant_id=OTHER_TENANT_ID))
    first_analysis = contracts.validate("incident_analysis", incident_analysis())
    second_analysis = contracts.validate(
        "incident_analysis", incident_analysis(tenant_id=OTHER_TENANT_ID)
    )
    async with admin_engine.begin() as connection:
        await connection.execute(
            sa.text(
                "TRUNCATE idempotency_records, incident_actions, incident_analyses, "
                "incident_cases, topology_ingestion_receipts, topology_ingestion_state, "
                "topology_snapshots RESTART IDENTITY CASCADE"
            )
        )
        for snapshot in (first_snapshot, second_snapshot):
            await connection.execute(
                sa.insert(topology_snapshots).values(
                    tenant_id=snapshot["tenantId"],
                    snapshot_id=snapshot["snapshotId"],
                    site_id=snapshot["site"]["id"],
                    observed_at=_timestamp(snapshot["observedAt"]),
                    payload=snapshot,
                )
            )
        for case in (first_case, second_case):
            incident = case["incident"]
            await connection.execute(
                sa.insert(incident_cases).values(
                    tenant_id=incident["tenantId"],
                    incident_id=incident["id"],
                    site_id=incident["siteId"],
                    state=incident["state"],
                    detected_at=_timestamp(incident["detectedAt"]),
                    payload=case,
                )
            )
        for analysis in (first_analysis, second_analysis):
            await connection.execute(
                sa.insert(incident_analyses).values(
                    tenant_id=analysis["tenantId"],
                    incident_id=analysis["incidentId"],
                    site_id=analysis["siteId"],
                    analysed_at=_timestamp(analysis["analysedAt"]),
                    payload=analysis,
                )
            )


@pytest.mark.asyncio
async def test_reads_are_contract_validated_and_isolated_by_forced_rls(repositories) -> None:
    repository, app_engine, _, _ = repositories
    first = await repository.get_snapshot(TENANT_ID, SITE_ID, None)
    second = await repository.get_snapshot(OTHER_TENANT_ID, SITE_ID, None)
    incidents = await repository.list_incidents(TENANT_ID, SITE_ID, "open")
    case = await repository.get_incident_case(TENANT_ID, INCIDENT_ID)
    analysis = await repository.get_incident_analysis(TENANT_ID, INCIDENT_ID)

    assert first["tenantId"] == TENANT_ID
    assert second["tenantId"] == OTHER_TENANT_ID
    assert incidents[0]["tenantId"] == TENANT_ID
    assert case["incident"]["tenantId"] == TENANT_ID
    assert analysis["tenantId"] == TENANT_ID

    async with app_engine.begin() as connection:
        visible_without_context = (
            await connection.execute(sa.select(sa.func.count()).select_from(incident_cases))
        ).scalar_one()
    assert visible_without_context == 0


def _ingestion_command(
    *,
    sequence: int,
    snapshot_id: str,
    idempotency_key: str,
    collector_id: str = "collector:test",
) -> TopologyIngestionCommand:
    return TopologyIngestionCommand(
        tenant_id=TENANT_ID,
        site_id=SITE_ID,
        collector_id=collector_id,
        sequence=sequence,
        idempotency_key=idempotency_key,
        accepted_at=datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        snapshot=topology_snapshot(snapshot_id=snapshot_id, collector_id=collector_id),
    )


@pytest.mark.asyncio
async def test_topology_ingestion_is_ordered_idempotent_atomic_and_current(repositories) -> None:
    repository, app_engine, _, _ = repositories
    first_command = _ingestion_command(
        sequence=40,
        snapshot_id="snapshot:postgres:040",
        idempotency_key="postgres-topology-key-040",
    )
    first, replay = await asyncio.gather(
        repository.ingest_snapshot(first_command),
        repository.ingest_snapshot(first_command),
    )
    duplicate = await repository.ingest_snapshot(
        _ingestion_command(
            sequence=40,
            snapshot_id="snapshot:postgres:040",
            idempotency_key="postgres-topology-duplicate-040",
        )
    )
    second = await repository.ingest_snapshot(
        _ingestion_command(
            sequence=41,
            snapshot_id="snapshot:postgres:041",
            idempotency_key="postgres-topology-key-041",
        )
    )

    assert first == replay
    assert first["status"] == second["status"] == "accepted"
    assert duplicate["status"] == "duplicate"
    assert (await repository.get_snapshot(TENANT_ID, SITE_ID, None))["snapshotId"] == (
        "snapshot:postgres:041"
    )
    async with tenant_transaction(app_engine, TENANT_ID) as connection:
        snapshot_count = (
            await connection.execute(sa.select(sa.func.count()).select_from(topology_snapshots))
        ).scalar_one()
        receipt_count = (
            await connection.execute(
                sa.select(sa.func.count()).select_from(topology_ingestion_receipts)
            )
        ).scalar_one()
        cursor = (
            await connection.execute(
                sa.select(
                    topology_ingestion_state.c.last_sequence,
                    topology_ingestion_state.c.last_snapshot_id,
                )
            )
        ).one()
    assert snapshot_count == 3
    assert receipt_count == 3
    assert tuple(cursor) == (41, "snapshot:postgres:041")


@pytest.mark.asyncio
async def test_topology_gap_rolls_back_without_snapshot_or_receipt(repositories) -> None:
    repository, app_engine, _, _ = repositories
    await repository.ingest_snapshot(
        _ingestion_command(
            sequence=7,
            snapshot_id="snapshot:postgres:007",
            idempotency_key="postgres-topology-key-007",
        )
    )
    with pytest.raises(RepositoryConflictError) as captured:
        await repository.ingest_snapshot(
            _ingestion_command(
                sequence=9,
                snapshot_id="snapshot:postgres:009",
                idempotency_key="postgres-topology-key-009",
            )
        )
    assert captured.value.code == "TOPOLOGY_SEQUENCE_GAP"
    with pytest.raises(RepositoryConflictError) as collector_conflict:
        await repository.ingest_snapshot(
            _ingestion_command(
                sequence=1,
                snapshot_id="snapshot:postgres:other-collector",
                idempotency_key="postgres-topology-other-collector",
                collector_id="collector:other",
            )
        )
    assert collector_conflict.value.code == "TOPOLOGY_COLLECTOR_CONFLICT"
    async with tenant_transaction(app_engine, TENANT_ID) as connection:
        rejected_snapshot = (
            await connection.execute(
                sa.select(topology_snapshots.c.snapshot_id).where(
                    topology_snapshots.c.snapshot_id == "snapshot:postgres:009"
                )
            )
        ).scalar_one_or_none()
        receipt_count = (
            await connection.execute(
                sa.select(sa.func.count()).select_from(topology_ingestion_receipts)
            )
        ).scalar_one()
    assert rejected_snapshot is None
    assert receipt_count == 1


@pytest.mark.asyncio
async def test_authenticated_api_composes_with_durable_repository(repositories) -> None:
    repository, _, _, contracts = repositories
    keys = signing_keys()
    app = create_app(
        authenticator=authenticator(keys),
        contracts=contracts,
        topology_repository=repository,
        topology_ingestion_repository=repository,
        incident_repository=repository,
        trace_id_factory=lambda: "trace_postgres_integration_001",
    )
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    headers = {"Authorization": f"Bearer {make_token(keys)}"}
    async with AsyncClient(transport=transport, base_url="https://platform.test") as client:
        topology = await client.get(f"/api/v1/sites/{SITE_ID}/topology", headers=headers)
        acknowledgement = await client.post(
            f"/api/v1/incidents/{INCIDENT_ID}/acknowledgements",
            headers={**headers, "Idempotency-Key": "postgres-api-ack-key-01"},
            json={"expectedState": "open"},
        )

    assert topology.status_code == 200
    assert topology.json()["tenantId"] == TENANT_ID
    assert acknowledgement.status_code == 200
    assert acknowledgement.json()["state"] == "acknowledged"
    persisted = await repository.get_incident_case(TENANT_ID, INCIDENT_ID)
    assert persisted["incident"]["state"] == "acknowledged"


@pytest.mark.asyncio
async def test_mutations_are_atomic_idempotent_and_append_audit_actions(repositories) -> None:
    repository, app_engine, admin_engine, _ = repositories
    acknowledgement = await repository.acknowledge(
        tenant_id=TENANT_ID,
        incident_id=INCIDENT_ID,
        actor="operator:mutale",
        occurred_at="2026-08-10T08:00:00.000Z",
        expected_state="open",
        idempotency_key="postgres-ack-key-0001",
    )
    replay = await repository.acknowledge(
        tenant_id=TENANT_ID,
        incident_id=INCIDENT_ID,
        actor="operator:mutale",
        occurred_at="2026-08-10T08:00:00.000Z",
        expected_state="open",
        idempotency_key="postgres-ack-key-0001",
    )
    await repository.update_notes(
        tenant_id=TENANT_ID,
        incident_id=INCIDENT_ID,
        actor="operator:mutale",
        occurred_at="2026-08-10T08:01:00.000Z",
        expected_state="acknowledged",
        notes="Validated current identity-service evidence.",
        idempotency_key="postgres-note-key-0001",
    )
    resolution = await repository.resolve(
        tenant_id=TENANT_ID,
        incident_id=INCIDENT_ID,
        actor="operator:senior",
        occurred_at="2026-08-10T08:02:00.000Z",
        expected_state="acknowledged",
        resolution_notes="Restored the affected identity service after verification.",
        actual_root_cause_entity_id=NODE_ID,
        idempotency_key="postgres-resolve-0001",
    )

    assert acknowledgement == replay
    assert resolution["state"] == "resolved"
    async with tenant_transaction(app_engine, TENANT_ID) as connection:
        actions = (
            (
                await connection.execute(
                    sa.select(incident_actions.c.kind).order_by(incident_actions.c.action_id)
                )
            )
            .scalars()
            .all()
        )
        idempotency_count = (
            await connection.execute(sa.select(sa.func.count()).select_from(idempotency_records))
        ).scalar_one()
    assert actions == ["acknowledged", "note_updated", "resolved"]
    assert idempotency_count == 3
    async with admin_engine.connect() as connection:
        other_tenant_state = (
            await connection.execute(
                sa.select(incident_cases.c.state).where(
                    incident_cases.c.tenant_id == OTHER_TENANT_ID,
                    incident_cases.c.incident_id == INCIDENT_ID,
                )
            )
        ).scalar_one()
    assert other_tenant_state == "open"


@pytest.mark.asyncio
async def test_concurrent_duplicate_mutation_commits_once(repositories) -> None:
    repository, app_engine, _, _ = repositories
    request = {
        "tenant_id": TENANT_ID,
        "incident_id": INCIDENT_ID,
        "actor": "operator:mutale",
        "occurred_at": "2026-08-10T08:00:00.000Z",
        "expected_state": "open",
        "idempotency_key": "postgres-concurrent-ack-01",
    }
    first, second = await asyncio.gather(
        repository.acknowledge(**request), repository.acknowledge(**request)
    )
    assert first == second
    async with tenant_transaction(app_engine, TENANT_ID) as connection:
        action_count = (
            await connection.execute(sa.select(sa.func.count()).select_from(incident_actions))
        ).scalar_one()
    assert action_count == 1


@pytest.mark.asyncio
async def test_conflicts_and_invalid_resolution_roll_back_without_partial_audit(
    repositories,
) -> None:
    repository, app_engine, _, _ = repositories
    await repository.acknowledge(
        tenant_id=TENANT_ID,
        incident_id=INCIDENT_ID,
        actor="operator:mutale",
        occurred_at="2026-08-10T08:00:00.000Z",
        expected_state="open",
        idempotency_key="postgres-rollback-ack-01",
    )
    with pytest.raises(RepositoryConflictError):
        await repository.update_notes(
            tenant_id=TENANT_ID,
            incident_id=INCIDENT_ID,
            actor="operator:mutale",
            occurred_at="2026-08-10T08:01:00.000Z",
            expected_state="acknowledged",
            notes="Different operation with a reused key.",
            idempotency_key="postgres-rollback-ack-01",
        )
    with pytest.raises(RepositoryValidationError):
        await repository.resolve(
            tenant_id=TENANT_ID,
            incident_id=INCIDENT_ID,
            actor="operator:senior",
            occurred_at="2026-08-10T08:02:00.000Z",
            expected_state="acknowledged",
            resolution_notes="This resolution references an invalid entity.",
            actual_root_cause_entity_id="device:not-in-snapshot",
            idempotency_key="postgres-invalid-root-01",
        )
    async with tenant_transaction(app_engine, TENANT_ID) as connection:
        row = (
            await connection.execute(
                sa.select(incident_cases.c.state, incident_cases.c.resolved_at).where(
                    incident_cases.c.incident_id == INCIDENT_ID
                )
            )
        ).one()
        action_count = (
            await connection.execute(sa.select(sa.func.count()).select_from(incident_actions))
        ).scalar_one()
    assert tuple(row) == ("acknowledged", None)
    assert action_count == 1


@pytest.mark.asyncio
async def test_audit_rows_reject_update_and_delete_even_for_schema_owner(repositories) -> None:
    repository, _, admin_engine, _ = repositories
    await repository.acknowledge(
        tenant_id=TENANT_ID,
        incident_id=INCIDENT_ID,
        actor="operator:mutale",
        occurred_at="2026-08-10T08:00:00.000Z",
        expected_state="open",
        idempotency_key="postgres-audit-immutable-01",
    )
    for statement in (
        sa.update(incident_actions).values(actor="operator:forged"),
        sa.delete(incident_actions),
    ):
        with pytest.raises(DBAPIError):
            async with admin_engine.begin() as connection:
                await connection.execute(statement)


@pytest.mark.asyncio
async def test_database_constraints_reject_mis_scoped_json(repositories) -> None:
    _, _, admin_engine, contracts = repositories
    snapshot = contracts.validate("topology_snapshot", topology_snapshot())
    with pytest.raises(DBAPIError):
        async with admin_engine.begin() as connection:
            await connection.execute(
                sa.insert(topology_snapshots).values(
                    tenant_id=OTHER_TENANT_ID,
                    snapshot_id="snapshot:invalid-scope",
                    site_id=SITE_ID,
                    observed_at=_timestamp(snapshot["observedAt"]),
                    payload=snapshot,
                )
            )
    with pytest.raises(DBAPIError):
        async with admin_engine.begin() as connection:
            await connection.execute(
                sa.insert(topology_snapshots).values(
                    tenant_id=TENANT_ID,
                    snapshot_id="snapshot:missing-scope",
                    site_id=SITE_ID,
                    observed_at=_timestamp(snapshot["observedAt"]),
                    payload={},
                )
            )


@pytest.mark.asyncio
async def test_every_tenant_table_has_one_forced_rls_policy(repositories) -> None:
    _, _, admin_engine, _ = repositories
    expected = {
        "topology_snapshots",
        "topology_ingestion_state",
        "topology_ingestion_receipts",
        "incident_cases",
        "incident_analyses",
        "incident_actions",
        "idempotency_records",
    }
    async with admin_engine.connect() as connection:
        rows = (
            (
                await connection.execute(
                    sa.text(
                        """
                    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
                           count(p.polname) AS policy_count
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    LEFT JOIN pg_policy p ON p.polrelid = c.oid
                    WHERE n.nspname = 'public' AND c.relname = ANY(:table_names)
                    GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
                    """
                    ),
                    {"table_names": sorted(expected)},
                )
            )
            .mappings()
            .all()
        )
        app_role = (
            await connection.execute(
                sa.text(
                    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'netsense_app'"
                )
            )
        ).one()
    assert {row["relname"] for row in rows} == expected
    assert all(row["relrowsecurity"] and row["relforcerowsecurity"] for row in rows)
    assert all(row["policy_count"] == 1 for row in rows)
    assert tuple(app_role) == (False, False)


def _timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
