from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import uuid4

from fastapi import Body, Depends, FastAPI, Header, Path, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .auth import JwtAuthenticator, Principal, Role, require_role
from .contracts import ContractRegistry
from .errors import (
    ApiProblem,
    ContractViolationError,
    RepositoryConflictError,
    RepositoryNotFoundError,
    RepositoryValidationError,
    Violation,
    not_found,
)
from .repositories import IncidentRepository, JsonObject, TopologyRepository

LOGGER = logging.getLogger("netsense.platform")
MUTATION_ROLES = frozenset({Role.ENGINEER, Role.SENIOR, Role.ADMIN})
RESOLUTION_ROLES = frozenset({Role.SENIOR, Role.ADMIN})


def create_app(
    *,
    authenticator: JwtAuthenticator,
    contracts: ContractRegistry,
    topology_repository: TopologyRepository,
    incident_repository: IncidentRepository,
    now: Callable[[], datetime] | None = None,
    trace_id_factory: Callable[[], str] | None = None,
) -> FastAPI:
    clock = now or (lambda: datetime.now(UTC))
    new_trace_id = trace_id_factory or (lambda: f"trace_{uuid4().hex}")
    app = FastAPI(
        title="NetSense Platform API",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )

    @app.middleware("http")
    async def attach_trace_id(request: Request, call_next: Callable[..., Any]):
        request.state.trace_id = new_trace_id()
        response = await call_next(request)
        response.headers["X-Trace-Id"] = request.state.trace_id
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(ApiProblem)
    async def handle_api_problem(request: Request, error: ApiProblem) -> JSONResponse:
        document = contracts.validate("problem", error.as_document(_trace_id(request)))
        headers = {"WWW-Authenticate": "Bearer"} if error.status == 401 else None
        return JSONResponse(
            status_code=error.status,
            content=document,
            media_type="application/problem+json",
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        violations = tuple(
            Violation(
                path="/" + "/".join(str(part) for part in issue["loc"] if part != "body"),
                message="The request value is invalid.",
            )
            for issue in error.errors()[:20]
        )
        problem = ApiProblem(
            status=422,
            code="VALIDATION_ERROR",
            title="Request validation failed",
            detail="The request does not satisfy the API contract.",
            violations=violations,
        )
        return await handle_api_problem(request, problem)

    @app.exception_handler(RepositoryNotFoundError)
    async def handle_not_found(request: Request, _: RepositoryNotFoundError) -> JSONResponse:
        return await handle_api_problem(request, not_found())

    @app.exception_handler(RepositoryConflictError)
    async def handle_conflict(request: Request, error: RepositoryConflictError) -> JSONResponse:
        return await handle_api_problem(
            request,
            ApiProblem(
                status=409,
                code=error.code,
                title="Request conflict",
                detail=str(error),
            ),
        )

    @app.exception_handler(RepositoryValidationError)
    async def handle_repository_validation(
        request: Request, error: RepositoryValidationError
    ) -> JSONResponse:
        return await handle_api_problem(
            request,
            ApiProblem(
                status=422,
                code="VALIDATION_ERROR",
                title="Request validation failed",
                detail=str(error),
            ),
        )

    @app.exception_handler(ContractViolationError)
    async def handle_contract_failure(
        request: Request, error: ContractViolationError
    ) -> JSONResponse:
        LOGGER.error(
            "Internal contract failure trace_id=%s contract=%s",
            _trace_id(request),
            error.contract_name,
        )
        return await handle_api_problem(
            request,
            ApiProblem(status=500, code="INTERNAL_ERROR", title="Internal service error"),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_failure(request: Request, error: Exception) -> JSONResponse:
        LOGGER.exception("Unhandled platform error trace_id=%s", _trace_id(request), exc_info=error)
        return await handle_api_problem(
            request,
            ApiProblem(status=500, code="INTERNAL_ERROR", title="Internal service error"),
        )

    async def current_principal(
        authorization: str | None = Header(default=None, alias="Authorization"),
    ) -> Principal:
        return authenticator.authenticate(authorization)

    @app.get("/health/live", include_in_schema=False)
    async def liveness() -> dict[str, str]:
        return {"status": "healthy"}

    @app.get("/api/v1/sites/{site_id}/topology")
    async def get_topology_snapshot(
        site_id: Annotated[str, Path(min_length=1, max_length=160)],
        principal: Principal = Depends(current_principal),
        observed_at: Annotated[str | None, Query(alias="observedAt")] = None,
    ) -> JsonObject:
        snapshot = await topology_repository.get_snapshot(principal.tenant_id, site_id, observed_at)
        snapshot = contracts.validate("topology_snapshot", snapshot)
        _require_topology_scope(snapshot, principal, site_id)
        return snapshot

    @app.get("/api/v1/sites/{site_id}/incidents")
    async def list_incidents(
        site_id: Annotated[str, Path(min_length=1, max_length=160)],
        principal: Principal = Depends(current_principal),
        state: Annotated[Literal["open", "acknowledged", "resolved"] | None, Query()] = None,
        cursor: Annotated[str | None, Query(max_length=500)] = None,
    ) -> JsonObject:
        if cursor is not None:
            raise ApiProblem(
                status=422,
                code="VALIDATION_ERROR",
                title="Cursor is not valid",
                detail="The cursor is not recognized by this repository.",
            )
        items = await incident_repository.list_incidents(principal.tenant_id, site_id, state)
        for item in items:
            contracts.validate("incident_summary", item)
            _require_incident_summary_scope(item, principal, site_id)
        return contracts.validate(
            "incident_list",
            {"schemaVersion": "1.0.0", "items": items, "nextCursor": None},
        )

    @app.get("/api/v1/incidents/{incident_id}")
    async def get_incident_case(
        incident_id: Annotated[str, Path(min_length=1, max_length=160)],
        principal: Principal = Depends(current_principal),
    ) -> JsonObject:
        incident_case = await incident_repository.get_incident_case(
            principal.tenant_id, incident_id
        )
        incident_case = contracts.validate("incident_case", incident_case)
        _require_incident_case_scope(incident_case, principal, incident_id)
        return incident_case

    @app.get("/api/v1/incidents/{incident_id}/analysis")
    async def get_incident_analysis(
        incident_id: Annotated[str, Path(min_length=1, max_length=160)],
        principal: Principal = Depends(current_principal),
    ) -> JsonObject:
        incident_case = await incident_repository.get_incident_case(
            principal.tenant_id, incident_id
        )
        incident_case = contracts.validate("incident_case", incident_case)
        _require_incident_case_scope(incident_case, principal, incident_id)
        analysis = await incident_repository.get_incident_analysis(principal.tenant_id, incident_id)
        analysis = contracts.validate("incident_analysis", analysis)
        if (
            analysis["incidentId"] != incident_id
            or analysis["tenantId"] != principal.tenant_id
            or analysis["siteId"] != incident_case["incident"]["siteId"]
        ):
            raise ContractViolationError(
                "incident_analysis",
                (Violation(path="/", message="Incident analysis scope is inconsistent."),),
            )
        return analysis

    @app.post("/api/v1/incidents/{incident_id}/acknowledgements")
    async def acknowledge_incident(
        incident_id: Annotated[str, Path(min_length=1, max_length=160)],
        body: dict[str, Any] = Body(),
        idempotency_key: str = Header(alias="Idempotency-Key", min_length=16, max_length=200),
        principal: Principal = Depends(current_principal),
    ) -> JsonObject:
        require_role(principal, MUTATION_ROLES)
        body = _validate_request(contracts, "incident_acknowledgement_request", body)
        response = await incident_repository.acknowledge(
            tenant_id=principal.tenant_id,
            incident_id=incident_id,
            actor=principal.subject,
            occurred_at=_occurred_at(clock),
            expected_state=body["expectedState"],
            idempotency_key=idempotency_key,
        )
        return _validated_summary(contracts, response, principal, incident_id)

    @app.put("/api/v1/incidents/{incident_id}/notes")
    async def update_incident_notes(
        incident_id: Annotated[str, Path(min_length=1, max_length=160)],
        body: dict[str, Any] = Body(),
        idempotency_key: str = Header(alias="Idempotency-Key", min_length=16, max_length=200),
        principal: Principal = Depends(current_principal),
    ) -> JsonObject:
        require_role(principal, MUTATION_ROLES)
        body = _validate_request(contracts, "incident_notes_request", body)
        response = await incident_repository.update_notes(
            tenant_id=principal.tenant_id,
            incident_id=incident_id,
            actor=principal.subject,
            occurred_at=_occurred_at(clock),
            expected_state=body["expectedState"],
            notes=body["notes"],
            idempotency_key=idempotency_key,
        )
        return _validated_summary(contracts, response, principal, incident_id)

    @app.post("/api/v1/incidents/{incident_id}/resolution")
    async def resolve_incident(
        incident_id: Annotated[str, Path(min_length=1, max_length=160)],
        body: dict[str, Any] = Body(),
        idempotency_key: str = Header(alias="Idempotency-Key", min_length=16, max_length=200),
        principal: Principal = Depends(current_principal),
    ) -> JsonObject:
        require_role(principal, RESOLUTION_ROLES)
        body = _validate_request(contracts, "incident_resolution_request", body)
        response = await incident_repository.resolve(
            tenant_id=principal.tenant_id,
            incident_id=incident_id,
            actor=principal.subject,
            occurred_at=_occurred_at(clock),
            expected_state=body["expectedState"],
            resolution_notes=body["resolutionNotes"],
            actual_root_cause_entity_id=body["actualRootCauseEntityId"],
            idempotency_key=idempotency_key,
        )
        return _validated_summary(contracts, response, principal, incident_id)

    return app


def _validate_request(
    contracts: ContractRegistry, contract_name: str, body: dict[str, Any]
) -> JsonObject:
    try:
        return contracts.validate(contract_name, body)
    except ContractViolationError as error:
        raise ApiProblem(
            status=422,
            code="VALIDATION_ERROR",
            title="Request validation failed",
            detail="The request does not satisfy the API contract.",
            violations=error.violations,
        ) from None


def _validated_summary(
    contracts: ContractRegistry,
    response: JsonObject,
    principal: Principal,
    incident_id: str,
) -> JsonObject:
    summary = contracts.validate("incident_summary", response)
    if summary["tenantId"] != principal.tenant_id or summary["id"] != incident_id:
        raise ContractViolationError(
            "incident_summary",
            (Violation(path="/", message="Incident response scope is inconsistent."),),
        )
    return summary


def _require_topology_scope(snapshot: JsonObject, principal: Principal, site_id: str) -> None:
    if snapshot["tenantId"] != principal.tenant_id or snapshot["site"]["id"] != site_id:
        raise ContractViolationError(
            "topology_snapshot",
            (Violation(path="/", message="Topology response scope is inconsistent."),),
        )


def _require_incident_summary_scope(
    summary: JsonObject, principal: Principal, site_id: str
) -> None:
    if summary["tenantId"] != principal.tenant_id or summary["siteId"] != site_id:
        raise ContractViolationError(
            "incident_summary",
            (Violation(path="/", message="Incident response scope is inconsistent."),),
        )


def _require_incident_case_scope(
    incident_case: JsonObject, principal: Principal, incident_id: str
) -> None:
    incident = incident_case["incident"]
    if incident["tenantId"] != principal.tenant_id or incident["id"] != incident_id:
        raise ContractViolationError(
            "incident_case",
            (Violation(path="/", message="Incident response scope is inconsistent."),),
        )


def _occurred_at(clock: Callable[[], datetime]) -> str:
    value = clock()
    if value.tzinfo is None or value.utcoffset() is None:
        raise RuntimeError("The authoritative platform clock must return a timezone-aware value.")
    return value.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _trace_id(request: Request) -> str:
    return getattr(request.state, "trace_id", "trace_unavailable")
