from __future__ import annotations

import pytest

from netsense_platform.database import create_database_engine, tenant_transaction
from netsense_platform.errors import RepositoryValidationError
from netsense_platform.workflow import json_object, require_visible_text


def test_database_engine_requires_postgresql_asyncpg_and_valid_pool_limits() -> None:
    for url in (
        "sqlite+aiosqlite:///test.db",
        "postgresql://user:password@localhost/netsense",
        "postgresql+asyncpg://user:password@localhost",
    ):
        with pytest.raises(ValueError):
            create_database_engine(url)

    with pytest.raises(ValueError):
        create_database_engine(
            "postgresql+asyncpg://user:password@localhost/netsense",
            pool_size=0,
        )


def test_shared_workflow_validation_rejects_invalid_values() -> None:
    with pytest.raises(RepositoryValidationError):
        require_visible_text("   ", minimum=1, message="Visible text is required.")
    with pytest.raises(TypeError):
        json_object(["not", "an", "object"])
    assert json_object({"valid": True}) == {"valid": True}


@pytest.mark.asyncio
async def test_tenant_transaction_rejects_empty_scope_before_connection() -> None:
    with pytest.raises(ValueError, match="tenant identity"):
        async with tenant_transaction(None, "   "):  # type: ignore[arg-type]
            pytest.fail("An empty tenant must never open a transaction.")
