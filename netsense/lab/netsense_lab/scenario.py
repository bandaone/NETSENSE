from __future__ import annotations

import ipaddress
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class ScenarioError(ValueError):
    """Raised when the lab declaration is unsafe or internally inconsistent."""


_RFC1918_NETWORKS = tuple(
    ipaddress.ip_network(value)
    for value in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")
)
_DOCKER_NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")
_INTERFACE_NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,14}$")
_IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
_ACTOR_IMAGE = re.compile(r"^[a-z0-9][a-z0-9./_-]*@sha256:[0-9a-f]{64}$")


@dataclass(frozen=True, slots=True)
class LabNode:
    name: str
    role: str
    address: str
    mac_address: str
    mode: str
    silent: bool


@dataclass(frozen=True, slots=True)
class TrafficAction:
    action_id: str
    actor: str
    kind: str
    source_address: str
    target_address: str
    target_port: int | None
    exchanges: int


@dataclass(frozen=True, slots=True)
class LabScenario:
    lab_id: str
    actor_image: str
    network_name: str
    bridge_name: str
    subnet: str
    gateway: str
    tenant_id: str
    organisation_id: str
    organisation_name: str
    site_id: str
    site_name: str
    collector_id: str
    nodes: tuple[LabNode, ...]
    traffic: tuple[TrafficAction, ...]

    @property
    def silent_addresses(self) -> frozenset[str]:
        return frozenset(node.address for node in self.nodes if node.silent)


def load_scenario(path: Path) -> LabScenario:
    try:
        raw: Any = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioError(f"Cannot read lab scenario: {error}") from error
    if not isinstance(raw, dict) or raw.get("schemaVersion") != "1.0.0":
        raise ScenarioError("Lab scenario schemaVersion must be 1.0.0.")
    _keys(
        raw,
        required={
            "schemaVersion",
            "labId",
            "actorImage",
            "network",
            "site",
            "nodes",
            "traffic",
        },
    )

    network = _mapping(raw, "network")
    site = _mapping(raw, "site")
    _keys(network, required={"name", "bridgeName", "subnet", "gateway"})
    _keys(
        site,
        required={
            "tenantId",
            "organisationId",
            "organisationName",
            "siteId",
            "siteName",
            "collectorId",
        },
    )
    subnet = _network(_text(network, "subnet"))
    gateway = _address(_text(network, "gateway"), subnet)
    nodes_raw = raw.get("nodes")
    traffic_raw = raw.get("traffic")
    if not isinstance(nodes_raw, list) or not nodes_raw:
        raise ScenarioError("Lab scenario requires at least one node.")
    if not isinstance(traffic_raw, list) or not traffic_raw:
        raise ScenarioError("Lab scenario requires at least one traffic action.")

    nodes = tuple(_node(value, subnet) for value in nodes_raw)
    _unique((node.name for node in nodes), "node name")
    _unique((node.address for node in nodes), "node address")
    _unique((node.mac_address for node in nodes), "node MAC address")
    if gateway in {node.address for node in nodes}:
        raise ScenarioError("The bridge gateway must not duplicate a node address.")

    nodes_by_name = {node.name: node for node in nodes}
    traffic = tuple(
        _traffic(value, subnet, nodes_by_name, gateway) for value in traffic_raw
    )
    _unique((action.action_id for action in traffic), "traffic action ID")

    return LabScenario(
        lab_id=_safe_docker_name(_text(raw, "labId")),
        actor_image=_actor_image(_text(raw, "actorImage")),
        network_name=_safe_docker_name(_text(network, "name")),
        bridge_name=_safe_interface_name(_text(network, "bridgeName")),
        subnet=str(subnet),
        gateway=gateway,
        tenant_id=_identifier(_text(site, "tenantId"), "tenantId"),
        organisation_id=_identifier(_text(site, "organisationId"), "organisationId"),
        organisation_name=_text(site, "organisationName"),
        site_id=_identifier(_text(site, "siteId"), "siteId"),
        site_name=_text(site, "siteName"),
        collector_id=_identifier(_text(site, "collectorId"), "collectorId"),
        nodes=nodes,
        traffic=traffic,
    )


def _mapping(value: dict[str, Any], key: str) -> dict[str, Any]:
    result = value.get(key)
    if not isinstance(result, dict):
        raise ScenarioError(f"{key} must be an object.")
    return result


def _keys(
    value: dict[str, Any],
    *,
    required: set[str],
    optional: set[str] | None = None,
) -> None:
    optional = optional or set()
    missing = required - value.keys()
    unknown = value.keys() - required - optional
    if missing:
        raise ScenarioError(f"Missing scenario field(s): {', '.join(sorted(missing))}.")
    if unknown:
        raise ScenarioError(f"Unknown scenario field(s): {', '.join(sorted(unknown))}.")


def _text(value: dict[str, Any], key: str) -> str:
    result = value.get(key)
    if not isinstance(result, str) or not result or result.strip() != result:
        raise ScenarioError(f"{key} must be a non-empty trimmed string.")
    return result


