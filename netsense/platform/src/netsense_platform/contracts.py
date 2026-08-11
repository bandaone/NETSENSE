from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker

from .errors import ContractViolationError, Violation

CONTRACT_FILES = {
    "topology_snapshot": "topology-snapshot-schema.json",
    "topology_ingestion_receipt": "topology-ingestion-receipt-schema.json",
    "incident_case": "incident-case-schema.json",
    "incident_summary": "incident-summary-schema.json",
    "incident_analysis": "incident-analysis-schema.json",
    "incident_list": "incident-list-schema.json",
    "incident_acknowledgement_request": "incident-acknowledgement-request-schema.json",
    "incident_notes_request": "incident-notes-request-schema.json",
    "incident_resolution_request": "incident-resolution-request-schema.json",
    "problem": "problem-schema.json",
}


class ContractRegistry:
    def __init__(self, contracts_directory: Path) -> None:
        self._validators: dict[str, Draft202012Validator] = {}
        for contract_name, file_name in CONTRACT_FILES.items():
            path = contracts_directory / file_name
            if not path.is_file():
                raise FileNotFoundError(f"Required contract is missing: {path}")
            import json

            schema = json.loads(path.read_text(encoding="utf-8"))
            Draft202012Validator.check_schema(schema)
            self._validators[contract_name] = Draft202012Validator(
                schema,
                format_checker=FormatChecker(),
            )

    def validate(self, contract_name: str, value: Any) -> dict[str, Any]:
        validator = self._validators.get(contract_name)
        if validator is None:
            raise KeyError(f"Unknown contract: {contract_name}")
        errors = sorted(
            validator.iter_errors(value),
            key=lambda error: tuple(str(part) for part in error.absolute_path),
        )
        violations = tuple(
            Violation(path=_json_path(error.absolute_path), message=_safe_message(error.validator))
            for error in errors[:20]
        )
        if violations:
            raise ContractViolationError(contract_name, violations)
        if not isinstance(value, dict):
            raise ContractViolationError(
                contract_name,
                (Violation(path="/", message="Expected a JSON object."),),
            )

        result = deepcopy(value)
        if contract_name == "topology_snapshot":
            _assert_topology_invariants(result)
        elif contract_name == "incident_case":
            _assert_incident_invariants(result)
        return result


def _json_path(path: Any) -> str:
    parts = [str(part).replace("~", "~0").replace("/", "~1") for part in path]
    return "/" + "/".join(parts) if parts else "/"


def _safe_message(validator: str) -> str:
    messages = {
        "required": "A required field is missing.",
        "additionalProperties": "An unexpected field was provided.",
        "type": "The value has the wrong type.",
        "enum": "The value is not supported.",
        "const": "The value does not match the contract version or discriminator.",
        "format": "The value has an invalid format.",
        "pattern": "The value has an invalid format.",
        "minLength": "The value is shorter than allowed.",
        "maxLength": "The value is longer than allowed.",
        "minimum": "The value is below the allowed minimum.",
        "maximum": "The value is above the allowed maximum.",
        "minItems": "The collection contains too few items.",
        "maxItems": "The collection contains too many items.",
        "oneOf": "The value does not match exactly one supported shape.",
        "anyOf": "The value does not match a supported shape.",
    }
    return messages.get(validator, "The value does not satisfy the contract.")


def _duplicates(values: list[str]) -> set[str]:
    seen: set[str] = set()
    duplicates: set[str] = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return duplicates


def _invariant_failure(contract_name: str, path: str, message: str) -> None:
    raise ContractViolationError(contract_name, (Violation(path=path, message=message),))


