from __future__ import annotations

import asyncio

import pytest

from netsense_platform.admission import InMemoryFixedWindowRateLimiter, RateLimitKey

KEY = RateLimitKey(
    tenant_id="tenant:test",
    site_id="site:test",
    collector_id="collector:test",
)


@pytest.mark.asyncio
async def test_fixed_window_limit_reports_retry_and_resets() -> None:
    now = [100.0]
    limiter = InMemoryFixedWindowRateLimiter(
        limit=2,
        window_seconds=60,
        clock=lambda: now[0],
    )

    assert (await limiter.acquire(KEY)).allowed
    assert (await limiter.acquire(KEY)).allowed
    rejected = await limiter.acquire(KEY)
    assert not rejected.allowed
    assert rejected.retry_after_seconds == 60

    now[0] = 159.2
    assert (await limiter.acquire(KEY)).retry_after_seconds == 1
    now[0] = 160.0
    assert (await limiter.acquire(KEY)).allowed


@pytest.mark.asyncio
async def test_fixed_window_isolates_keys_and_bounds_key_memory() -> None:
    now = [10.0]
    limiter = InMemoryFixedWindowRateLimiter(
        limit=1,
        window_seconds=10,
        max_keys=1,
        clock=lambda: now[0],
    )
    other = RateLimitKey("tenant:test", "site:other", "collector:test")

    assert (await limiter.acquire(KEY)).allowed
    capacity_rejection = await limiter.acquire(other)
    assert not capacity_rejection.allowed
    assert capacity_rejection.retry_after_seconds == 10

    now[0] = 20.0
    assert (await limiter.acquire(other)).allowed


@pytest.mark.asyncio
async def test_fixed_window_is_concurrency_safe() -> None:
    limiter = InMemoryFixedWindowRateLimiter(limit=3, window_seconds=60)
    decisions = await asyncio.gather(*(limiter.acquire(KEY) for _ in range(12)))

    assert sum(decision.allowed for decision in decisions) == 3
    assert all(
        decision.allowed or decision.retry_after_seconds is not None for decision in decisions
    )


@pytest.mark.parametrize(
    "options",
    [
        {"limit": 0, "window_seconds": 1},
        {"limit": 1, "window_seconds": 0},
        {"limit": 1, "window_seconds": 1, "max_keys": 0},
    ],
)
def test_fixed_window_configuration_fails_closed(options: dict[str, int]) -> None:
    with pytest.raises(ValueError):
        InMemoryFixedWindowRateLimiter(**options)
