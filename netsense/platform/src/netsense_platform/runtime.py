from __future__ import annotations

import os
from collections.abc import Mapping
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path

from fastapi import FastAPI

from .admission import InMemoryFixedWindowRateLimiter
from .application import create_app
from .auth import JwtAuthenticator, JwtVerificationSettings
from .contracts import ContractRegistry
from .database import create_database_engine
from .postgres_repository import PostgresPlatformRepository
from .readiness import PostgresReadinessProbe

DEFAULT_MAX_REQUEST_BODY_BYTES = 32 * 1024 * 1024
DEFAULT_TOPOLOGY_RATE_LIMIT = 12
DEFAULT_TOPOLOGY_RATE_WINDOW_SECONDS = 60
DEFAULT_READINESS_TIMEOUT_SECONDS = 2


@dataclass(frozen=True, slots=True)
class RuntimeSettings:
    database_url: str
    jwt_public_key: str
    jwt_issuer: str
    jwt_audience: str
    contracts_directory: Path
    max_request_body_bytes: int
    topology_rate_limit: int
    topology_rate_window_seconds: int
    readiness_timeout_seconds: int


def load_runtime_settings(environment: Mapping[str, str] | None = None) -> RuntimeSettings:
    values = os.environ if environment is None else environment
    database_url = _read_required_file(values, "NETSENSE_DATABASE_URL_FILE")
    jwt_public_key = _read_required_file(values, "NETSENSE_JWT_PUBLIC_KEY_FILE")
    issuer = _required_value(values, "NETSENSE_JWT_ISSUER")
    audience = _required_value(values, "NETSENSE_JWT_AUDIENCE")
    contracts_directory = Path(_required_value(values, "NETSENSE_CONTRACTS_DIRECTORY"))
    if not contracts_directory.is_dir():
        raise ValueError("NETSENSE_CONTRACTS_DIRECTORY must identify a readable directory.")
    return RuntimeSettings(
        database_url=database_url,
        jwt_public_key=jwt_public_key,
        jwt_issuer=issuer,
        jwt_audience=audience,
        contracts_directory=contracts_directory,
        max_request_body_bytes=_bounded_int(
            values,
            "NETSENSE_MAX_REQUEST_BODY_BYTES",
            default=DEFAULT_MAX_REQUEST_BODY_BYTES,
            minimum=1024,
            maximum=128 * 1024 * 1024,
        ),
        topology_rate_limit=_bounded_int(
            values,
            "NETSENSE_TOPOLOGY_RATE_LIMIT",
            default=DEFAULT_TOPOLOGY_RATE_LIMIT,
            minimum=1,
            maximum=10_000,
        ),
        topology_rate_window_seconds=_bounded_int(
            values,
            "NETSENSE_TOPOLOGY_RATE_WINDOW_SECONDS",
            default=DEFAULT_TOPOLOGY_RATE_WINDOW_SECONDS,
            minimum=1,
            maximum=3600,
        ),
        readiness_timeout_seconds=_bounded_int(
            values,
            "NETSENSE_READINESS_TIMEOUT_SECONDS",
            default=DEFAULT_READINESS_TIMEOUT_SECONDS,
            minimum=1,
            maximum=30,
        ),
    )


def create_runtime_app(settings: RuntimeSettings) -> FastAPI:
    engine = create_database_engine(settings.database_url)
    contracts = ContractRegistry(settings.contracts_directory)
    repository = PostgresPlatformRepository(engine=engine, contracts=contracts)
    rate_limiter = InMemoryFixedWindowRateLimiter(
        limit=settings.topology_rate_limit,
        window_seconds=settings.topology_rate_window_seconds,
    )
    readiness_probe = PostgresReadinessProbe(
        engine=engine,
        timeout_seconds=settings.readiness_timeout_seconds,
    )
    authenticator = JwtAuthenticator(
        JwtVerificationSettings(
            public_key=settings.jwt_public_key,
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        try:
            yield
        finally:
            await engine.dispose()

    return create_app(
        authenticator=authenticator,
        contracts=contracts,
        topology_repository=repository,
        topology_ingestion_repository=repository,
        incident_repository=repository,
        ingestion_rate_limiter=rate_limiter,
        readiness_probe=readiness_probe,
        max_request_body_bytes=settings.max_request_body_bytes,
        lifespan=lifespan,
    )


def create_runtime_app_from_environment() -> FastAPI:
    return create_runtime_app(load_runtime_settings())


def _required_value(environment: Mapping[str, str], name: str) -> str:
    value = environment.get(name, "").strip()
    if not value:
        raise ValueError(f"{name} is required.")
    return value


def _read_required_file(environment: Mapping[str, str], name: str) -> str:
    path = Path(_required_value(environment, name))
    if not path.is_file():
        raise ValueError(f"{name} must identify a readable file.")
    value = path.read_text(encoding="utf-8").strip()
    if not value:
        raise ValueError(f"{name} must not identify an empty file.")
    return value


def _bounded_int(
    environment: Mapping[str, str],
    name: str,
    *,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    raw_value = environment.get(name)
    if raw_value is None:
        return default
    try:
        value = int(raw_value)
    except ValueError:
        raise ValueError(f"{name} must be an integer.") from None
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}.")
    return value