def _assert_topology_invariants(
    snapshot: dict[str, Any], contract_name: str = "topology_snapshot"
) -> None:
    if snapshot["site"]["organisationId"] != snapshot["organisation"]["id"]:
        _invariant_failure(contract_name, "/site/organisationId", "Site ownership is inconsistent.")

    nodes = snapshot["nodes"]
    interfaces = snapshot["interfaces"]
    relationships = snapshot["relationships"]
    evidence = snapshot["evidence"]
    node_ids = {node["id"] for node in nodes}
    interface_ids = {interface["id"] for interface in interfaces}
    evidence_ids = {record["id"] for record in evidence}

    all_ids = (
        [node["id"] for node in nodes]
        + [interface["id"] for interface in interfaces]
        + [relationship["id"] for relationship in relationships]
        + [record["id"] for record in evidence]
    )
    if _duplicates(all_ids):
        _invariant_failure(
            contract_name, "/", "Identifiers must be globally unique within the snapshot."
        )

    for index, node in enumerate(nodes):
        if node["parentId"] is not None and node["parentId"] not in node_ids:
            _invariant_failure(
                contract_name, f"/nodes/{index}/parentId", "Parent entity is missing."
            )
        if not set(node["evidenceIds"]).issubset(evidence_ids):
            _invariant_failure(contract_name, f"/nodes/{index}/evidenceIds", "Evidence is missing.")
        if not set(node["assessment"]["evidenceIds"]).issubset(evidence_ids):
            _invariant_failure(
                contract_name,
                f"/nodes/{index}/assessment/evidenceIds",
                "Assessment evidence is missing.",
            )

    for index, interface in enumerate(interfaces):
        if interface["deviceId"] not in node_ids:
            _invariant_failure(contract_name, f"/interfaces/{index}/deviceId", "Device is missing.")
        if not set(interface["evidenceIds"]).issubset(evidence_ids):
            _invariant_failure(
                contract_name, f"/interfaces/{index}/evidenceIds", "Evidence is missing."
            )

    for index, relationship in enumerate(relationships):
        for endpoint_name in ("source", "target"):
            endpoint = relationship[endpoint_name]
            if endpoint.get("nodeId") is not None and endpoint["nodeId"] not in node_ids:
                _invariant_failure(
                    contract_name,
                    f"/relationships/{index}/{endpoint_name}/nodeId",
                    "Relationship node is missing.",
                )
            if (
                endpoint.get("interfaceId") is not None
                and endpoint["interfaceId"] not in interface_ids
            ):
                _invariant_failure(
                    contract_name,
                    f"/relationships/{index}/{endpoint_name}/interfaceId",
                    "Relationship interface is missing.",
                )
        if not set(relationship["evidenceIds"]).issubset(evidence_ids):
            _invariant_failure(
                contract_name,
                f"/relationships/{index}/evidenceIds",
                "Evidence is missing.",
            )
        if relationship["relationshipType"] == "physical_adjacency" and (
            relationship["source"].get("interfaceId") is None
            or relationship["target"].get("interfaceId") is None
        ):
            _invariant_failure(
                contract_name,
                f"/relationships/{index}",
                "Physical adjacency must terminate on interfaces.",
            )

    coverage = snapshot["coverageSummary"]
    coverage_total = (
        coverage["full"] + coverage["partial"] + coverage["none"] + coverage["unsupported"]
    )
    if coverage["totalEntities"] != len(nodes) or coverage_total != len(nodes):
        _invariant_failure(
            contract_name,
            "/coverageSummary",
            "Coverage totals must equal the number of topology entities.",
        )


def _assert_incident_invariants(incident_case: dict[str, Any]) -> None:
    contract_name = "incident_case"
    incident = incident_case["incident"]
    snapshot = incident_case["snapshot"]
    _assert_topology_invariants(snapshot, contract_name)
    if incident["tenantId"] != snapshot["tenantId"]:
        _invariant_failure(contract_name, "/incident/tenantId", "Incident tenant is inconsistent.")
    if incident["siteId"] != snapshot["site"]["id"]:
        _invariant_failure(contract_name, "/incident/siteId", "Incident site is inconsistent.")

    node_ids = {node["id"] for node in snapshot["nodes"]}
    relationship_ids = {relationship["id"] for relationship in snapshot["relationships"]}
    evidence_ids = {record["id"] for record in snapshot["evidence"]}
    observation_ids: set[str] = set()
    for index, observation in enumerate(incident_case["observations"]):
        if observation["id"] in observation_ids:
            _invariant_failure(
                contract_name, f"/observations/{index}/id", "Observation IDs must be unique."
            )
        observation_ids.add(observation["id"])
        _assert_target_exists(
            observation["target"], node_ids, relationship_ids, f"/observations/{index}/target"
        )
        if not set(observation["evidenceIds"]).issubset(evidence_ids):
            _invariant_failure(
                contract_name, f"/observations/{index}/evidenceIds", "Evidence is missing."
            )
    for index, target in enumerate(incident_case["candidateTargets"]):
        _assert_target_exists(target, node_ids, relationship_ids, f"/candidateTargets/{index}")


def _assert_target_exists(
    target: dict[str, Any],
    node_ids: set[str],
    relationship_ids: set[str],
    path: str,
) -> None:
    exists = target["id"] in (node_ids if target["kind"] == "node" else relationship_ids)
    if not exists:
        _invariant_failure("incident_case", path, "Incident target is missing from the snapshot.")
