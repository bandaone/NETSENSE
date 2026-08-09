from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from netsense_platform.auth import JwtAuthenticator, JwtVerificationSettings
from netsense_platform.contracts import ContractRegistry
from netsense_platform.memory_repository import MemoryPlatformRepository

NOW = datetime.now(UTC).replace(microsecond=0)
TENANT_ID = "tenant:unza"
OTHER_TENANT_ID = "tenant:other"
SITE_ID = "site:great-east-road"
INCIDENT_ID = "incident:unza:identity"
NODE_ID = "device:unza:identity-service"
EVIDENCE_ID = "evidence:unza:identity-health"
ISSUER = "https://identity.netsense.test"
AUDIENCE = "netsense-platform"


@dataclass(frozen=True, slots=True)
class SigningKeys:
    private_key: str
    public_key: str


def signing_keys() -> SigningKeys:
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return SigningKeys(private_pem.decode(), public_pem.decode())


def make_token(
    keys: SigningKeys,
    *,
    tenant_id: str = TENANT_ID,
    role: str = "engineer",
    subject: str = "operator:mutale",
    issued_at: datetime = NOW - timedelta(minutes=5),
    expires_at: datetime = NOW + timedelta(hours=1),
    issuer: str = ISSUER,
    audience: str = AUDIENCE,
    private_key: str | None = None,
) -> str:
    return jwt.encode(
        {
            "sub": subject,
            "tenant_id": tenant_id,
            "role": role,
            "iat": int(issued_at.timestamp()),
            "exp": int(expires_at.timestamp()),
            "iss": issuer,
            "aud": audience,
        },
        private_key or keys.private_key,
        algorithm="RS256",
    )


def authenticator(keys: SigningKeys) -> JwtAuthenticator:
    return JwtAuthenticator(
        JwtVerificationSettings(
            public_key=keys.public_key,
            issuer=ISSUER,
            audience=AUDIENCE,
        ),
        now=lambda: NOW,
    )


def contract_registry() -> ContractRegistry:
    contracts = Path(__file__).resolve().parents[2] / "docs" / "contracts"
    return ContractRegistry(contracts)


def topology_snapshot(*, tenant_id: str = TENANT_ID, site_id: str = SITE_ID) -> dict[str, Any]:
    timestamp = "2026-08-09T11:55:00.000Z"
    return {
        "schemaVersion": "1.0.0",
        "snapshotId": f"snapshot:{tenant_id}:{site_id}:1",
        "tenantId": tenant_id,
        "organisation": {"id": tenant_id, "name": "University Network"},
        "site": {"id": site_id, "organisationId": tenant_id, "name": "Great East Road Campus"},
        "synthetic": False,
        "syntheticDataNotice": None,
        "generatedAt": timestamp,
        "observedAt": timestamp,
        "coverageSummary": {
            "totalEntities": 1,
            "full": 1,
            "partial": 0,
            "none": 0,
            "unsupported": 0,
        },
        "nodes": [
            {
                "id": NODE_ID,
                "kind": "service",
                "displayName": "Identity Service",
                "role": "identity_service",
                "identifiers": {
                    "hostnames": ["identity.example.test"],
                    "ipAddresses": ["192.0.2.10"],
                    "macAddresses": [],
                    "serialNumbers": [],
                },
                "parentId": None,
                "operationalCriticality": 5,
                "lifecycleState": "active",
                "assessment": {
                    "operationalHealth": "degraded",
                    "freshness": "current",
                    "coverage": "full",
                    "managementState": "managed",
                    "confidence": 0.96,
                    "assessedAt": timestamp,
                    "reasonCodes": ["health_check_failed"],
                    "evidenceIds": [EVIDENCE_ID],
                },
                "tags": ["identity"],
                "evidenceIds": [EVIDENCE_ID],
            }
        ],
        "interfaces": [],
        "relationships": [],
        "evidence": [
            {
                "id": EVIDENCE_ID,
                "sourceType": "simulation",
                "collectorId": "collector:test",
                "observedAt": timestamp,
                "expiresAt": None,
                "summary": "Synthetic contract fixture for platform tests.",
                "confidenceContribution": 0.96,
                "limitations": ["Not collected from a live network."],
            }
        ],
    }


def incident_case(*, tenant_id: str = TENANT_ID) -> dict[str, Any]:
    snapshot = topology_snapshot(tenant_id=tenant_id)
    return {
        "schemaVersion": "1.0.0",
        "incident": {
            "id": INCIDENT_ID,
            "tenantId": tenant_id,
            "title": "Identity service degraded",
            "severity": "major",
            "state": "open",
            "detectedAt": "2026-08-09T11:55:00.000Z",
            "siteId": SITE_ID,
        },
        "analysedAt": "2026-08-09T11:56:00.000Z",
        "snapshot": snapshot,
        "observations": [
            {
                "id": "observation:identity-health",
                "target": {"kind": "node", "id": NODE_ID},
                "symptomKind": "degraded",
                "observedAt": "2026-08-09T11:55:00.000Z",
                "knowledgeKind": "observed",
                "evidenceIds": [EVIDENCE_ID],
                "summary": "The identity health check is degraded.",
            }
        ],
        "candidateTargets": [{"kind": "node", "id": NODE_ID}],
    }


def incident_analysis() -> dict[str, Any]:
    return {
        "schemaVersion": "1.0.0",
        "incidentId": INCIDENT_ID,
        "tenantId": TENANT_ID,
        "siteId": SITE_ID,
        "analysedAt": "2026-08-09T11:56:00.000Z",
        "probableCauseCandidates": [
            {
                "target": {"kind": "node", "id": NODE_ID},
                "rank": 1,
                "score": 0.9,
                "confidence": "high",
                "supportingFactors": [
                    {
                        "code": "direct_observation",
                        "summary": "A current direct observation supports this candidate.",
                        "weight": 1,
                        "evidenceIds": [EVIDENCE_ID],
                    }
                ],
                "weakeningFactors": [],
                "downstreamObservationCount": 1,
            }
        ],
        "impact": [
            {
                "entityId": NODE_ID,
                "classification": "confirmed_affected",
                "reasons": ["A current direct observation is present."],
                "evidenceIds": [EVIDENCE_ID],
            }
        ],
        "alternatePaths": [],
        "safeNextChecks": [
            {
                "id": "check:identity-local",
                "category": "passive_verification",
                "title": "Verify the service health endpoint",
                "rationale": "Confirms whether degradation remains current.",
                "target": {"kind": "node", "id": NODE_ID},
            }
        ],
        "limitations": ["The fixture contains one evidence source."],
    }


def repository(contracts: ContractRegistry) -> MemoryPlatformRepository:
    return MemoryPlatformRepository(
        contracts=contracts,
        topology_snapshots=[topology_snapshot()],
        incident_cases=[incident_case()],
        incident_analyses=[incident_analysis()],
    )
