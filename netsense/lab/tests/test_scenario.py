from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from netsense_lab.scenario import ScenarioError, load_scenario

LAB_DIRECTORY = Path(__file__).resolve().parents[1]


class ScenarioTest(unittest.TestCase):
    def test_reference_scenario_is_bounded_and_consistent(self) -> None:
        scenario = load_scenario(LAB_DIRECTORY / "scenario.json")

        self.assertEqual(scenario.bridge_name, "nslab-br0")
        self.assertEqual(len(scenario.nodes), 4)
        self.assertEqual(len(scenario.traffic), 3)
        self.assertEqual(scenario.silent_addresses, frozenset({"10.88.10.30"}))

    def test_rejects_traffic_attributed_to_a_silent_node(self) -> None:
        raw = json.loads((LAB_DIRECTORY / "scenario.json").read_text(encoding="utf-8"))
        raw["traffic"][0]["actor"] = "nslab-silent"
        raw["traffic"][0]["sourceAddress"] = "10.88.10.30"

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "scenario.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            with self.assertRaisesRegex(ScenarioError, "non-silent"):
                load_scenario(path)

    def test_rejects_duplicate_addresses(self) -> None:
        raw = json.loads((LAB_DIRECTORY / "scenario.json").read_text(encoding="utf-8"))
        raw["nodes"][1]["address"] = raw["nodes"][0]["address"]

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "scenario.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            with self.assertRaisesRegex(ScenarioError, "duplicate node address"):
                load_scenario(path)

    def test_rejects_public_lab_subnets(self) -> None:
        raw = json.loads((LAB_DIRECTORY / "scenario.json").read_text(encoding="utf-8"))
        raw["network"]["subnet"] = "203.0.113.0/24"
        raw["network"]["gateway"] = "203.0.113.1"

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "scenario.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            with self.assertRaisesRegex(ScenarioError, "private IPv4 subnet"):
                load_scenario(path)

    def test_rejects_unknown_fields_instead_of_ignoring_typos(self) -> None:
        raw = json.loads((LAB_DIRECTORY / "scenario.json").read_text(encoding="utf-8"))
        raw["network"]["bridgeNmae"] = raw["network"]["bridgeName"]

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "scenario.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            with self.assertRaisesRegex(ScenarioError, "Unknown scenario field"):
                load_scenario(path)

    def test_rejects_mutable_actor_images(self) -> None:
        raw = json.loads((LAB_DIRECTORY / "scenario.json").read_text(encoding="utf-8"))
        raw["actorImage"] = "python:3.11-slim"

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "scenario.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            with self.assertRaisesRegex(ScenarioError, "exact sha256 digest"):
                load_scenario(path)


if __name__ == "__main__":
    unittest.main()
