from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .scenario import LabScenario, TrafficAction

_TRANSPORT = re.compile(r"^Observed (tcp|udp|icmp|other_ip) packet headers\b")
_SUPPORTED_PASSIVE_RELATIONSHIP = "observed_flow"


@dataclass(frozen=True, slots=True)
class ScoreReport:
    passed: bool
    checks: dict[str, bool]
    metrics: dict[str, float | int]
    expected: dict[str, Any]
    observed: dict[str, Any]
    failures: tuple[str, ...]

    def to_json(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "checks": self.checks,
            "metrics": self.metrics,
            "expected": self.expected,
            "observed": self.observed,
            "failures": list(self.failures),
        }


def score_snapshot(
    scenario: LabScenario,
    traffic_evidence: list[dict[str, Any]],
    snapshot: dict[str, Any],
) -> ScoreReport:
    evidence_by_action: dict[str, list[dict[str, Any]]] = {}
    for item in traffic_evidence:
        if isinstance(item, dict) and isinstance(item.get("actionId"), str):
            evidence_by_action.setdefault(item["actionId"], []).append(item)
    successful_actions = {
        action.action_id
        for action in scenario.traffic
        if len(evidence_by_action.get(action.action_id, [])) == 1
        and _completed_action(action, evidence_by_action[action.action_id][0])
    }
    declared_action_ids = {action.action_id for action in scenario.traffic}
    traffic_evidence_exact = (
        set(evidence_by_action) == declared_action_ids
        and len(traffic_evidence) == len(scenario.traffic)
        and len(successful_actions) == len(scenario.traffic)
    )
    expected_addresses: set[str] = set()
    expected_flows: set[tuple[str, str, str]] = set()
    for action in scenario.traffic:
        if action.action_id not in successful_actions:
            continue
        expected_addresses.update((action.source_address, action.target_address))
        expected_flows.add((action.source_address, action.target_address, action.kind))
        expected_flows.add((action.target_address, action.source_address, action.kind))
    expected_identity_pairs = {
        (node.address, node.mac_address)
        for node in scenario.nodes
        if not node.silent and node.address in expected_addresses
    }

    nodes = snapshot.get("nodes") if isinstance(snapshot.get("nodes"), list) else []
    interfaces = (
        snapshot.get("interfaces")
        if isinstance(snapshot.get("interfaces"), list)
        else []
    )
    relationships = (
        snapshot.get("relationships")
        if isinstance(snapshot.get("relationships"), list)
        else []
    )
    evidence = (
        snapshot.get("evidence") if isinstance(snapshot.get("evidence"), list) else []
    )

    node_addresses: dict[str, set[str]] = {}
    node_macs: dict[str, set[str]] = {}
    for node in nodes:
        if not isinstance(node, dict) or not isinstance(node.get("id"), str):
            continue
        identifiers = node.get("identifiers")
        addresses = (
            identifiers.get("ipAddresses") if isinstance(identifiers, dict) else []
        )
        node_addresses[node["id"]] = {
            value for value in addresses if isinstance(value, str)
        }
        mac_addresses = (
            identifiers.get("macAddresses") if isinstance(identifiers, dict) else []
        )
        node_macs[node["id"]] = {
            value.lower() for value in mac_addresses if isinstance(value, str)
        }
    interface_owners = {
        interface["id"]: interface["deviceId"]
        for interface in interfaces
        if isinstance(interface, dict)
        and isinstance(interface.get("id"), str)
        and isinstance(interface.get("deviceId"), str)
    }
    evidence_transport = _evidence_transport(evidence)

    observed_flows: set[tuple[str, str, str]] = set()
    unresolved_relationships = 0
    unsupported_relationships = 0
    for relationship in relationships:
        if not isinstance(relationship, dict):
            unresolved_relationships += 1
            continue
        if relationship.get("relationshipType") != _SUPPORTED_PASSIVE_RELATIONSHIP:
            unsupported_relationships += 1
            continue
        source_id = _endpoint_node(relationship.get("source"), interface_owners)
        target_id = _endpoint_node(relationship.get("target"), interface_owners)
        source_addresses = node_addresses.get(source_id or "", set())
        target_addresses = node_addresses.get(target_id or "", set())
        transports = {
            evidence_transport[evidence_id]
            for evidence_id in relationship.get("evidenceIds", [])
            if evidence_id in evidence_transport
        }
        if (
            len(source_addresses) != 1
            or len(target_addresses) != 1
            or len(transports) != 1
        ):
            unresolved_relationships += 1
            continue
        observed_flows.add(
            (
                next(iter(source_addresses)),
                next(iter(target_addresses)),
                next(iter(transports)),
            )
        )

    observed_addresses = (
        set().union(*node_addresses.values()) if node_addresses else set()
    )
    observed_identity_pairs = {
        (address, mac_address)
        for node_id, addresses in node_addresses.items()
        for address in addresses
        for mac_address in node_macs.get(node_id, set())
    }
    declared_addresses = {address for address, _ in expected_identity_pairs}
    observed_declared_identity_pairs = {
        pair for pair in observed_identity_pairs if pair[0] in declared_addresses
    }
    true_addresses = expected_addresses & observed_addresses
    address_precision = _ratio(len(true_addresses), len(observed_addresses))
    address_recall = _ratio(len(true_addresses), len(expected_addresses))
    true_flows = expected_flows & observed_flows
    flow_precision = _ratio(len(true_flows), len(observed_flows))
    flow_recall = _ratio(len(true_flows), len(expected_flows))
    identity_recall = _ratio(
        len(expected_identity_pairs & observed_identity_pairs),
        len(expected_identity_pairs),
    )
    identity_precision = _ratio(
        len(expected_identity_pairs & observed_declared_identity_pairs),
        len(observed_declared_identity_pairs),
    )

    node_ids = [node.get("id") for node in nodes if isinstance(node, dict)]
    relationship_ids = [
        relationship.get("id")
        for relationship in relationships
        if isinstance(relationship, dict)
    ]
    evidence_ids = [item.get("id") for item in evidence if isinstance(item, dict)]
    interface_ids = [
        interface.get("id") for interface in interfaces if isinstance(interface, dict)
    ]
    valid_unique_ids = all(
        _valid_unique_ids(values, expected_count)
        for values, expected_count in (
            (node_ids, len(nodes)),
            (relationship_ids, len(relationships)),
            (evidence_ids, len(evidence)),
            (interface_ids, len(interfaces)),
        )
    )
    exact_node_shape = len(nodes) == len(expected_addresses) and all(
        len(addresses) == 1 for addresses in node_addresses.values()
    )

    honest_assessments = all(_honest_passive_node(node) for node in nodes)
    scope_correct = (
        snapshot.get("tenantId") == scenario.tenant_id
        and isinstance(snapshot.get("site"), dict)
        and snapshot["site"].get("id") == scenario.site_id
    )
    checks = {
        "traffic_ground_truth_complete": traffic_evidence_exact,
        "snapshot_is_live": snapshot.get("synthetic") is False,
        "snapshot_scope_correct": scope_correct,
        "observable_device_precision_complete": address_precision == 1.0,
        "observable_device_recall_complete": address_recall == 1.0,
        "observable_flow_precision_complete": flow_precision == 1.0,
        "observable_flow_recall_complete": flow_recall == 1.0,
        "declared_mac_ip_identity_recall_complete": identity_recall == 1.0,
        "declared_mac_ip_identity_precision_complete": identity_precision == 1.0,
        "observable_node_cardinality_and_shape_exact": exact_node_shape,
        "graph_object_ids_unique": valid_unique_ids,
        "no_duplicate_flow_claims": len(relationships) == len(observed_flows),
        "silent_negative_control_absent": not bool(
            scenario.silent_addresses & observed_addresses
        ),
        "passive_assessments_do_not_overclaim": honest_assessments,
        "no_unsupported_relationship_claims": unsupported_relationships == 0,
        "all_relationships_resolve_to_evidence": unresolved_relationships == 0,
    }
    failures = tuple(name for name, passed in checks.items() if not passed)
    return ScoreReport(
        passed=not failures,
        checks=checks,
        metrics={
            "expectedObservableDevices": len(expected_addresses),
            "observedDevices": len(observed_addresses),
            "devicePrecision": address_precision,
            "deviceRecall": address_recall,
            "expectedObservableFlows": len(expected_flows),
            "observedFlows": len(observed_flows),
            "flowPrecision": flow_precision,
            "flowRecall": flow_recall,
            "declaredIdentityRecall": identity_recall,
            "declaredIdentityPrecision": identity_precision,
            "unsupportedRelationships": unsupported_relationships,
            "unresolvedRelationships": unresolved_relationships,
        },
        expected={
            "addresses": sorted(expected_addresses),
            "flows": _sorted_flows(expected_flows),
            "declaredIdentityPairs": _sorted_identity_pairs(expected_identity_pairs),
            "silentAddresses": sorted(scenario.silent_addresses),
        },
        observed={
            "addresses": sorted(observed_addresses),
            "flows": _sorted_flows(observed_flows),
            "identityPairs": _sorted_identity_pairs(observed_identity_pairs),
        },
        failures=failures,
    )


