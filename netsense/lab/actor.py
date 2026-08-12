from __future__ import annotations

import argparse
import json
import os
import signal
import socket
import struct
import threading
import time
from typing import Any


def _checksum(payload: bytes) -> int:
    if len(payload) % 2:
        payload += b"\x00"
    total = sum(struct.unpack(f"!{len(payload) // 2}H", payload))
    total = (total >> 16) + (total & 0xFFFF)
    total += total >> 16
    return (~total) & 0xFFFF


def _tcp_server(port: int, stop: threading.Event) -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        listener.bind(("0.0.0.0", port))
        listener.listen(16)
        listener.settimeout(0.5)
        while not stop.is_set():
            try:
                connection, _ = listener.accept()
            except TimeoutError:
                continue
            with connection:
                connection.settimeout(2)
                payload = connection.recv(256)
                if payload.startswith(b"NETSENSE-LAB "):
                    connection.sendall(payload)


def _udp_server(port: int, stop: threading.Event) -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as listener:
        listener.bind(("0.0.0.0", port))
        listener.settimeout(0.5)
        while not stop.is_set():
            try:
                payload, peer = listener.recvfrom(256)
            except TimeoutError:
                continue
            if payload.startswith(b"NETSENSE-LAB "):
                listener.sendto(payload, peer)


def serve(tcp_port: int, udp_port: int) -> int:
    stop = threading.Event()

    def request_stop(_signum: int, _frame: Any) -> None:
        stop.set()

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)
    workers = [
        threading.Thread(target=_tcp_server, args=(tcp_port, stop), daemon=True),
        threading.Thread(target=_udp_server, args=(udp_port, stop), daemon=True),
    ]
    for worker in workers:
        worker.start()
    while not stop.wait(0.5):
        if not all(worker.is_alive() for worker in workers):
            return 1
    return 0


def hold() -> int:
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda _signum, _frame: stop.set())
    signal.signal(signal.SIGINT, lambda _signum, _frame: stop.set())
    while not stop.wait(1):
        pass
    return 0


def ready(source: str, tcp_port: int, udp_port: int) -> int:
    nonce = b"NETSENSE-LAB readiness"
    try:
        tcp_ready = _tcp_exchange(source, source, tcp_port, nonce)
        udp_ready = _udp_exchange(source, source, udp_port, nonce)
    except OSError:
        return 1
    return 0 if tcp_ready and udp_ready else 1


def _tcp_exchange(source: str, target: str, port: int, nonce: bytes) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as connection:
        connection.settimeout(2)
        connection.bind((source, 0))
        connection.connect((target, port))
        connection.sendall(nonce)
        return connection.recv(256) == nonce


def _udp_exchange(source: str, target: str, port: int, nonce: bytes) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as connection:
        connection.settimeout(2)
        connection.bind((source, 0))
        connection.sendto(nonce, (target, port))
        response, peer = connection.recvfrom(256)
        return response == nonce and peer[0] == target


def _icmp_exchange(source: str, target: str, sequence: int, nonce: bytes) -> bool:
    identifier = os.getpid() & 0xFFFF
    header = struct.pack("!BBHHH", 8, 0, 0, identifier, sequence)
    request = (
        struct.pack("!BBHHH", 8, 0, _checksum(header + nonce), identifier, sequence)
        + nonce
    )
    with socket.socket(
        socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP
    ) as connection:
        connection.settimeout(2)
        connection.bind((source, 0))
        connection.sendto(request, (target, 0))
        deadline = time.monotonic() + 2
        while time.monotonic() < deadline:
            packet, peer = connection.recvfrom(2048)
            if peer[0] != target or len(packet) < 28:
                continue
            header_length = (packet[0] & 0x0F) * 4
            icmp = packet[header_length:]
            if len(icmp) < 8:
                continue
            message_type, _, _, response_id, response_sequence = struct.unpack(
                "!BBHHH", icmp[:8]
            )
            if (
                message_type == 0
                and response_id == identifier
                and response_sequence == sequence
                and icmp[8:] == nonce
            ):
                return True
        return False


def exchange(args: argparse.Namespace) -> int:
    successful = 0
    failures: list[str] = []
    for sequence in range(1, args.exchanges + 1):
        nonce = f"NETSENSE-LAB {args.action_id} {sequence}".encode()
        try:
            if args.kind == "tcp":
                success = _tcp_exchange(args.source, args.target, args.port, nonce)
            elif args.kind == "udp":
                success = _udp_exchange(args.source, args.target, args.port, nonce)
            else:
                success = _icmp_exchange(args.source, args.target, sequence, nonce)
        except OSError as error:
            success = False
            failures.append(type(error).__name__)
        if success:
            successful += 1
        elif len(failures) < sequence:
            failures.append("response_mismatch_or_timeout")
        time.sleep(0.08)

    print(
        json.dumps(
            {
                "actionId": args.action_id,
                "kind": args.kind,
                "sourceAddress": args.source,
                "targetAddress": args.target,
                "targetPort": args.port,
                "attemptedExchanges": args.exchanges,
                "successfulExchanges": successful,
                "failures": failures,
                "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
            separators=(",", ":"),
            sort_keys=True,
        )
    )
    return 0 if successful == args.exchanges else 1


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="NetSense virtual lab traffic actor")
    commands = result.add_subparsers(dest="command", required=True)
    server = commands.add_parser("serve")
    server.add_argument("--tcp-port", type=int, required=True)
    server.add_argument("--udp-port", type=int, required=True)
    commands.add_parser("hold")
    readiness = commands.add_parser("ready")
    readiness.add_argument("--source", required=True)
    readiness.add_argument("--tcp-port", type=int, required=True)
    readiness.add_argument("--udp-port", type=int, required=True)
    client = commands.add_parser("exchange")
    client.add_argument("--action-id", required=True)
    client.add_argument("--kind", choices=("tcp", "udp", "icmp"), required=True)
    client.add_argument("--source", required=True)
    client.add_argument("--target", required=True)
    client.add_argument("--port", type=int)
    client.add_argument("--exchanges", type=int, required=True)
    return result


def main() -> int:
    args = parser().parse_args()
    if args.command == "serve":
        return serve(args.tcp_port, args.udp_port)
    if args.command == "hold":
        return hold()
    if args.command == "ready":
        return ready(args.source, args.tcp_port, args.udp_port)
    return exchange(args)


if __name__ == "__main__":
    raise SystemExit(main())
