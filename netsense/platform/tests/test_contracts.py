from __future__ import annotations

from copy import deepcopy

import pytest

from netsense_platform.contracts import ContractRegistry
from netsense_platform.errors import ContractViolationError

from .support import contract_registry, incident_case, topology_snapshot


@pytest.fixture(scope="module")
def contracts() -> ContractRegistry:
    return contract_registry()


def test_validates_exact_generated_contracts_and_returns_a_copy(
    contracts: ContractRegistry,
) -> None:
    source = topology_snapshot()
    validated = contracts.validate("topology_snapshot", source)

    assert validated == source
    assert validated is not source


def test_rejects_unknown_fields_without_echoing_sensitive_values(
    contracts: ContractRegistry,
) -> None:
    request = {"expectedState": "open", "secret": "do-not-echo-this"}

    with pytest.raises(ContractViolationError) as captured:
        contracts.validate("incident_acknowledgement_request", request)

    assert captured.value.violations[0].message == "An unexpected field was provided."
    assert "do-not-echo-this" not in str(captured.value.violations)


def test_rejects_cross_object_topology_and_incident_invariant_failures(
    contracts: ContractRegistry,
) -> None:
    invalid_snapshot = topology_snapshot()
    invalid_snapshot["coverageSummary"]["full"] = 0
    with pytest.raises(ContractViolationError, match="topology_snapshot"):
        contracts.validate("topology_snapshot", invalid_snapshot)

    invalid_case = deepcopy(incident_case())
    invalid_case["observations"][0]["target"]["id"] = "device:missing"
    with pytest.raises(ContractViolationError):
        contracts.validate("incident_case", invalid_case)


def test_rejects_missing_contract_directory(tmp_path) -> None:
    with pytest.raises(FileNotFoundError, match="Required contract is missing"):
        ContractRegistry(tmp_path)


def test_rejects_unknown_contract_names(contracts: ContractRegistry) -> None:
    with pytest.raises(KeyError, match="Unknown contract"):
        contracts.validate("not_a_contract", {})


def test_rejects_duplicate_identity_and_missing_evidence_invariants(
    contracts: ContractRegistry,
) -> None:
    duplicate = topology_snapshot()
    duplicate["nodes"].append(deepcopy(duplicate["nodes"][0]))
    duplicate["coverageSummary"].update({"totalEntities": 2, "full": 2})
    with pytest.raises(ContractViolationError, match="topology_snapshot"):
        contracts.validate("topology_snapshot", duplicate)

    missing_evidence = topology_snapshot()
    missing_evidence["nodes"][0]["evidenceIds"] = ["evidence:missing"]
    with pytest.raises(ContractViolationError, match="topology_snapshot"):
        contracts.validate("topology_snapshot", missing_evidence)
