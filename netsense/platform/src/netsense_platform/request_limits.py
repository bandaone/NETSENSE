from __future__ import annotations

import json
from collections.abc import Awaitable, Callable

from starlette.types import Message, Receive, Scope, Send

from .errors import ApiProblem

AsgiApp = Callable[[Scope, Receive, Send], Awaitable[None]]
BODY_METHODS = frozenset({"POST", "PUT", "PATCH"})


class RequestBodyLimitMiddleware:
    """Reject oversized request bodies before application JSON decoding."""

    def __init__(self, app: AsgiApp, *, max_bytes: int) -> None:
        if max_bytes < 1:
            raise ValueError("Maximum request-body size must be positive.")
        self._app = app
        self._max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] not in BODY_METHODS:
            await self._app(scope, receive, send)
            return

        declared_size = _content_length(scope)
        if declared_size is not None and declared_size > self._max_bytes:
            await _send_payload_too_large(scope, send)
            return

        body = bytearray()
        while True:
            message = await receive()
            if message["type"] != "http.request":
                await self._app(scope, _single_message_receive(message), send)
                return
            body.extend(message.get("body", b""))
            if len(body) > self._max_bytes:
                await _send_payload_too_large(scope, send)
                return
            if not message.get("more_body", False):
                break

        await self._app(scope, _bounded_body_receive(bytes(body)), send)


def _content_length(scope: Scope) -> int | None:
    values = [value for name, value in scope["headers"] if name.lower() == b"content-length"]
    if len(values) != 1:
        return None
    try:
        value = values[0].decode("ascii")
    except UnicodeDecodeError:
        return None
    return int(value) if value.isdecimal() else None


def _single_message_receive(message: Message) -> Receive:
    delivered = False

    async def receive() -> Message:
        nonlocal delivered
        if delivered:
            return {"type": "http.disconnect"}
        delivered = True
        return message

    return receive


def _bounded_body_receive(body: bytes) -> Receive:
    delivered = False

    async def receive() -> Message:
        nonlocal delivered
        if delivered:
            return {"type": "http.disconnect"}
        delivered = True
        return {"type": "http.request", "body": body, "more_body": False}

    return receive


async def _send_payload_too_large(scope: Scope, send: Send) -> None:
    trace_id = scope.get("state", {}).get("trace_id", "trace_unavailable")
    problem = ApiProblem(
        status=413,
        code="PAYLOAD_TOO_LARGE",
        title="Request payload too large",
        detail="The request body exceeds the configured platform limit.",
    ).as_document(trace_id)
    body = json.dumps(problem, separators=(",", ":")).encode("utf-8")
    headers: list[tuple[bytes, bytes]] = [
        (b"content-type", b"application/problem+json"),
        (b"content-length", str(len(body)).encode("ascii")),
    ]
    await send({"type": "http.response.start", "status": 413, "headers": headers})
    await send({"type": "http.response.body", "body": body})
