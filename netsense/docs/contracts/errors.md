# NetSense — API Error Codes

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

### HTTP Status Codes

| Status | Meaning | Usage |
|---|---|---|
| 200 | OK | Successful GET/PUT/PATCH |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input, missing required fields |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT but insufficient role |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### Error Codes

| Code | HTTP | Message | Details |
|---|---|---|---|
| AUTH_MISSING | 401 | Authentication required | — |
| AUTH_EXPIRED | 401 | Token expired | expired_at |
| AUTH_INVALID | 401 | Invalid token | — |
| FORBIDDEN | 403 | Insufficient permissions | required_role |
| DEVICE_NOT_FOUND | 404 | Device not found | ip |
| INCIDENT_NOT_FOUND | 404 | Incident not found | id |
| DUPLICATE_DEVICE | 409 | Device already exists | ip |
| VALIDATION_ERROR | 422 | Request validation failed | errors: [{field, message}] |
| MAINTENANCE_OVERLAP | 409 | Overlapping maintenance window | existing_window_id |
| PCAP_NOT_AVAILABLE | 404 | PCAP file not found | incident_id |
| PCAP_KEY_EXPIRED | 401 | Share link expired | expired_at |
| RATE_LIMITED | 429 | Too many requests | retry_after_seconds |
| INTERNAL_ERROR | 500 | Internal server error | request_id (log correlation) |