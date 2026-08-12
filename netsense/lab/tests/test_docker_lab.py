from __future__ import annotations

import json
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from netsense_lab.docker_lab import CommandResult, DockerLab, LabRuntimeError
from netsense_lab.scenario import load_scenario

LAB_DIRECTORY = Path(__file__).resolve().parents[1]


class DockerLabSafetyTest(unittest.TestCase):
    def setUp(self) -> None:
        scenario = load_scenario(LAB_DIRECTORY / "scenario.json")
        self.lab = DockerLab(scenario, LAB_DIRECTORY / "actor.py")

    def test_refuses_to_remove_an_unexpected_labelled_container(self) -> None:
        with self.assertRaisesRegex(LabRuntimeError, "unexpected labelled container"):
            self.lab._remove_containers(["unrelated-service"])

    def test_refuses_to_remove_a_network_without_matching_ownership(self) -> None:
        labels = json.dumps({"netsense.lab": "some-other-lab"})
        with (
            patch.object(self.lab, "_network_exists", return_value=True),
            patch.object(
                self.lab,
                "_run",
                return_value=CommandResult(stdout=labels, stderr=""),
            ),
            self.assertRaisesRegex(LabRuntimeError, "not owned by this lab"),
        ):
            self.lab._remove_network_if_owned()

    def test_uses_the_digest_pinned_actor_image(self) -> None:
        self.assertIn("@sha256:", self.lab.scenario.actor_image)
        self.assertNotIn(":3.11-slim", self.lab.scenario.actor_image)

    def test_server_readiness_fails_closed_after_bounded_retries(self) -> None:
        failed = Mock(returncode=1)
        with (
            patch("netsense_lab.docker_lab.subprocess.run", return_value=failed),
            patch("netsense_lab.docker_lab.time.monotonic", side_effect=[0, 1, 6]),
            patch("netsense_lab.docker_lab.time.sleep"),
            self.assertRaisesRegex(LabRuntimeError, "did not become ready"),
        ):
            self.lab._wait_for_server("nslab-service", "10.88.10.20")


if __name__ == "__main__":
    unittest.main()
