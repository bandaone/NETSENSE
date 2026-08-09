# Data Standards

NetSense uses structured data models for consistency and queryability.

## Device Records

- Use a tenant-scoped stable entity ID; IP addresses are identifiers, never the
  sole identity key.
- Keep hostname, IP, MAC, serial number, manufacturer, model, location, role,
  lifecycle, and criticality as separate fields.
- Keep health, freshness, coverage, management state, and confidence as
  independent dimensions.

## Metric Events

- Include timestamp, device ID, metric name, value, baseline, and confidence.
- Tag data with probe ID and collection source.
- Preserve observed time separately from normalisation and ingestion time.
- Reference protected payloads and packet captures; do not embed them in the
  normalised event stream.

## Topology relationships

- Store relationship type independently from knowledge kind.
- Record direction, source and target interfaces where known, first and last
  observation, expiry, confidence, and evidence references.
- Validate every graph and evidence reference before publishing a snapshot or
  applying a diff.
- Sequence diffs and chain them by base/result snapshot ID. Duplicates are
  idempotent; gaps require reconciliation.

## Incidents

- Separate probable-source candidates from an operator-confirmed actual source.
- Separate confirmed impact, likely impact, risk, alternate-path protection,
  and unknown impact.
- Record evidence, limitations, workflow state, resolution notes, actor and
  timestamps in an immutable audit trail.
- Keep incident history searchable and auditable.

## Tenant isolation

- Every snapshot, diff, incident, alert, event and mutation is tenant scoped.
- API filtering is not sufficient: persistent stores must enforce the same
  scope independently.
- Out-of-scope resources use non-disclosing not-found behaviour.

## Retention

- Apply retention policies for raw metrics, PCAPs, and incident logs.
- Use TimescaleDB chunking and compression for long-term metric storage.
