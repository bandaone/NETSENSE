from __future__ import annotations

import asyncio
import math
from collections.abc import Callable
from dataclasses import dataclass
from time import monotonic
from typing import Protocol


@dataclass(frozen=True, slots=True)
class RateLimitKey:
    tenant_id: str
    site_id: str
    collector_id: str


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int | None = None


class RateLimiter(Protocol):
    async def acquire(self, key: RateLimitKey) -> RateLimitDecision: ...


class AllowAllRateLimiter:
    """Explicit no-limit adapter for deterministic tests and local development."""

    async def acquire(self, key: RateLimitKey) -> RateLimitDecision:
        del key
        return RateLimitDecision(allowed=True)


@dataclass(slots=True)
class _Window:
    started_at: float
    attempts: int


class InMemoryFixedWindowRateLimiter:
    """Concurrency-safe, process-local admission control with bounded key state."""

    def __init__(
        self,
        *,
        limit: int,
        window_seconds: int,
        max_keys: int = 10_000,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        if limit < 1:
            raise ValueError("Rate limit must be positive.")
        if window_seconds < 1:
            raise ValueError("Rate-limit window must be positive.")
        if max_keys < 1:
            raise ValueError("Rate-limit key capacity must be positive.")
        self._limit = limit
        self._window_seconds = window_seconds
        self._max_keys = max_keys
        self._clock = clock
        self._windows: dict[RateLimitKey, _Window] = {}
        self._lock = asyncio.Lock()

    async def acquire(self, key: RateLimitKey) -> RateLimitDecision:
        now = self._clock()
        async with self._lock:
            window = self._windows.get(key)
            if window is not None and self._expired(window, now):
                window = _Window(started_at=now, attempts=0)
                self._windows[key] = window

            if window is None:
                self._evict_expired(now)
                if len(self._windows) >= self._max_keys:
                    return RateLimitDecision(
                        allowed=False,
                        retry_after_seconds=self._window_seconds,
                    )
                window = _Window(started_at=now, attempts=0)
                self._windows[key] = window

            if window.attempts >= self._limit:
                remaining = self._window_seconds - max(0.0, now - window.started_at)
                return RateLimitDecision(
                    allowed=False,
                    retry_after_seconds=max(1, math.ceil(remaining)),
                )

            window.attempts += 1
            return RateLimitDecision(allowed=True)

    def _expired(self, window: _Window, now: float) -> bool:
        return now - window.started_at >= self._window_seconds

    def _evict_expired(self, now: float) -> None:
        expired = [key for key, window in self._windows.items() if self._expired(window, now)]
        for key in expired:
            del self._windows[key]
