from __future__ import annotations

import argparse
import os
import stat
import time
from pathlib import Path

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def private_write(path: Path, content: bytes) -> None:
    if path.exists() or path.is_symlink():
        raise ValueError(f"Refusing to overwrite credential file {path}.")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
    except Exception:
        path.unlink(missing_ok=True)
        raise
    if stat.S_IMODE(path.stat().st_mode) != 0o600:
        raise ValueError(f"Credential file {path} is not owner-only.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Issue disposable virtual-lab identities"
    )
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--collector-id", required=True)
    parser.add_argument(
        "--issuer", default="https://identity.virtual-lab.netsense.local"
    )
    parser.add_argument("--audience", default="netsense-platform")
    parser.add_argument("--lifetime-seconds", type=int, default=7200)
    parser.add_argument("--database-url")
    args = parser.parse_args()
    if not 300 <= args.lifetime_seconds <= 28_800:
        raise ValueError("Token lifetime must be between 5 minutes and 8 hours.")
    args.directory.mkdir(mode=0o700, parents=True, exist_ok=False)

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    now = int(time.time())

    def token(subject: str, role: str) -> str:
        return jwt.encode(
            {
                "iss": args.issuer,
                "aud": args.audience,
                "sub": subject,
                "tenant_id": args.tenant_id,
                "role": role,
                "iat": now,
                "exp": now + args.lifetime_seconds,
            },
            private_key,
            algorithm="RS256",
        )

    private_write(args.directory / "jwt-private.pem", private_pem)
    private_write(args.directory / "jwt-public.pem", public_pem)
    private_write(
        args.directory / "probe.jwt", token(args.collector_id, "probe").encode()
    )
    private_write(
        args.directory / "operator.jwt",
        token("operator:virtual-lab", "engineer").encode(),
    )
    if args.database_url:
        private_write(
            args.directory / "database-url", args.database_url.strip().encode()
        )
    print(args.directory)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
