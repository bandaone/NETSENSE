from __future__ import annotations

import asyncio

import pytest

from netsense_platform.readiness import PostgresReadinessProbe


class _FailingEngine:
    def connect(self):
        raise RuntimeError("sensitive dependency detail")


class _SlowConnectionContext:
    async def __aenter__(self):
        await asyncio.sleep(1)

    async def __aexit__(self, exception_type, exception, traceback):
        return False


class _SlowEngine:
    def connect(self):
        return _SlowConnectionContext()


@pytest.mark.asyncio
async def test_postgres_readiness_converts_dependency_failure_to_unavailable() -> None:
    probe = PostgresReadinessProbe(engine=_FailingEngine())  # type: ignore[arg-type]
    assert not await probe.is_ready()


@pytest.mark.asyncio
async def test_postgres_readiness_is_time_bounded() -> None:
    probe = PostgresReadinessProbe(  # type: ignore[arg-type]
        engine=_SlowEngine(),
        timeout_seconds=0.01,
    )
    assert not await probe.is_ready()


def test_postgres_readiness_rejects_invalid_timeout() -> None:
    with pytest.raises(ValueError):
        PostgresReadinessProbe(engine=_FailingEngine(), timeout_seconds=0)  # type: ignore[arg-type]
