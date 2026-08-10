from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine


def create_database_engine(
    database_url: str,
    *,
    pool_size: int = 10,
    max_overflow: int = 20,
) -> AsyncEngine:
    url = make_url(database_url)
    if url.drivername != "postgresql+asyncpg":
        raise ValueError("The platform database must use postgresql+asyncpg.")
    if not url.database:
        raise ValueError("The platform database name is required.")
    if pool_size < 1 or max_overflow < 0:
        raise ValueError("Database pool limits are invalid.")
    return create_async_engine(
        url,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
        connect_args={"server_settings": {"application_name": "netsense-platform"}},
    )


@asynccontextmanager
async def tenant_transaction(
    engine: AsyncEngine,
    tenant_id: str,
) -> AsyncIterator[AsyncConnection]:
    if not tenant_id.strip():
        raise ValueError("A tenant identity is required for database access.")
    async with engine.begin() as connection:
        await connection.execute(
            text("SELECT set_config('netsense.tenant_id', :tenant_id, true)"),
            {"tenant_id": tenant_id},
        )
        yield connection
