from __future__ import annotations

import unittest
from pathlib import Path
from typing import Any

from netsense_lab.scenario import load_scenario
from netsense_lab.scorer import score_snapshot

LAB_DIRECTORY = Path(__file__).resolve().parents[1]


def traffic_evidence() -> list[dict[str, Any]]:
    scenario = load_scenario(LAB_DIRECTORY / "scenario.json")
    return [
        {
            "actionId": action.action_id,
            "actor": action.actor,
            "kind": action.kind,
            "sourceAddress": action.source_address,
            "targetAddress": action.target_address,
            "targetPort": action.target_port,
            "exitCode": 0,
            "attemptedExchanges": action.exchanges,
            "successfulExchanges": action.exchanges,
        }
        for action in scenario.traffic
    ]


def snapshot() -> dict[str, Any]:
    scenario = load_scenario(LAB_DIRECTORY / "scenario.json")
    addresses = ["10.88.10.1", "10.88.10.11", "10.88.10.12", "10.88.10.20"]
    mac_addresses = {
        node.address: node.mac_address for node in scenario.nodes if not node.silent
    }
    nodes = []
    for index, address in enumerate(addresses):
        nodes.append(
            {
                "id": f"device:{index}",
                "identifiers": {
                    "ipAddresses": [address],
                    "macAddresses": [mac_addresses.get(address, "02:42:0a:58:0a:01")],
                },
                "assessment": {
                    "operationalHealth": "unknown",
                    "coverage": "partial",
                    "managementState": "passive_only",
                },
            }
        )
    address_ids = {
        address: f"device:{index}" for index, address in enumerate(addresses)
    }
    flow_specs = [
        ("10.88.10.11", "10.88.10.20", "tcp"),
        ("10.88.10.20", "10.88.10.11", "tcp"),
        ("10.88.10.12", "10.88.10.20", "udp"),
        ("10.88.10.20", "10.88.10.12", "udp"),
        ("10.88.10.11", "10.88.10.1", "icmp"),
        ("10.88.10.1", "10.88.10.11", "icmp"),
    ]
    evidence = []
    relationships = []
    for index, (source, target, transport) in enumerate(flow_specs):
        evidence_id = f"evidence:{index}"
        evidence.append(
            {
                "id": evidence_id,
                "summary": (
                    f"Observed {transport} packet headers between independently observed "
                    "endpoint identities."
                ),
            }
        )
        relationships.append(
            {
                "id": f"relationship:{index}",
                "source": {"nodeId": address_ids[source]},
                "target": {"nodeId": address_ids[target]},
                "relationshipType": "observed_flow",
                "evidenceIds": [evidence_id],
            }
        )
    return {
        "tenantId": scenario.tenant_id,
        "site": {"id": scenario.site_id},
        "synthetic": False,
        "nodes": nodes,
        "interfaces": [],
        "relationships": relationships,
        "evidence": evidence,
    }


class ScoreSnapshotTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario(LAB_DIRECTORY / "scenario.json")

    def test_passes_exact_observable_truth_without_overclaims(self) -> None:
        report = score_snapshot(self.scenario, traffic_evidence(), snapshot())

        self.assertTrue(report.passed)
        self.assertEqual(report.metrics["devicePrecision"], 1.0)
        self.assertEqual(report.metrics["flowRecall"], 1.0)
        self.assertEqual(report.metrics["declaredIdentityRecall"], 1.0)
        self.assertEqual(report.metrics["declaredIdentityPrecision"], 1.0)

    def test_fails_when_silent_negative_control_is_invented(self) -> None:
        candidate = snapshot()
        candidate["nodes"].append(
            {
                "id": "device:silent",
                "identifiers": {
                    "ipAddresses": ["10.88.10.30"],
                    "macAddresses": ["02:42:0a:58:0a:1e"],
                },
                "assessment": {
                    "operationalHealth": "unknown",
                    "coverage": "partial",
                    "managementState": "passive_only",
                },
            }
        )

        report = score_snapshot(self.scenario, traffic_evidence(), candidate)

        self.assertFalse(report.passed)
        self.assertFalse(report.checks["silent_negative_control_absent"])
        self.assertLess(report.metrics["devicePrecision"], 1.0)

    def test_fails_on_missing_flow_and_unsupported_physical_claim(self) -> None:
        candidate = snapshot()
        candidate["relationships"].pop()
        candidate["relationships"].append(
            {
                "id": "relationship:invented-physical",
                "source": {"nodeId": "device:0"},
                "target": {"nodeId": "device:1"},
                "relationshipType": "physical_adjacency",
                "evidenceIds": [],
            }
        )

        report = score_snapshot(self.scenario, traffic_evidence(), candidate)

        self.assertFalse(report.passed)
        self.assertFalse(report.checks["observable_flow_recall_complete"])
        self.assertFalse(report.checks["no_unsupported_relationship_claims"])

    def test_fails_on_overclaimed_health_and_incomplete_traffic_truth(self) -> None:
        candidate = snapshot()
        candidate["nodes"][0]["assessment"]["operationalHealth"] = "healthy"
        incomplete = traffic_evidence()
        incomplete[0]["exitCode"] = 1
        incomplete[0]["successfulExchanges"] = 0

        report = score_snapshot(self.scenario, incomplete, candidate)

        self.assertFalse(report.passed)
        self.assertFalse(report.checks["traffic_ground_truth_complete"])
        self.assertFalse(report.checks["passive_assessments_do_not_overclaim"])

    def test_fails_when_observed_address_is_attached_to_the_wrong_mac(self) -> None:
        candidate = snapshot()
        candidate["nodes"][1]["identifiers"]["macAddresses"] = ["02:42:0a:58:0a:ff"]

        report = score_snapshot(self.scenario, traffic_evidence(), candidate)

        self.assertFalse(report.passed)
        self.assertFalse(report.checks["declared_mac_ip_identity_recall_complete"])

    def test_fails_when_an_extra_mac_is_attached_to_a_declared_address(self) -> None:
        candidate = snapshot()
        candidate["nodes"][1]["identifiers"]["macAddresses"].append("02:42:0a:58:0a:ff")

        report = score_snapshot(self.scenario, traffic_evidence(), candidate)

        self.assertFalse(report.passed)
        self.assertFalse(report.checks["declared_mac_ip_identity_precision_complete"])

    def test_fails_on_duplicate_nodes_relationships_or_evidence(self) -> None:
        candidate = snapshot()
        candidate["nodes"].append(candidate["nodes"][0])
        candidate["relationships"].append(candidate["relationships"][0])
        candidate["evidence"].append(candidate["evidence"][0])

        report = score_snapshot(self.scenario, traffic_evidence(), candidate)

        self.assertFalse(report.passed)
        self.assertFalse(report.checks["observable_node_cardinality_and_shape_exact"])
        self.assertFalse(report.checks["graph_object_ids_unique"])
        self.assertFalse(report.checks["no_duplicate_flow_claims"])

    def test_fails_when_traffic_evidence_is_duplicated_or_misattributed(self) -> None:
        duplicate = traffic_evidence()
        duplicate.append(dict(duplicate[0]))
        duplicate[0]["sourceAddress"] = "10.88.10.12"

        report = score_snapshot(self.scenario, duplicate, snapshot())

        self.assertFalse(report.passed)
        self.assertFalse(report.checks["traffic_ground_truth_complete"])


if __name__ == "__main__":
    unittest.main()
