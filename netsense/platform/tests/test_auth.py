from __future__ import annotations

from datetime import timedelta

import pytest

from netsense_platform.auth import JwtAuthenticator, JwtVerificationSettings, Role
from netsense_platform.errors import ApiProblem

from .support import (
    AUDIENCE,
    ISSUER,
    NOW,
    OTHER_TENANT_ID,
    TENANT_ID,
    authenticator,
    make_token,
    signing_keys,
)


def test_authenticates_a_scoped_rs256_principal() -> None:
    keys = signing_keys()
    principal = authenticator(keys).authenticate(f"Bearer {make_token(keys)}")

    assert principal.subject == "operator:mutale"
    assert principal.tenant_id == TENANT_ID
    assert principal.role is Role.ENGINEER


@pytest.mark.parametrize("authorization", [None, "", "Basic token", "Bearer "])
def test_missing_and_malformed_credentials_are_non_disclosing(authorization: str | None) -> None:
    keys = signing_keys()
    with pytest.raises(ApiProblem) as captured:
        authenticator(keys).authenticate(authorization)

    assert captured.value.status == 401
    assert captured.value.code == "AUTH_INVALID"


def test_rejects_expired_tampered_wrong_audience_and_invalid_role_tokens() -> None:
    keys = signing_keys()
    other_keys = signing_keys()
    verifier = authenticator(keys)
    tokens = [
        make_token(keys, expires_at=NOW - timedelta(seconds=1)),
        make_token(keys, private_key=other_keys.private_key),
        make_token(keys, audience="another-service"),
        make_token(keys, role="owner"),
    ]

    for token in tokens:
        with pytest.raises(ApiProblem) as captured:
            verifier.authenticate(f"Bearer {token}")
        assert (captured.value.status, captured.value.code) == (401, "AUTH_INVALID")


def test_rejects_tokens_with_a_lifetime_over_eight_hours_or_future_issue_time() -> None:
    keys = signing_keys()
    verifier = authenticator(keys)
    tokens = [
        make_token(
            keys,
            issued_at=NOW - timedelta(minutes=1),
            expires_at=NOW + timedelta(hours=8),
        ),
        make_token(
            keys,
            issued_at=NOW + timedelta(minutes=1),
            expires_at=NOW + timedelta(hours=1),
        ),
    ]

    for token in tokens:
        with pytest.raises(ApiProblem):
            verifier.authenticate(f"Bearer {token}")


def test_refuses_non_rs256_configuration() -> None:
    keys = signing_keys()
    with pytest.raises(ValueError, match="only RS256"):
        JwtAuthenticator(
            JwtVerificationSettings(
                public_key=keys.public_key,
                issuer=ISSUER,
                audience=AUDIENCE,
                algorithms=("HS256",),
            )
        )


def test_refuses_empty_verification_key_and_empty_identity_claims() -> None:
    keys = signing_keys()
    with pytest.raises(ValueError, match="verification key"):
        JwtAuthenticator(JwtVerificationSettings(public_key=" ", issuer=ISSUER, audience=AUDIENCE))

    verifier = authenticator(keys)
    for token in (make_token(keys, subject=""), make_token(keys, tenant_id="")):
        with pytest.raises(ApiProblem):
            verifier.authenticate(f"Bearer {token}")


def test_tenant_is_taken_from_the_verified_token() -> None:
    keys = signing_keys()
    principal = authenticator(keys).authenticate(
        f"Bearer {make_token(keys, tenant_id=OTHER_TENANT_ID)}"
    )
    assert principal.tenant_id == OTHER_TENANT_ID
