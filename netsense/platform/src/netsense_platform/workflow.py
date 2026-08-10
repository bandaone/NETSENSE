from __future__ import annotations

import hashlib
import json
from typing import Any

from .repositories import JsonObject


def operation_fingerprint(operation: str, body: JsonObject) -> str:
    canonical = json.dumps(
        {"operation": operation, "body": body}, sort_keys=True, separators=(",", ":")
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def entity_exists(snapshot: JsonObject, entity_id: str) -> bool:
    return any(node["id"] == entity_id for node in snapshot["nodes"]) or any(
        relationship["id"] == entity_id for relationship in snapshot["relationships"]
    )


def require_visible_text(value: str, *, minimum: int, message: str) -> None:
    if len(value.strip()) < minimum:
        from .errors import RepositoryValidationError

        raise RepositoryValidationError(message)


def json_object(value: Any) -> JsonObject:
    if not isinstance(value, dict):
        raise TypeError("Database JSON payload must be an object.")
    return value