def _completed_action(action: TrafficAction, item: dict[str, Any]) -> bool:
    return (
        item.get("actor") == action.actor
        and item.get("kind") == action.kind
        and item.get("sourceAddress") == action.source_address
        and item.get("targetAddress") == action.target_address
        and item.get("targetPort") == action.target_port
        and item.get("exitCode") == 0
        and item.get("attemptedExchanges") == action.exchanges
        and item.get("successfulExchanges") == action.exchanges
    )


def _valid_unique_ids(values: list[Any], expected_count: int) -> bool:
    return (
        len(values) == expected_count
        and all(isinstance(value, str) and value for value in values)
        and len(set(values)) == expected_count
    )


def _endpoint_node(endpoint: Any, interface_owners: dict[str, str]) -> str | None:
    if not isinstance(endpoint, dict):
        return None
    if isinstance(endpoint.get("nodeId"), str):
        return endpoint["nodeId"]
    if isinstance(endpoint.get("interfaceId"), str):
        return interface_owners.get(endpoint["interfaceId"])
    return None


def _evidence_transport(evidence: list[Any]) -> dict[str, str]:
    result: dict[str, str] = {}
    for item in evidence:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            continue
        summary = item.get("summary")
        match = _TRANSPORT.match(summary) if isinstance(summary, str) else None
        if match:
            result[item["id"]] = match.group(1)
    return result


def _honest_passive_node(node: Any) -> bool:
    if not isinstance(node, dict):
        return False
    assessment = node.get("assessment")
    return (
        isinstance(assessment, dict)
        and assessment.get("operationalHealth") == "unknown"
        and assessment.get("coverage") == "partial"
        and assessment.get("managementState") == "passive_only"
    )


def _ratio(numerator: int, denominator: int) -> float:
    return 1.0 if denominator == 0 and numerator == 0 else numerator / denominator


def _sorted_flows(flows: set[tuple[str, str, str]]) -> list[dict[str, str]]:
    return [
        {"sourceAddress": source, "targetAddress": target, "transport": transport}
        for source, target, transport in sorted(flows)
    ]


def _sorted_identity_pairs(pairs: set[tuple[str, str]]) -> list[dict[str, str]]:
    return [
        {"address": address, "macAddress": mac_address}
        for address, mac_address in sorted(pairs)
    ]
