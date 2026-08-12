from __future__ import annotations

import asyncio
import logging
from typing import Protocol

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncEngine

LOGGER = logging.getLogger("netsense.platform.readiness")

REQUIRED_TABLE_PRIVILEGES = (
    ("topology_snapshots", "SELECT,INSERT"),
    ("topology_ingestion_state", "SELECT,INSERT,UPDATE"),
    ("topology_ingestion_receipts", "SELECT,INSERT"),
    ("incident_cases", "SELECT,UPDATE"),
    ("incident_analyses", "SELECT"),
    ("incident_actions", "SELECT,INSERT"),
    ("idempotency_records", "SELECT,INSERT"),
)
_REQUIREMENTS_VALUES = ",".join(
    f"('{table_name}', '{privileges}')" for table_name, privileges in REQUIRED_TABLE_PRIVILEGES
)
_RELATION_CHECK = sa.text(
    f"""
    WITH requirements(table_name, privileges) AS (
        VALUES {_REQUIREMENTS_VALUES}
    )
    SELECT
        bool_and(
            to_regclass(format('public.%I', requirements.table_name)) IS NOT NULL
            AND has_table_privilege(
                current_user,
                format('public.%I', requirements.table_name),
                requirements.privileges
            )
            AND COALESCE(security.relrowsecurity, false)
            AND COALESCE(security.relforcerowsecurity, false)
            AND COALESCE(security.has_tenant_policy, false)
        )
        AND to_regclass('public.incident_actions_action_id_seq') IS NOT NULL
        AND has_sequence_privilege(
            current_user,
            'public.incident_actions_action_id_seq',
            'USAGE,SELECT'
        )
    FROM requirements
    LEFT JOIN LATERAL (
        SELECT
            class.relrowsecurity,
            class.relforcerowsecurity,
            EXISTS (
                SELECT 1
                FROM pg_policy
                WHERE pg_policy.polrelid = class.oid
            ) AS has_tenant_policy
        FROM pg_class AS class
        JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
        WHERE namespace.nspname = 'public'
          AND class.relname = requirements.table_name
    ) AS security ON true
    """
)


class ReadinessProbe(Protocol):
    async def is_ready(self) -> bool: ...


class StaticReadinessProbe:
    """Explicit deterministic adapter for tests and local development."""

    def __init__(self, ready: bool = True) -> None:
        self.ready = ready

    async def is_ready(self) -> bool:
        return self.ready


class PostgresReadinessProbe:
    def __init__(self, *, engine: AsyncEngine, timeout_seconds: float = 2.0) -> None:
        if timeout_seconds <= 0:
            raise ValueError("Readiness timeout must be positive.")
        self._engine = engine
        self._timeout_seconds = timeout_seconds

    async def is_ready(self) -> bool:
        try:
            async with asyncio.timeout(self._timeout_seconds):
                async with self._engine.connect() as connection:
                    return bool((await connection.execute(_RELATION_CHECK)).scalar_one())
        except Exception as error:
            LOGGER.warning(
                "Platform readiness dependency check failed error_type=%s",
                type(error).__name__,
            )
            return False
