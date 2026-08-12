from __future__ import annotations

import json
from pathlib import Path

from .support import contract_registry


def test_go_probe_fixture_satisfies_platform_topology_contract() -> None:
    repository_root = Path(__file__).resolve().parents[2]
    fixture_path = (
        repository_root / "probe" / "internal" / "topology" / "testdata" / "passive-snapshot.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

    validated = contract_registry().validate("topology_snapshot", fixture)

    assert validated["synthetic"] is False
    assert {record["collectorId"] for record in validated["evidence"]} == {"collector:test"}
    assert {node["assessment"]["operationalHealth"] for node in validated["nodes"]} == {"unknown"}
    assert {relationship["relationshipType"] for relationship in validated["relationships"]} == {
        "observed_flow"
    }
