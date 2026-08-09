from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

import jwt

from .errors import ApiProblem


class Role(StrEnum):
    ENGINEER = "engineer"
    SENIOR = "senior"
    ADMIN = "admin"


@dataclass(frozen=True, slots=True)
class Principal:
    subject: str
    tenant_id: str
    role: Role


@dataclass(frozen=True, slots=True)
class JwtVerificationSettings:
    public_key: str
    issuer: str
    audience: str
    algorithms: tuple[str, ...] = ("RS256",)
    maximum_lifetime: timedelta = timedelta(hours=8)
    clock_skew: timedelta = timedelta(seconds=30)


class JwtAuthenticator:
    def __init__(
        self,
        settings: JwtVerificationSettings,
        *,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        if not settings.public_key.strip():
            raise ValueError("A JWT verification key is required.")
        if not settings.algorithms or any(
            algorithm != "RS256" for algorithm in settings.algorithms
        ):
            raise ValueError("NetSense accepts only RS256 bearer tokens.")
        self._settings = settings
        self._now = now or (lambda: datetime.now(UTC))

    def authenticate(self, authorization: str | None) -> Principal:
        token = self._extract_bearer_token(authorization)
        try:
            claims = jwt.decode(
                token,
                self._settings.public_key,
                algorithms=list(self._settings.algorithms),
                issuer=self._settings.issuer,
                audience=self._settings.audience,
                options={
                    "require": ["exp", "iat", "sub"],
                    "verify_aud": True,
                    "verify_iss": True,
                },
            )
            return self._principal_from_claims(claims)
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
            raise self._unauthorized() from None

    def _principal_from_claims(self, claims: dict[str, Any]) -> Principal:
        subject = claims["sub"]
        tenant_id = claims["tenant_id"]
        issued_at = claims["iat"]
        expires_at = claims["exp"]
        if not isinstance(subject, str) or not subject.strip():
            raise ValueError("Invalid subject")
        if not isinstance(tenant_id, str) or not tenant_id.strip():
            raise ValueError("Invalid tenant")
        if not isinstance(issued_at, (int, float)) or not isinstance(expires_at, (int, float)):
            raise ValueError("Invalid token lifetime")

        lifetime = timedelta(seconds=expires_at - issued_at)
        if lifetime <= timedelta(0) or lifetime > self._settings.maximum_lifetime:
            raise ValueError("Invalid token lifetime")
        now_timestamp = self._now().timestamp()
        if issued_at > now_timestamp + self._settings.clock_skew.total_seconds():
            raise ValueError("Token issued in the future")

        return Principal(
            subject=subject,
            tenant_id=tenant_id,
            role=Role(claims["role"]),
        )

    @staticmethod
    def _extract_bearer_token(authorization: str | None) -> str:
        if not authorization:
            raise JwtAuthenticator._unauthorized()
        scheme, separator, token = authorization.partition(" ")
        if separator != " " or scheme.lower() != "bearer" or not token.strip():
            raise JwtAuthenticator._unauthorized()
        return token.strip()

    @staticmethod
    def _unauthorized() -> ApiProblem:
        return ApiProblem(
            status=401,
            code="AUTH_INVALID",
            title="Authentication required",
            detail="A valid bearer token is required.",
        )


def require_role(principal: Principal, allowed_roles: frozenset[Role]) -> None:
    if principal.role not in allowed_roles:
        raise ApiProblem(
            status=403,
            code="FORBIDDEN",
            title="Operation not permitted",
            detail="The authenticated principal cannot perform this operation.",
        )
