from __future__ import annotations

from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from netsense_platform.runtime import create_runtime_app, load_runtime_settings

from .support import signing_keys


@pytest.mark.asyncio
async def test_runtime_settings_load_sensitive_values_from_files(tmp_path: Path) -> None:
    keys = signing_keys()
    database_url_file = tmp_path / "database-url"
    database_url_file.write_text(
        "postgresql+asyncpg://app:password@database/netsense\n", encoding="utf-8"
    )
    public_key_file = tmp_path / "jwt-public-key"
    public_key_file.write_text(keys.public_key, encoding="utf-8")
    contracts_directory = Path(__file__).resolve().parents[2] / "docs" / "contracts"

    settings = load_runtime_settings(
        {
            "NETSENSE_DATABASE_URL_FILE": str(database_url_file),
            "NETSENSE_JWT_PUBLIC_KEY_FILE": str(public_key_file),
            "NETSENSE_JWT_ISSUER": "https://identity.netsense.test",
            "NETSENSE_JWT_AUDIENCE": "netsense-platform",
            "NETSENSE_CONTRACTS_DIRECTORY": str(contracts_directory),
        }
    )
    app = create_runtime_app(settings)

    assert settings.max_request_body_bytes == 32 * 1024 * 1024
    assert settings.topology_rate_limit == 12
    assert settings.topology_rate_window_seconds == 60
    assert settings.readiness_timeout_seconds == 2

    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="https://platform.test") as client:
            response = await client.get("/health/live")
    assert response.json() == {"status": "healthy"}


@pytest.mark.parametrize(
    ("environment", "message"),
    [
        ({}, "NETSENSE_DATABASE_URL_FILE is required"),
        ({"NETSENSE_DATABASE_URL_FILE": "/missing"}, "must identify a readable file"),
    ],
)
def test_runtime_settings_fail_closed(environment: dict[str, str], message: str) -> None:
    with pytest.raises(ValueError, match=message):
        load_runtime_settings(environment)


@pytest.mark.parametrize(
    ("name", "value", "message"),
    [
        ("NETSENSE_MAX_REQUEST_BODY_BYTES", "invalid", "must be an integer"),
        ("NETSENSE_MAX_REQUEST_BODY_BYTES", "100", "must be between"),
        ("NETSENSE_TOPOLOGY_RATE_LIMIT", "0", "must be between"),
        ("NETSENSE_TOPOLOGY_RATE_WINDOW_SECONDS", "3601", "must be between"),
        ("NETSENSE_READINESS_TIMEOUT_SECONDS", "0", "must be between"),
    ],
)
def test_runtime_admission_settings_fail_closed(
    tmp_path: Path,
    name: str,
    value: str,
    message: str,
) -> None:
    keys = signing_keys()
    database_url_file = tmp_path / "database-url"
    database_url_file.write_text(
        "postgresql+asyncpg://app:password@database/netsense\n",
        encoding="utf-8",
    )
    public_key_file = tmp_path / "jwt-public-key"
    public_key_file.write_text(keys.public_key, encoding="utf-8")
    contracts_directory = Path(__file__).resolve().parents[2] / "docs" / "contracts"
    environment = {
        "NETSENSE_DATABASE_URL_FILE": str(database_url_file),
        "NETSENSE_JWT_PUBLIC_KEY_FILE": str(public_key_file),
        "NETSENSE_JWT_ISSUER": "https://identity.netsense.test",
        "NETSENSE_JWT_AUDIENCE": "netsense-platform",
        "NETSENSE_CONTRACTS_DIRECTORY": str(contracts_directory),
        name: value,
    }

    with pytest.raises(ValueError, match=message):
        load_runtime_settings(environment)
