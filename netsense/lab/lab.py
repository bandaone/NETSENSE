from __future__ import annotations

import argparse
import json
import os
import stat
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from netsense_lab.docker_lab import DockerLab, LabRuntimeError
from netsense_lab.scenario import ScenarioError, load_scenario
from netsense_lab.scorer import score_snapshot

LAB_DIRECTORY = Path(__file__).resolve().parent
DEFAULT_SCENARIO = LAB_DIRECTORY / "scenario.json"
DEFAULT_RUNTIME = LAB_DIRECTORY / "runtime"
DEFAULT_ARTIFACTS = LAB_DIRECTORY / "artifacts"


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            os.fchmod(temporary.fileno(), 0o600)
            json.dump(value, temporary, indent=2, sort_keys=True)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        temporary_path.replace(path)
    except Exception:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        raise


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_private_token(path: Path) -> str:
    metadata = path.lstat()
    if not stat.S_ISREG(metadata.st_mode) or path.is_symlink():
        raise ValueError("Token path must be a regular non-symlink file.")
    if stat.S_IMODE(metadata.st_mode) & 0o077:
        raise ValueError("Token file must be owner-only.")
    return path.read_text(encoding="utf-8").strip()


def _fetch_snapshot(url: str, token_file: Path) -> dict[str, Any]:
    token = _read_private_token(token_file)
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Platform returned HTTP {error.code}.") from error
    if not isinstance(payload, dict):
        raise TypeError("Platform topology response is not an object.")
    return payload


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="NetSense software-LAN acceptance lab")
    result.add_argument("--scenario", type=Path, default=DEFAULT_SCENARIO)
    result.add_argument("--runtime", type=Path, default=DEFAULT_RUNTIME)
    result.add_argument("--artifacts", type=Path, default=DEFAULT_ARTIFACTS)
    commands = result.add_subparsers(dest="command", required=True)
    commands.add_parser("doctor")
    commands.add_parser("up")
    commands.add_parser("down")
    commands.add_parser("traffic")
    configure_probe = commands.add_parser("configure-probe")
    configure_probe.add_argument("--platform-url", default="http://127.0.0.1:8010")
    score = commands.add_parser("score")
    score.add_argument("--snapshot", type=Path)
    score.add_argument("--platform-url", default="http://127.0.0.1:8010")
    score.add_argument("--operator-token", type=Path)
    return result


def main() -> int:
    args = parser().parse_args()
    scenario = load_scenario(args.scenario.resolve())
    lab = DockerLab(scenario, LAB_DIRECTORY / "actor.py")
    if args.command == "doctor":
        print(json.dumps(lab.doctor(), indent=2, sort_keys=True))
        return 0
    if args.command == "up":
        lab.up()
        print(
            f"Created isolated lab {scenario.network_name} on {scenario.bridge_name}."
        )
        return 0
    if args.command == "down":
        lab.down()
        print(f"Removed resources labelled netsense.lab={scenario.lab_id}.")
        return 0
    if args.command == "traffic":
        evidence = lab.traffic()
        artifact = args.artifacts / "traffic-evidence.json"
        _write_json(artifact, evidence)
        print(artifact)
        return 0 if all(item.get("exitCode") == 0 for item in evidence) else 1
    if args.command == "configure-probe":
        runtime = args.runtime.resolve()
        identity = runtime / "identity"
        probe_token = identity / "probe.jwt"
        if not probe_token.is_file() or probe_token.is_symlink():
            raise ValueError("Issue an owner-only runtime/identity/probe.jwt first.")
        probe_config = {
            "probeId": scenario.collector_id,
            "tenantId": scenario.tenant_id,
            "organisationId": scenario.organisation_id,
            "organisationName": scenario.organisation_name,
            "siteId": scenario.site_id,
            "siteName": scenario.site_name,
            "capture": {
                "interface": scenario.bridge_name,
                "bpfFilter": (
                    f"ip and src net {scenario.subnet} and dst net {scenario.subnet} "
                    "and not ether broadcast and not ether multicast"
                ),
                "snapLength": 160,
                "snapshotInterval": "30s",
                "observationHorizon": "3m",
                "maxDevices": 256,
                "maxFlows": 2048,
            },
            "storage": {
                "directory": str(runtime / "spool"),
                "maxPendingSnapshots": 20,
            },
            "platform": {
                "baseUrl": args.platform_url,
                "tokenFile": str(probe_token),
                "timeout": "5s",
                "allowInsecureTransport": False,
            },
        }
        config_path = runtime / "probe.json"
        _write_json(config_path, probe_config)
        print(config_path)
        return 0

    traffic_evidence = _read_json(args.artifacts / "traffic-evidence.json")
    if not isinstance(traffic_evidence, list):
        raise TypeError("Traffic evidence must be a JSON array.")
    if args.snapshot:
        snapshot = _read_json(args.snapshot)
    else:
        token_file = args.operator_token or args.runtime / "identity" / "operator.jwt"
        topology_url = (
            f"{args.platform_url.rstrip('/')}/api/v1/sites/{scenario.site_id}/topology"
        )
        snapshot = _fetch_snapshot(topology_url, token_file)
    if not isinstance(snapshot, dict):
        raise TypeError("Topology snapshot must be a JSON object.")
    report = score_snapshot(scenario, traffic_evidence, snapshot)
    report_path = args.artifacts / "acceptance-report.json"
    _write_json(report_path, report.to_json())
    print(json.dumps(report.to_json(), indent=2, sort_keys=True))
    return 0 if report.passed else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (
        LabRuntimeError,
        ScenarioError,
        OSError,
        TypeError,
        ValueError,
        RuntimeError,
    ) as error:
        print(f"lab error: {error}", file=sys.stderr)
        raise SystemExit(2) from None
