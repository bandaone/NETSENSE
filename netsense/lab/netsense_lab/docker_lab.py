from __future__ import annotations

import json
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .scenario import LabScenario


class LabRuntimeError(RuntimeError):
    """Raised when the disposable lab cannot be managed safely."""


@dataclass(frozen=True, slots=True)
class CommandResult:
    stdout: str
    stderr: str


class DockerLab:
    def __init__(self, scenario: LabScenario, actor_path: Path) -> None:
        self.scenario = scenario
        self.actor_path = actor_path.resolve()

    def doctor(self) -> dict[str, Any]:
        version = self._run(["docker", "version", "--format", "{{.Server.Version}}"])
        return {
            "dockerServerVersion": version.stdout.strip(),
            "networkExists": self._network_exists(),
            "existingLabContainers": self._container_names(),
        }

    def up(self) -> None:
        if self._network_exists():
            raise LabRuntimeError(
                f"Docker network {self.scenario.network_name} already exists; run down first."
            )
        if self._container_names():
            raise LabRuntimeError(
                "Label-matching lab containers already exist; run down first."
            )
        self._run(
            [
                "docker",
                "network",
                "create",
                "--driver",
                "bridge",
                "--internal",
                "--subnet",
                self.scenario.subnet,
                "--gateway",
                self.scenario.gateway,
                "--opt",
                f"com.docker.network.bridge.name={self.scenario.bridge_name}",
                "--label",
                f"netsense.lab={self.scenario.lab_id}",
                self.scenario.network_name,
            ]
        )
        created: list[str] = []
        try:
            icmp_actors = {
                action.actor
                for action in self.scenario.traffic
                if action.kind == "icmp"
            }
            for node in self.scenario.nodes:
                command = [
                    "docker",
                    "run",
                    "--detach",
                    "--name",
                    node.name,
                    "--hostname",
                    node.name,
                    "--label",
                    f"netsense.lab={self.scenario.lab_id}",
                    "--network",
                    self.scenario.network_name,
                    "--ip",
                    node.address,
                    "--mac-address",
                    node.mac_address,
                    "--read-only",
                    "--tmpfs",
                    "/tmp:rw,noexec,nosuid,size=8m",
                    "--security-opt",
                    "no-new-privileges",
                    "--cap-drop",
                    "ALL",
                ]
                if node.name in icmp_actors:
                    command.extend(["--cap-add", "NET_RAW"])
                command.extend(
                    [
                        "--mount",
                        f"type=bind,src={self.actor_path},dst=/opt/netsense-lab/actor.py,readonly",
                        self.scenario.actor_image,
                        "python",
                        "/opt/netsense-lab/actor.py",
                    ]
                )
                if node.mode == "server":
                    command.extend(
                        ["serve", "--tcp-port", "8080", "--udp-port", "5353"]
                    )
                else:
                    command.append("hold")
                self._run(command)
                created.append(node.name)
            for node in self.scenario.nodes:
                if node.mode == "server":
                    self._wait_for_server(node.name, node.address)
        except Exception:
            self._remove_containers(created)
            self._remove_network_if_owned()
            raise

    def traffic(self) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for action in self.scenario.traffic:
            command = [
                "docker",
                "exec",
                action.actor,
                "python",
                "/opt/netsense-lab/actor.py",
                "exchange",
                "--action-id",
                action.action_id,
                "--kind",
                action.kind,
                "--source",
                action.source_address,
                "--target",
                action.target_address,
                "--exchanges",
                str(action.exchanges),
            ]
            if action.target_port is not None:
                command.extend(["--port", str(action.target_port)])
            completed = subprocess.run(
                command, text=True, capture_output=True, check=False
            )
            try:
                result = json.loads(completed.stdout)
            except json.JSONDecodeError as error:
                raise LabRuntimeError(
                    f"Traffic actor {action.action_id} returned invalid evidence."
                ) from error
            result["actor"] = action.actor
            result["exitCode"] = completed.returncode
            results.append(result)
        return results

    def down(self) -> None:
        self._remove_containers(self._container_names())
        self._remove_network_if_owned()

    def _container_names(self) -> list[str]:
        result = self._run(
            [
                "docker",
                "ps",
                "--all",
                "--format",
                "{{.Names}}",
                "--filter",
                f"label=netsense.lab={self.scenario.lab_id}",
            ]
        )
        return [line for line in result.stdout.splitlines() if line]

    def _network_exists(self) -> bool:
        completed = subprocess.run(
            ["docker", "network", "inspect", self.scenario.network_name],
            text=True,
            capture_output=True,
            check=False,
        )
        return completed.returncode == 0

    def _remove_containers(self, names: list[str]) -> None:
        if not names:
            return
        for name in names:
            if name not in {node.name for node in self.scenario.nodes}:
                raise LabRuntimeError(
                    f"Refusing to remove unexpected labelled container {name}."
                )
        self._run(["docker", "rm", "--force", *names])

    def _remove_network_if_owned(self) -> None:
        if not self._network_exists():
            return
        result = self._run(
            [
                "docker",
                "network",
                "inspect",
                "--format",
                "{{json .Labels}}",
                self.scenario.network_name,
            ]
        )
        labels = json.loads(result.stdout)
        if labels.get("netsense.lab") != self.scenario.lab_id:
            raise LabRuntimeError("Refusing to remove a network not owned by this lab.")
        self._run(["docker", "network", "rm", self.scenario.network_name])

    @staticmethod
    def _wait_for_server(name: str, address: str) -> None:
        command = [
            "docker",
            "exec",
            name,
            "python",
            "/opt/netsense-lab/actor.py",
            "ready",
            "--source",
            address,
            "--tcp-port",
            "8080",
            "--udp-port",
            "5353",
        ]
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            completed = subprocess.run(
                command, text=True, capture_output=True, check=False
            )
            if completed.returncode == 0:
                return
            time.sleep(0.1)
        raise LabRuntimeError(f"Traffic service {name} did not become ready.")

    @staticmethod
    def _run(command: list[str]) -> CommandResult:
        completed = subprocess.run(command, text=True, capture_output=True, check=False)
        if completed.returncode != 0:
            detail = (
                completed.stderr.strip() or completed.stdout.strip() or "command failed"
            )
            raise LabRuntimeError(f"{command[0]} operation failed: {detail}")
        return CommandResult(stdout=completed.stdout, stderr=completed.stderr)
