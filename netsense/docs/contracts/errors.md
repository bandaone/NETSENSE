# NetSense API problem responses

All API failures use `application/problem+json` and conform to the generated
`problem-schema.json` contract.

```json
{
  "type": "https://problems.netsense.example/incident-state-conflict",
  "title": "Incident state conflict",
  "status": 409,
  "code": "INCIDENT_STATE_CONFLICT",
  "detail": "The incident changed after this view was loaded.",
  "traceId": "trace_01J5P7M8NC0YQ4TQ3GF6B2M4S1"
}
```

## Response rules

- `traceId` is safe to show to an operator and correlates with protected logs.
- Validation failures may include bounded `violations` containing only a path
  and safe message.
- Authentication errors do not reveal token internals.
- A missing resource and a resource outside the authenticated tenant return
  the same non-disclosing 404 response.
- Internal exceptions never expose stack traces, SQL, secrets, collector
  addresses, or another tenant's identifiers.
- Rate-limited responses include `Retry-After`.

## Stable codes

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `AUTH_MISSING` | 401 | Authentication is required. |
| `AUTH_EXPIRED` | 401 | The authenticated session expired. |
| `AUTH_INVALID` | 401 | Authentication could not be validated. |
| `FORBIDDEN` | 403 | The principal lacks permission for this operation. |
| `RESOURCE_NOT_FOUND` | 404 | The resource is absent or outside visible tenant scope. |
| `INCIDENT_STATE_CONFLICT` | 409 | The expected incident state no longer matches. |
| `IDEMPOTENCY_CONFLICT` | 409 | An idempotency key was reused with a different request. |
| `TOPOLOGY_SEQUENCE_CONFLICT` | 409 | A stream or snapshot precondition no longer matches. |
| `VALIDATION_ERROR` | 422 | Structural or business validation failed. |
| `RATE_LIMITED` | 429 | A bounded principal or tenant rate was exceeded. |
| `INTERNAL_ERROR` | 500 | An unexpected failure was recorded under the trace ID. |
