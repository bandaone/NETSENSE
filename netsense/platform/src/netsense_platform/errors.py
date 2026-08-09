from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class Violation:
    path: str
    message: str


class ContractViolationError(ValueError):
    def __init__(self, contract_name: str, violations: tuple[Violation, ...]) -> None:
        super().__init__(f"{contract_name} failed contract validation")
        self.contract_name = contract_name
        self.violations = violations


class ApiProblem(Exception):
    def __init__(
        self,
        *,
        status: int,
        code: str,
        title: str,
        detail: str | None = None,
        violations: tuple[Violation, ...] = (),
    ) -> None:
        super().__init__(title)
        self.status = status
        self.code = code
        self.title = title
        self.detail = detail
        self.violations = violations

    def as_document(self, trace_id: str) -> dict[str, Any]:
        document: dict[str, Any] = {
            "type": f"https://problems.netsense.example/{self.code.lower().replace('_', '-')}",
            "title": self.title,
            "status": self.status,
            "code": self.code,
            "traceId": trace_id,
        }
        if self.detail:
            document["detail"] = self.detail
        if self.violations:
            document["violations"] = [
                {"path": violation.path, "message": violation.message}
                for violation in self.violations[:20]
            ]
        return document


def not_found() -> ApiProblem:
    return ApiProblem(
        status=404,
        code="RESOURCE_NOT_FOUND",
        title="Resource not found",
        detail="The requested resource is not available in this scope.",
    )


class RepositoryNotFoundError(LookupError):
    """Non-disclosing repository miss for absent and out-of-scope resources."""


class RepositoryConflictError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class RepositoryValidationError(ValueError):
    pass
