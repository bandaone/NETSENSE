from __future__ import annotations

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def _database_url() -> str:
    value = os.environ.get("NETSENSE_DATABASE_URL", "").strip()
    if not value:
        raise RuntimeError("NETSENSE_DATABASE_URL is required for database migrations.")
    if not value.startswith("postgresql+asyncpg://"):
        raise RuntimeError("NETSENSE_DATABASE_URL must use the postgresql+asyncpg driver.")
    return value


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def _run_sync_migrations(connection) -> None:
    context.configure(connection=connection)
    with context.begin_transaction():
        context.run_migrations()


async def _run_online_migrations() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = _database_url()
    engine = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with engine.connect() as connection:
        await connection.run_sync(_run_sync_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(_run_online_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