def _network(value: str) -> ipaddress.IPv4Network:
    try:
        result = ipaddress.ip_network(value, strict=True)
    except ValueError as error:
        raise ScenarioError(
            "network.subnet must be a canonical IPv4 subnet."
        ) from error
    if not isinstance(result, ipaddress.IPv4Network) or not any(
        result.subnet_of(allowed) for allowed in _RFC1918_NETWORKS
    ):
        raise ScenarioError("network.subnet must be an RFC1918 private IPv4 subnet.")
    return result


def _address(value: str, subnet: ipaddress.IPv4Network) -> str:
    try:
        address = ipaddress.ip_address(value)
    except ValueError as error:
        raise ScenarioError(f"Invalid lab address: {value}") from error
    if not isinstance(address, ipaddress.IPv4Address) or address not in subnet:
        raise ScenarioError(f"Lab address {value} is outside {subnet}.")
    if address in {subnet.network_address, subnet.broadcast_address}:
        raise ScenarioError(f"Lab address {value} is not assignable.")
    return str(address)


def _node(value: Any, subnet: ipaddress.IPv4Network) -> LabNode:
    if not isinstance(value, dict):
        raise ScenarioError("Every lab node must be an object.")
    _keys(
        value,
        required={"name", "role", "address", "macAddress", "mode"},
        optional={"silent"},
    )
    if "silent" in value and not isinstance(value["silent"], bool):
        raise ScenarioError("Node silent must be a boolean.")
    mode = _text(value, "mode")
    if mode not in {"hold", "server"}:
        raise ScenarioError("Node mode must be hold or server.")
    mac_address = _text(value, "macAddress").lower()
    octets = mac_address.split(":")
    if len(octets) != 6 or any(len(octet) != 2 for octet in octets):
        raise ScenarioError(f"Invalid node MAC address: {mac_address}")
    try:
        parsed = bytes(int(octet, 16) for octet in octets)
    except ValueError as error:
        raise ScenarioError(f"Invalid node MAC address: {mac_address}") from error
    if parsed[0] & 1:
        raise ScenarioError("Node MAC addresses must be unicast.")
    return LabNode(
        name=_safe_docker_name(_text(value, "name")),
        role=_text(value, "role"),
        address=_address(_text(value, "address"), subnet),
        mac_address=mac_address,
        mode=mode,
        silent=value.get("silent") is True,
    )


def _traffic(
    value: Any,
    subnet: ipaddress.IPv4Network,
    nodes_by_name: dict[str, LabNode],
    gateway: str,
) -> TrafficAction:
    if not isinstance(value, dict):
        raise ScenarioError("Every traffic action must be an object.")
    _keys(
        value,
        required={
            "id",
            "actor",
            "kind",
            "sourceAddress",
            "targetAddress",
            "exchanges",
        },
        optional={"targetPort"},
    )
    actor = _safe_docker_name(_text(value, "actor"))
    if actor not in nodes_by_name or nodes_by_name[actor].silent:
        raise ScenarioError("Traffic actors must identify a non-silent declared node.")
    kind = _text(value, "kind")
    if kind not in {"tcp", "udp", "icmp"}:
        raise ScenarioError("Traffic kind must be tcp, udp, or icmp.")
    source = _address(_text(value, "sourceAddress"), subnet)
    if source != nodes_by_name[actor].address:
        raise ScenarioError("Traffic sourceAddress must match the actor address.")
    target = _address(_text(value, "targetAddress"), subnet)
    node_addresses = {node.address for node in nodes_by_name.values()}
    if target not in node_addresses | {gateway}:
        raise ScenarioError("Traffic targetAddress must be a declared node or gateway.")
    raw_port = value.get("targetPort")
    target_port: int | None = None
    if kind in {"tcp", "udp"}:
        if not isinstance(raw_port, int) or not 1 <= raw_port <= 65535:
            raise ScenarioError("TCP and UDP actions require a valid targetPort.")
        target_port = raw_port
    elif raw_port is not None:
        raise ScenarioError("ICMP actions must not declare targetPort.")
    exchanges = value.get("exchanges")
    if not isinstance(exchanges, int) or not 1 <= exchanges <= 100:
        raise ScenarioError("Traffic exchanges must be between 1 and 100.")
    return TrafficAction(
        action_id=_text(value, "id"),
        actor=actor,
        kind=kind,
        source_address=source,
        target_address=target,
        target_port=target_port,
        exchanges=exchanges,
    )


def _unique(values: Any, description: str) -> None:
    items = list(values)
    if len(items) != len(set(items)):
        raise ScenarioError(f"Lab scenario contains a duplicate {description}.")


def _safe_docker_name(value: str) -> str:
    if not _DOCKER_NAME.fullmatch(value):
        raise ScenarioError(f"Unsafe Docker lab name: {value}")
    return value


def _safe_interface_name(value: str) -> str:
    if not _INTERFACE_NAME.fullmatch(value):
        raise ScenarioError(f"Unsafe bridge interface name: {value}")
    return value


def _identifier(value: str, field: str) -> str:
    if not _IDENTIFIER.fullmatch(value):
        raise ScenarioError(f"Unsafe {field}: {value}")
    return value


def _actor_image(value: str) -> str:
    if not _ACTOR_IMAGE.fullmatch(value):
        raise ScenarioError("actorImage must be pinned to an exact sha256 digest.")
    return value
